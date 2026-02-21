import { type Model, OLLAMA_GROUP } from "@/lib/models";

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
  architecture: { modality: string };
}

/** In-memory cache so we don't hammer the OpenRouter API on every popover open. */
let cache: { data: Model[]; ts: number } | null = null;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function formatPrice(perToken: string): string {
  const val = parseFloat(perToken) * 1_000_000;
  if (val === 0) return "free";
  if (val < 0.01) return `$${val.toFixed(4)}/M`;
  if (val < 1) return `$${val.toFixed(2)}/M`;
  return `$${val.toFixed(1)}/M`;
}

function stripOrgPrefix(name: string): string {
  // OpenRouter names look like "Anthropic: Claude Sonnet 4" — strip the org prefix
  const colonIndex = name.indexOf(":");
  return colonIndex > -1 ? name.slice(colonIndex + 1).trim() : name;
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return Response.json(cache.data);
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return Response.json(
        { error: "Failed to fetch models from OpenRouter" },
        { status: 502 },
      );
    }

    const json = await res.json();
    const raw: OpenRouterModel[] = json.data ?? [];

    // Only keep text-capable models
    const textModels = raw.filter(
      (m) =>
        m.architecture.modality.includes("text") &&
        m.architecture.modality.includes("->text"),
    );

    // Flat list: Ollama first, then OpenRouter models in default order
    const models: Model[] = [
      ...OLLAMA_GROUP.models,
      ...textModels.map((m) => ({
        id: m.id,
        name: stripOrgPrefix(m.name),
        provider: "openrouter" as const,
        description: `${formatPrice(m.pricing.prompt)} in · ${formatPrice(m.pricing.completion)} out · ${(m.context_length / 1000).toFixed(0)}k ctx`,
      })),
    ];

    cache = { data: models, ts: Date.now() };
    return Response.json(models);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Failed to fetch models: ${message}` },
      { status: 500 },
    );
  }
}
