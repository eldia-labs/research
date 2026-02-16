"use client";

import { FileText, Plus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { PaperMetadata } from "@/lib/pdf";

interface SidebarProps {
    files: File[];
    paperMetadata: Record<number, PaperMetadata | null>;
    activeIndex: number | null;
    collapsed: boolean;
    onFileAdd: (file: File) => void;
    onFileClick: (index: number) => void;
    onToggle: () => void;
}

export function Sidebar({ files, paperMetadata, activeIndex, collapsed, onFileAdd, onFileClick, onToggle }: SidebarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0];
        if (selected && selected.type === "application/pdf") {
            onFileAdd(selected);
        }
        // Reset so re-uploading the same file still triggers onChange
        e.target.value = "";
    }

    return (
        <div className={`relative flex h-full ${collapsed ? "shrink-0" : "flex-1 min-w-0"}`}>
            <aside
                className={`flex h-full flex-col overflow-hidden transition-[width] duration-200 ease-in-out ${collapsed ? "w-12" : "flex-1"}`}
            >
                {collapsed ? (
                    <div className="flex h-full flex-col items-center gap-3 py-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg border border-input bg-input/20 dark:bg-input/30"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Plus className="size-4" />
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {files.map((f, i) => (
                            <button
                                key={`${f.name}-${f.lastModified}`}
                                type="button"
                                onClick={() => onFileClick(i)}
                                className={`flex items-center justify-center rounded-lg p-1.5 border transition-colors ${i === activeIndex
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-input bg-input/20 dark:bg-input/30 text-muted-foreground hover:text-primary"
                                    }`}
                            >
                                <FileText className="size-4 shrink-0" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-center px-4 py-5">
                            <h1 className="text-base font-semibold tracking-tight whitespace-nowrap">
                                research<span className="text-primary">.</span>
                            </h1>
                        </div>

                        <Separator />

                        <div className="px-3 pt-4 pb-2">
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full justify-start gap-2 rounded-lg border-input bg-input/20 dark:bg-input/30 shadow-xs"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Plus className="size-4" />
                                Upload PDF
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                            {files.map((f, i) => {
                                const isActive = i === activeIndex;
                                const meta = paperMetadata[i];

                                return (
                                    <button
                                        key={`${f.name}-${f.lastModified}`}
                                        type="button"
                                        onClick={() => onFileClick(i)}
                                        className={`flex w-full gap-2 rounded-lg px-2.5 text-xs font-medium shadow-xs transition-all ${isActive
                                            ? "bg-primary text-primary-foreground py-2"
                                            : "h-8 items-center text-muted-foreground hover:bg-muted hover:text-foreground"
                                            }`}
                                    >
                                        <FileText className={`size-4 shrink-0 ${isActive ? "mt-0.5" : ""}`} />
                                        {isActive && meta ? (
                                            <div className="min-w-0 text-left leading-relaxed">
                                                <p className="truncate font-semibold">{meta.title ?? f.name}</p>
                                                <p className="truncate opacity-80">{meta.authors?.join(", ") || "Unknown authors"}</p>
                                                <p className="truncate opacity-60">{meta.year ?? "Unknown year"}{meta.journal ? ` · ${meta.journal}` : ""}</p>
                                            </div>
                                        ) : (
                                            <span className="truncate leading-none">{meta?.title ?? f.name}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </aside>

            <button
                type="button"
                onDoubleClick={onToggle}
                className="group relative z-10 hidden xl:flex shrink-0 cursor-col-resize items-center justify-center"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <div className="h-full w-px bg-border group-hover:bg-primary group-hover:shadow-[0_0_0_1.5px_var(--color-primary)] transition-all" />
                <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
            </button>
        </div>
    );
}
