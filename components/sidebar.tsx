"use client";

import { FileText, Plus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
    file: File | null;
    onFileSelect: (file: File) => void;
}

export function Sidebar({ file, onFileSelect }: SidebarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0];
        if (selected && selected.type === "application/pdf") {
            onFileSelect(selected);
        }
    }

    return (
        <aside className="bg-sidebar text-sidebar-foreground flex h-full min-w-64 flex-1 flex-col border-r">
            <div className="flex items-center gap-2 px-4 py-5">
                <h1 className="text-base font-semibold tracking-tight">research.</h1>
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

            <ScrollArea className="flex-1 px-3 py-2">
                {file ? (
                    <div className="bg-accent text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
                        <FileText className="text-primary size-4 shrink-0" />
                        <span className="truncate">{file.name}</span>
                    </div>
                ) : (
                    <p className="text-muted-foreground px-3 py-2 text-xs">
                        No PDF uploaded yet.
                    </p>
                )}
            </ScrollArea>

            <Separator />

            <div className="text-muted-foreground px-4 py-3 text-[0.65rem]">
                Drop a PDF to get started
            </div>
        </aside>
    );
}
