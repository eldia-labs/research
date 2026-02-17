"use client";

import { useCallback, useEffect, useState } from "react";

import { ChatPanel, type Message } from "@/components/chat-panel";
import { PdfViewer } from "@/components/pdf-viewer";
import { type ActiveSection, SectionNav } from "@/components/section-nav";
import { Sidebar } from "@/components/sidebar";
import { extractPdfInfo, type PaperMetadata } from "@/lib/pdf";

export default function Page() {
    const [files, setFiles] = useState<File[]>([]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [chatHistories, setChatHistories] = useState<Record<number, Message[]>>({});
    const [paperMetadata, setPaperMetadata] = useState<Record<number, PaperMetadata | null>>({});
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [chatCollapsed, setChatCollapsed] = useState(false);
    const [activeSection, setActiveSection] = useState<ActiveSection>("pdf");

    const activeFile = activeIndex !== null ? files[activeIndex] ?? null : null;
    const activeMessages = activeIndex !== null ? chatHistories[activeIndex] ?? [] : [];

    useEffect(() => {
        console.log(paperMetadata)
    }, [paperMetadata]);

    function handleAddFile(file: File) {
        const existingIndex = files.findIndex(
            (existingFile) =>
                existingFile.name === file.name &&
                existingFile.size === file.size &&
                existingFile.lastModified === file.lastModified,
        );

        if (existingIndex !== -1) {
            setActiveIndex(existingIndex);
            return;
        }

        const index = files.length;
        setFiles((prev) => [...prev, file]);
        setActiveIndex(index);

        // Extract DOI / arXiv ID → fetch metadata
        extractPdfInfo(file).then(async ({ doi, arxivId, firstPageText }) => {

            try {
                const params = new URLSearchParams();
                if (doi) params.set("doi", doi);
                if (arxivId) params.set("arxiv", arxivId);
                if (firstPageText.trim()) params.set("query", firstPageText);

                if (!params.size) {
                    setPaperMetadata((prev) => ({ ...prev, [index]: null }));
                    return;
                }

                const res = await fetch(`/api/metadata?${params.toString()}`);
                if (res.ok) {
                    const metadata: PaperMetadata = await res.json();
                    setPaperMetadata((prev) => ({ ...prev, [index]: metadata }));
                } else {
                    setPaperMetadata((prev) => ({ ...prev, [index]: null }));
                }
            } catch {
                setPaperMetadata((prev) => ({ ...prev, [index]: null }));
            }
        });
    }

    const handleMessagesChange = useCallback(
        (messages: Message[]) => {
            if (activeIndex === null) return;
            setChatHistories((prev) => ({ ...prev, [activeIndex]: messages }));
        },
        [activeIndex],
    );

    return (
        <>
            <div className="hidden xl:flex h-screen w-screen overflow-hidden overscroll-none">
                <Sidebar
                    files={files}
                    paperMetadata={paperMetadata}
                    activeIndex={activeIndex}
                    collapsed={sidebarCollapsed}
                    onFileAdd={handleAddFile}
                    onFileClick={setActiveIndex}
                    onToggle={() => setSidebarCollapsed((v) => !v)}
                />

                <div className="h-full min-w-0 flex-[2]">
                    <PdfViewer file={activeFile} />
                </div>

                <ChatPanel
                    file={activeFile}
                    messages={activeMessages}
                    onMessagesChange={handleMessagesChange}
                    collapsed={chatCollapsed}
                    onToggle={() => setChatCollapsed((v) => !v)}
                />
            </div>

            <div className="flex xl:hidden h-screen w-screen overflow-hidden flex-col">
                <div className="flex-1 min-h-0">
                    <div className={`h-full ${activeSection === "files" ? "block" : "hidden"}`}>
                        <Sidebar
                            files={files}
                            paperMetadata={paperMetadata}
                            activeIndex={activeIndex}
                            collapsed={false}
                            onFileAdd={(f) => {
                                handleAddFile(f);
                                setActiveSection("pdf");
                            }}
                            onFileClick={(i) => {
                                setActiveIndex(i);
                                setActiveSection("pdf");
                            }}
                            onToggle={() => { }}
                        />
                    </div>
                    <div className={`h-full ${activeSection === "pdf" ? "block" : "hidden"}`}>
                        <PdfViewer file={activeFile} />
                    </div>
                    <div className={`h-full ${activeSection === "chat" ? "block" : "hidden"}`}>
                        <ChatPanel
                            file={activeFile}
                            messages={activeMessages}
                            onMessagesChange={handleMessagesChange}
                            collapsed={false}
                            onToggle={() => { }}
                        />
                    </div>
                </div>
                <SectionNav active={activeSection} onChange={setActiveSection} />
            </div>
        </>
    );
}