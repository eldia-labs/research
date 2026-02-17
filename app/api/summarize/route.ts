import type { Provider } from "@/lib/models";
import { extractText } from "unpdf";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

function buildEndpoint(provider: Provider): string {
  if (provider === "openrouter") {
    return "https://openrouter.ai/api/v1/chat/completions";
  }
  return `${OLLAMA_BASE_URL}/chat/completions`;
}

function buildHeaders(provider: Provider): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (provider === "openrouter" && OPENROUTER_API_KEY) {
    headers["Authorization"] = `Bearer ${OPENROUTER_API_KEY}`;
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    headers["X-Title"] = "research";
  }
  return headers;
}

function resolveModel(provider: Provider, modelId: string): string {
  if (provider === "ollama") return OLLAMA_MODEL ?? "llama3";
  return modelId;
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const file = formData.get("file") as File | null;
  const prompt = formData.get("prompt") as string | null;
  const provider = (formData.get("provider") as Provider) ?? "ollama";
  const modelId = (formData.get("model") as string) ?? "ollama";

  if (!file || !prompt) {
    return Response.json(
      { error: "Both a PDF file and a prompt are required." },
      { status: 400 },
    );
  }

  if (file.type !== "application/pdf") {
    return Response.json(
      { error: "Only PDF files are accepted." },
      { status: 400 },
    );
  }

  if (provider === "openrouter" && !OPENROUTER_API_KEY) {
    return Response.json(
      { error: "OpenRouter API key not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await extractText(new Uint8Array(arrayBuffer));
    const paperText = pdf.text.join("\n");

    if (!paperText.trim()) {
      return Response.json(
        { error: "Could not extract text from the PDF." },
        { status: 422 },
      );
    }

    const endpoint = buildEndpoint(provider);
    const model = resolveModel(provider, modelId);

    const llmRes = await fetch(endpoint, {
      method: "POST",
      headers: buildHeaders(provider),
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "You are an academic research assistant. You help summarize research papers clearly and concisely.",
          },
          {
            role: "user",
            content: `${prompt}\n\n--- Research Paper Content ---\n${paperText}`,
          },
        ],
      }),
    });

    if (!llmRes.ok || !llmRes.body) {
      const text = await llmRes.text();
      const label = provider === "openrouter" ? "OpenRouter" : "Ollama";
      return Response.json({ error: `${label} error: ${text}` }, { status: 502 });
    }

    // Transform the SSE stream into our own JSON-lines stream
    const reader = llmRes.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        function send(chunk: { type: string; delta: string }) {
          controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;

              const payload = trimmed.startsWith("data: ")
                ? trimmed.slice(6)
                : trimmed;

              try {
                const data = JSON.parse(payload);
                const delta = data.choices?.[0]?.delta;
                if (!delta) continue;

                if (delta.reasoning_content) {
                  send({ type: "reasoning", delta: delta.reasoning_content });
                }
                if (delta.content) {
                  send({ type: "text", delta: delta.content });
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Summarization failed:", error);
    return Response.json(
      { error: `Failed to process the paper: ${message}` },
      { status: 500 },
    );
  }
}
