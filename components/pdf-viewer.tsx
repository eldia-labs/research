"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

const ReactPdfDocument = dynamic(
    () => import("react-pdf").then((mod) => {
        mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
        return { default: mod.Document };
    }),
    { ssr: false }
);

const ReactPdfPage = dynamic(
    () => import("react-pdf").then((mod) => ({ default: mod.Page })),
    { ssr: false }
);

// Load react-pdf CSS styles dynamically
if (typeof window !== "undefined") {
    // @ts-expect-error -- CSS module import
    import("react-pdf/dist/Page/AnnotationLayer.css");
    // @ts-expect-error -- CSS module import
    import("react-pdf/dist/Page/TextLayer.css");
}

interface PdfViewerProps {
    file: File | null;
}

export function PdfViewer({ file }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageWidth, setPageWidth] = useState<number>(0);

    const containerRef = useCallback((node: HTMLDivElement | null) => {
        if (node) {
            setPageWidth(node.clientWidth);
        }
    }, []);

    const fileUrl = useMemo(() => {
        if (!file) return null;
        return URL.createObjectURL(file);
    }, [file]);

    if (!fileUrl) {
        return (
            <div
                ref={containerRef}
                className="flex h-full aspect-[612/792] flex-col items-center justify-center gap-2 bg-muted/30 text-center overflow-hidden"
            >
                <p className="text-muted-foreground text-sm">
                    Upload a PDF to view it here.
                </p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="h-full aspect-[612/792] overflow-y-auto overflow-x-hidden bg-muted/30">
            <ReactPdfDocument
                file={fileUrl}
                onLoadSuccess={({ numPages: n }: { numPages: number }) => setNumPages(n)}
                loading={
                    <p className="text-muted-foreground text-sm pt-12 text-center">Loading PDF…</p>
                }
                error={
                    <p className="text-destructive text-sm pt-12 text-center">Failed to load PDF.</p>
                }
            >
                {Array.from({ length: numPages }, (_, i) => (
                    <ReactPdfPage
                        key={i + 1}
                        pageNumber={i + 1}
                        width={pageWidth || undefined}
                        loading=""
                    />
                ))}
            </ReactPdfDocument>
        </div>
    );
}
