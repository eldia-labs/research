import type { PaperMetadata } from "@/lib/pdf";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const doi = searchParams.get("doi");
    const arxiv = searchParams.get("arxiv");
    const query = searchParams.get("query");

    if (!doi && !arxiv && !query) {
        return Response.json(
            { error: "Provide a 'doi', 'arxiv', or 'query' parameter." },
            { status: 400 },
        );
    }

    let metadata: PaperMetadata | null = null;

    if (doi) {
        metadata =
            (await fetchCrossRef(doi)) ?? (await fetchSemanticScholar(`DOI:${doi}`));
    } else if (arxiv) {
        metadata =
            (await fetchArxiv(arxiv)) ??
            (await fetchSemanticScholar(`ARXIV:${arxiv}`)) ??
            (await fetchSemanticScholar(`ARXIV:${stripArxivVersion(arxiv)}`));
    }

    if (!metadata && query && !arxiv) {
        metadata = await searchCrossRef(query);
    }

    if (!metadata) {
        return Response.json(
            { error: "No metadata found." },
            { status: 404 },
        );
    }

    return Response.json(metadata);
}

async function fetchCrossRef(doi: string): Promise<PaperMetadata | null> {
    try {
        const res = await fetch(
            `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
            {
                headers: {
                    "User-Agent": "research-app/0.1 (mailto:dev@example.com)",
                },
                signal: AbortSignal.timeout(8000),
            },
        );

        if (!res.ok) return null;

        const data = await res.json();
        const work = data.message;

        const title =
            work.title?.[0] ?? work["short-title"]?.[0] ?? "Untitled";

        const authors: string[] = (work.author ?? []).map(
            (a: { given?: string; family?: string }) =>
                [a.given, a.family].filter(Boolean).join(" "),
        );

        const year =
            work.published?.["date-parts"]?.[0]?.[0] ??
            work["published-print"]?.["date-parts"]?.[0]?.[0] ??
            work["published-online"]?.["date-parts"]?.[0]?.[0] ??
            undefined;

        const journal =
            work["container-title"]?.[0] ??
            work["short-container-title"]?.[0] ??
            undefined;

        const abstract = work.abstract
            ? work.abstract.replace(/<[^>]*>/g, "").trim()
            : undefined;

        return {
            doi,
            title,
            authors,
            journal,
            year,
            abstract,
            url: work.URL ?? `https://doi.org/${doi}`,
        };
    } catch {
        return null;
    }
}

async function fetchSemanticScholar(
    paperId: string,
): Promise<PaperMetadata | null> {
    try {
        const res = await fetch(
            `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}?fields=title,authors,year,abstract,externalIds,venue,url`,
            { signal: AbortSignal.timeout(8000) },
        );

        if (!res.ok) return null;

        const data = await res.json();
        const doi = data.externalIds?.DOI ?? "";

        return {
            doi,
            title: data.title ?? "Untitled",
            authors: (data.authors ?? []).map(
                (a: { name: string }) => a.name,
            ),
            journal: data.venue || undefined,
            year: data.year ?? undefined,
            abstract: data.abstract ?? undefined,
            url: data.url ?? (doi ? `https://doi.org/${doi}` : undefined),
        };
    } catch {
        return null;
    }
}

async function fetchArxiv(arxivId: string): Promise<PaperMetadata | null> {
    try {
        const normalizedId = stripArxivVersion(arxivId);
        const res = await fetch(
            `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(normalizedId)}`,
            { signal: AbortSignal.timeout(8000) },
        );

        if (!res.ok) return null;

        const xml = await res.text();
        const title = decodeXml(extractFirstTag(xml, "title", 2) ?? "").trim();
        if (!title) return null;

        const authors = Array.from(
            xml.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/gi),
        ).map((m) => decodeXml(m[1]).trim());

        const published = extractFirstTag(xml, "published")?.trim();
        const year = published ? Number.parseInt(published.slice(0, 4), 10) : undefined;
        const abs = decodeXml(extractFirstTag(xml, "summary") ?? "").trim() || undefined;
        const idUrl = decodeXml(extractFirstTag(xml, "id") ?? "").trim() || undefined;

        return {
            doi: "",
            title,
            authors,
            year: Number.isNaN(year) ? undefined : year,
            abstract: abs,
            url: idUrl,
            journal: "arXiv",
        };
    } catch {
        return null;
    }
}

function stripArxivVersion(arxivId: string): string {
    return arxivId.replace(/v\d+$/i, "");
}

function extractFirstTag(xml: string, tag: string, occurrence = 1): string | null {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    let match: RegExpExecArray | null = null;

    for (let i = 0; i < occurrence; i++) {
        match = re.exec(xml);
        if (!match) return null;
    }

    if (!match) return null;
    return match[1];
}

function decodeXml(text: string): string {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

/**
 * Search CrossRef by bibliographic query (first-page text).
 * Returns the top result if its score is high enough.
 */
async function searchCrossRef(query: string): Promise<PaperMetadata | null> {
    try {
        // Use first ~200 chars of text to keep the query reasonable
        const trimmed = query.slice(0, 200).trim();
        if (!trimmed) return null;

        const res = await fetch(
            `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(trimmed)}&rows=1`,
            {
                headers: {
                    "User-Agent": "research-app/0.1 (mailto:dev@example.com)",
                },
                signal: AbortSignal.timeout(10000),
            },
        );

        if (!res.ok) return null;

        const data = await res.json();
        const items = data.message?.items;
        if (!items?.length) return null;

        const work = items[0];
        const doi = work.DOI;
        if (!doi) return null;

        const title =
            work.title?.[0] ?? work["short-title"]?.[0] ?? "Untitled";

        const authors: string[] = (work.author ?? []).map(
            (a: { given?: string; family?: string }) =>
                [a.given, a.family].filter(Boolean).join(" "),
        );

        const year =
            work.published?.["date-parts"]?.[0]?.[0] ??
            work["published-print"]?.["date-parts"]?.[0]?.[0] ??
            work["published-online"]?.["date-parts"]?.[0]?.[0] ??
            undefined;

        const journal =
            work["container-title"]?.[0] ??
            work["short-container-title"]?.[0] ??
            undefined;

        const abstract = work.abstract
            ? work.abstract.replace(/<[^>]*>/g, "").trim()
            : undefined;

        return {
            doi,
            title,
            authors,
            journal,
            year,
            abstract,
            url: work.URL ?? `https://doi.org/${doi}`,
        };
    } catch {
        return null;
    }
}
