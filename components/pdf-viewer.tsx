"use client";

import { ChevronLeft, ChevronRight, Download, Minus, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import "react-pdf/dist/Page/TextLayer.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ReactPdfDocument = dynamic(
    () => import("react-pdf").then((mod) => {
        mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
        return { default: mod.Document };
    }),
    { ssr: false },
);

const ReactPdfPage = dynamic(
    () => import("react-pdf").then((mod) => ({ default: mod.Page })),
    { ssr: false },
);

interface PdfViewerProps {
    file: File | null;
    onSelection?: (text: string) => void;
}

const PDF_PAGE_RATIO = 612 / 792;

export function PdfViewer({ file, onSelection }: PdfViewerProps) {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [zoom, setZoom] = useState(100);
    const [fitWidth, setFitWidth] = useState(false);
    const [viewerWidth, setViewerWidth] = useState(0);
    const [viewerHeight, setViewerHeight] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!file) {
            setFileUrl(null);
            setNumPages(0);
            setPageNumber(1);
            return;
        }
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        setNumPages(0);
        setPageNumber(1);
        setZoom(100);
        setFitWidth(false);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Send selected text to chat on mouseup
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        function handleMouseUp() {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || !container) {
                onSelection?.("");
                return;
            }

            const anchorNode = sel.anchorNode;
            if (!anchorNode || !container.contains(anchorNode)) {
                return;
            }

            const text = sel.toString().trim();
            onSelection?.(text || "");
        }

        container.addEventListener("mouseup", handleMouseUp);
        return () => {
            container.removeEventListener("mouseup", handleMouseUp);
        };
    }, [fileUrl, onSelection]);

    useEffect(() => {
        const scrollNode = scrollContainerRef.current;
        if (!scrollNode || numPages <= 0) return;

        const pageElements = scrollNode.querySelectorAll<HTMLElement>("[data-pdf-page]");
        if (!pageElements.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const mostVisible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

                if (!mostVisible) return;
                const pageValue = Number.parseInt(
                    (mostVisible.target as HTMLElement).dataset.pdfPage ?? "",
                    10,
                );
                if (!Number.isNaN(pageValue)) {
                    setPageNumber(pageValue);
                }
            },
            {
                root: scrollNode,
                threshold: [0.5, 0.75],
            },
        );

        pageElements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [numPages, fitWidth, zoom]);

    useEffect(() => {
        if (!fileUrl) return;

        const containerNode = scrollContainerRef.current;
        if (!containerNode) return;

        setViewerWidth(Math.floor(containerNode.clientWidth));
        setViewerHeight(Math.floor(containerNode.clientHeight));

        const resizeObserver = new ResizeObserver((entries) => {
            const firstEntry = entries[0];
            if (!firstEntry) return;
            setViewerWidth(Math.floor(firstEntry.contentRect.width));
            setViewerHeight(Math.floor(firstEntry.contentRect.height));
        });

        resizeObserver.observe(containerNode);
        return () => resizeObserver.disconnect();
    }, [fileUrl]);

    const fitWidthPx = useMemo(() => {
        if (viewerWidth <= 0) return 0;
        return Math.max(viewerWidth - 24, 120);
    }, [viewerWidth]);

    const singlePageWidthPx = useMemo(() => {
        if (viewerHeight <= 0) return fitWidthPx || 0;
        const heightBasedWidth = Math.max(Math.round((viewerHeight - 24) * PDF_PAGE_RATIO), 120);
        if (!fitWidthPx) return heightBasedWidth;
        return Math.min(heightBasedWidth, fitWidthPx);
    }, [fitWidthPx, viewerHeight]);

    const displayWidth = useMemo(() => {
        if (fitWidth) return fitWidthPx || undefined;
        if (!singlePageWidthPx) return undefined;
        return Math.max(Math.round(singlePageWidthPx * (zoom / 100)), 120);
    }, [fitWidth, fitWidthPx, singlePageWidthPx, zoom]);

    const canGoPrevious = pageNumber > 1;
    const canGoNext = pageNumber < numPages;

    const handleLoadSuccess = ({ numPages: loadedPages }: { numPages: number }) => {
        setNumPages(loadedPages);
        setPageNumber((currentPage) => Math.min(Math.max(currentPage, 1), loadedPages));
    };

    const scrollToPage = (nextPage: number) => {
        if (numPages <= 0) return;
        const clampedPage = Math.min(Math.max(nextPage, 1), numPages);
        setPageNumber(clampedPage);

        const scrollNode = scrollContainerRef.current;
        const pageElement = scrollNode?.querySelector<HTMLElement>(`[data-pdf-page="${clampedPage}"]`);
        pageElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handlePageInputChange = (value: string) => {
        const parsedValue = Number.parseInt(value, 10);
        if (Number.isNaN(parsedValue)) return;
        scrollToPage(parsedValue);
    };

    const fileName = file?.name ?? "document.pdf";

    if (!fileUrl) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-muted-foreground text-sm">
                    Upload a PDF to view it here.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
            <div className="relative flex h-12 items-center border-b border-border px-3">
                <div className="flex flex-1 items-center justify-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => scrollToPage(pageNumber - 1)}
                        disabled={!canGoPrevious}
                    >
                        <ChevronLeft />
                    </Button>

                    <div className="flex items-center gap-1">
                        <Input
                            min={1}
                            max={numPages || undefined}
                            value={pageNumber}
                            onChange={(event) => handlePageInputChange(event.target.value)}
                            className="w-14 text-center"
                        />
                        <span className="text-muted-foreground text-xs">/ {numPages || 0}</span>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => scrollToPage(pageNumber + 1)}
                        disabled={!canGoNext}
                    >
                        <ChevronRight />
                    </Button>

                    <div className="mx-2 h-5 w-px bg-border" />

                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => {
                            setFitWidth(false);
                            setZoom((currentZoom) => Math.max(currentZoom - 10, 50));
                        }}
                    >
                        <Minus />
                    </Button>

                    <span className="text-muted-foreground w-14 text-center text-xs">{fitWidth ? "Fit" : `${zoom}%`}</span>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => {
                            setFitWidth(false);
                            setZoom((currentZoom) => Math.min(currentZoom + 10, 300));
                        }}
                    >
                        <Plus />
                    </Button>

                    <Button
                        type="button"
                        variant={fitWidth ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFitWidth(true)}
                        className="ml-1"
                    >
                        Fit width
                    </Button>
                </div>

                <Button type="button" variant="outline" size="icon-sm" asChild className="absolute right-3">
                    <a href={fileUrl} download={fileName}>
                        <Download />
                    </a>
                </Button>
            </div>

            <div
                ref={scrollContainerRef}
                className="relative flex-1 min-h-0 overflow-auto bg-muted/20"
            >
                <div className="mx-auto w-full max-w-full p-3">
                    <div className="flex flex-col items-center gap-3">
                        <ReactPdfDocument
                            file={fileUrl}
                            onLoadSuccess={handleLoadSuccess}
                            loading={<p className="text-muted-foreground pt-12 text-sm">Loading PDF…</p>}
                            error={<p className="text-destructive pt-12 text-sm">Failed to load PDF.</p>}
                        >
                            {Array.from({ length: numPages }, (_, index) => (
                                <div key={index + 1} data-pdf-page={index + 1} className="w-full flex justify-center">
                                    <ReactPdfPage
                                        pageNumber={index + 1}
                                        width={displayWidth}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={true}
                                        loading=""
                                    />
                                </div>
                            ))}
                        </ReactPdfDocument>
                    </div>
                </div>
            </div>
        </div>
    );
}
