export type Provider = "openrouter" | "ollama";

export interface Model {
  id: string;
  name: string;
  provider: Provider;
  description?: string;
}

export interface ModelGroup {
  provider: Provider;
  label: string;
  models: Model[];
}

/** Ollama always appears as a static group at the top. */
export const OLLAMA_GROUP: ModelGroup = {
  provider: "ollama",
  label: "Local",
  models: [
    {
      id: "ollama",
      name: "Ollama",
      provider: "ollama",
    },
  ],
};

export const DEFAULT_MODEL: Model = OLLAMA_GROUP.models[0];

export function findModel(id: string, groups: ModelGroup[]): Model | undefined {
  for (const group of groups) {
    const found = group.models.find((m) => m.id === id);
    if (found) return found;
  }
  return undefined;
}
