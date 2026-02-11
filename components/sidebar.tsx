"use client";

import { FileText, Plus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
    file: File | null;
    collapsed: boolean;
    onFileSelect: (file: File) => void;
    onToggle: () => void;
}

export function Sidebar({ file, collapsed, onFileSelect, onToggle }: SidebarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0];
        if (selected && selected.type === "application/pdf") {
            onFileSelect(selected);
        }
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
                            className="size-8"
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
                        {file && (
                            <div className="bg-accent text-primary flex items-center justify-center rounded-md p-1.5">
                                <FileText className="size-4 shrink-0" />
                            </div>
                        )}
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
                                className="w-full justify-start gap-2"
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

                        <div className="flex-1 px-3 py-2">
                            {file && (
                                <div className="bg-accent text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
                                    <FileText className="text-primary size-4 shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                </div>
                            )}
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
