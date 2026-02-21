"use client";

import { ChevronDown, Loader2, Search } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";

import { type Model, OLLAMA_GROUP } from "@/lib/models";
import { cn } from "@/lib/utils";

interface ModelSwitcherProps {
  model: Model;
  onChange: (model: Model) => void;
}

export function ModelSwitcher({ model, onChange }: ModelSwitcherProps) {
  const [models, setModels] = useState<Model[]>(OLLAMA_GROUP.models);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "done">(
    "idle",
  );

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch models on first open
  useEffect(() => {
    if (!open || fetchStatus !== "idle") return;

    setFetchStatus("loading");
    fetch("/api/models")
      .then(async (res) => {
        if (res.ok) {
          const data: Model[] = await res.json();
          setModels(data);
        }
      })
      .catch(() => {
        // keep existing models (Ollama fallback)
      })
      .finally(() => setFetchStatus("done"));
  }, [open, fetchStatus]);

  // Reset search when popover opens
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q),
    );
  }, [models, search]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            open && "bg-muted text-foreground",
          )}
        >
          <span className="truncate">{model.name}</span>
          <ChevronDown
            className={cn(
              "size-3 transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="start"
          sideOffset={8}
          avoidCollisions={false}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
          className={cn(
            "z-50 rounded-lg border border-border bg-popover p-1 shadow-lg",
            "w-[calc(var(--radix-popover-trigger-width)+var(--radix-popover-trigger-x,0px))] max-w-[calc(100vw-1.5rem)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-in-from-bottom-2",
            "origin-[--radix-popover-content-transform-origin]",
          )}
          style={{
            width:
              "calc(var(--radix-popover-content-available-width) - 1.25rem - 1px)",
          }}
        >
          <div className="p-1.5 pb-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models…"
                className="h-7 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50"
              />
            </div>
          </div>

          {fetchStatus === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Loading models…
              </span>
            </div>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto p-1">
              {filtered.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No models found
                </p>
              )}
              {filtered.map((m) => {
                const isSelected = m.id === model.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "font-medium truncate text-xs",
                            isSelected
                              ? "text-primary-foreground"
                              : "text-foreground/80",
                          )}
                        >
                          {m.name}
                        </span>
                      </div>
                      {m.description && (
                        <p
                          className={cn(
                            "text-[0.65rem] truncate",
                            isSelected
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {m.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
