const DOI_REGEX = /\b(10\.\d{4,}(?:\.\d+)*\/\S+)/i;
const ARXIV_REGEX = /\b(?:arXiv:)?(\d{4}\.\d{4,5}(?:v\d+)?)/i;
const ARXIV_ID_REGEX = /\b(\d{4}\.\d{4,5}(?:v\d+)?)\b/i;

/**
 * Clean trailing punctuation that is not part of the DOI.
 */
function cleanDoi(raw: string): string {
  return raw.replace(/[.,;:)\]}>'"]+$/, "");
}

export interface PdfInfo {
  doi: string | null;
  arxivId: string | null;
  firstPageText: string;
}

/**
 * Extract DOI, arXiv ID, and first-page text from a PDF.
 * Uses react-pdf's pdfjs for client-side text extraction.
 */
export async function extractPdfInfo(file: File): Promise<PdfInfo> {
  try {
    const { pdfjs } = await import("react-pdf");

    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) })
      .promise;

    let doi: string | null = null;
    let arxivId: string | null = null;
    let firstPageText = "";
    const pagesToScan = Math.min(pdf.numPages, 2);

    for (let i = 1; i <= pagesToScan; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .filter((item) => "str" in item)
        .map((item) => (item as { str: string }).str)
        .join(" ");

      if (i === 1) firstPageText = text;

      if (!doi) {
        const match = text.match(DOI_REGEX);
        if (match) {
          doi = cleanDoi(match[1]);
        }
      }

      if (!arxivId) {
        const match = text.match(ARXIV_REGEX);
        if (match) {
          arxivId = match[1];
        }
      }
    }

    // Fallback: check filename for arXiv ID (e.g. "1605.08695v2.pdf")
    if (!arxivId) {
      const filenameMatch = file.name.match(ARXIV_ID_REGEX);
      if (filenameMatch) {
        arxivId = filenameMatch[1];
      }
    }

    return { doi, arxivId, firstPageText };
  } catch {
    return { doi: null, arxivId: null, firstPageText: "" };
  }
}

export interface PaperMetadata {
  doi: string;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  abstract?: string;
  url?: string;
}
