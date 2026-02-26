"use client";

import { FileText, Plus } from "lucide-react";
import { useRef } from "react";

import { ResizeHandle } from "@/components/resize-handle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  COLLAPSED_WIDTH,
  useResizablePanel,
} from "@/hooks/use-resizable-panel";

import type { PaperMetadata } from "@/lib/pdf";

interface SidebarProps {
  files: File[];
  paperMetadata: Record<number, PaperMetadata | null>;
  activeIndex: number | null;
  width?: number;
  onWidthChange?: (width: number) => void;
  onFileAdd: (file: File) => void;
  onFileClick: (index: number) => void;
}

export function Sidebar({
  files,
  paperMetadata,
  activeIndex,
  width,
  onWidthChange,
  onFileAdd,
  onFileClick,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collapsed = width !== undefined && width <= COLLAPSED_WIDTH;

  const { handleMouseDown, handleDoubleClick, expand, isDragging } =
    useResizablePanel({
      width,
      side: "right",
      onWidthChange,
    });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/pdf") {
      onFileAdd(selected);
    }
    // Reset so re-uploading the same file still triggers onChange
    e.target.value = "";
  }

  return (
    <div
      className="relative flex h-full shrink-0"
      style={!collapsed && width !== undefined ? { width } : undefined}
    >
      <aside
        className={`flex h-full flex-col overflow-hidden ${collapsed ? "w-12" : "flex-1 min-w-0"}`}
      >
        {collapsed ? (
          <div
            className="flex h-full w-full flex-col items-center cursor-pointer"
            onClick={expand}
          >
            <div className="flex h-12 w-full items-center justify-center">
              <span className="text-sm font-semibold tracking-tight">
                r<span className="text-primary">.</span>
              </span>
            </div>
            <div className="flex flex-col items-center gap-3 pt-4">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg border border-input bg-input/20 dark:bg-input/30"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileClick(i);
                  }}
                  className={`flex items-center justify-center rounded-lg p-1.5 border transition-colors ${
                    i === activeIndex
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-input/20 dark:bg-input/30 text-muted-foreground hover:text-primary"
                  }`}
                >
                  <FileText className="size-4 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-12 items-center justify-center border-b border-border px-4">
              <h1 className="text-base font-semibold tracking-tight whitespace-nowrap">
                research<span className="text-primary">.</span>
              </h1>
            </div>

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
                    className={`flex w-full gap-2 rounded-lg px-2.5 text-xs font-medium shadow-xs transition-all py-2 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {meta === undefined ? (
                      <div className="min-w-0 flex-1 text-left leading-relaxed">
                        <div className="flex items-center h-[1lh]">
                          <Skeleton
                            className={`h-[0.65em] w-full ${isActive ? "bg-primary-foreground/20" : "bg-muted-foreground/15"}`}
                          />
                        </div>
                        <div className="flex items-center h-[1lh]">
                          <Skeleton
                            className={`h-[0.65em] w-full ${isActive ? "bg-primary-foreground/20" : "bg-muted-foreground/15"}`}
                          />
                        </div>
                        <div className="flex items-center h-[1lh]">
                          <Skeleton
                            className={`h-[0.65em] w-1/2 ${isActive ? "bg-primary-foreground/20" : "bg-muted-foreground/15"}`}
                          />
                        </div>
                      </div>
                    ) : meta ? (
                      <div className="min-w-0 text-left leading-relaxed">
                        <p className="truncate font-semibold">
                          {meta.title ?? f.name}
                        </p>
                        <p
                          className={`truncate ${isActive ? "opacity-80" : "opacity-60"}`}
                        >
                          {meta.authors?.join(", ") || "Unknown authors"}
                        </p>
                        <p
                          className={`truncate ${isActive ? "opacity-60" : "opacity-40"}`}
                        >
                          {meta.year ?? "Unknown year"}
                          {meta.journal ? ` · ${meta.journal}` : ""}
                        </p>
                      </div>
                    ) : (
                      <span className="truncate leading-none">{f.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </aside>

      <ResizeHandle
        label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden xl:flex"
        isDragging={isDragging}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
}
