"use client";

import { useCallback, useState } from "react";

import { ChatPanel, type Message } from "@/components/chat-panel";
import { PdfViewer } from "@/components/pdf-viewer";
import { type ActiveSection, SectionNav } from "@/components/section-nav";
import { Sidebar } from "@/components/sidebar";

export default function Page() {
    const [files, setFiles] = useState<File[]>([]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [chatHistories, setChatHistories] = useState<Record<number, Message[]>>({});
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [chatCollapsed, setChatCollapsed] = useState(false);
    const [activeSection, setActiveSection] = useState<ActiveSection>("pdf");

    const activeFile = activeIndex !== null ? files[activeIndex] ?? null : null;
    const activeMessages = activeIndex !== null ? chatHistories[activeIndex] ?? [] : [];
    const anyCollapsed = sidebarCollapsed || chatCollapsed;

    function handleAddFile(file: File) {
        setFiles((prev) => [...prev, file]);
        setActiveIndex(files.length);
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
            <div className="hidden xl:flex h-screen w-screen overflow-hidden">
                <Sidebar
                    files={files}
                    activeIndex={activeIndex}
                    collapsed={sidebarCollapsed}
                    onFileAdd={handleAddFile}
                    onFileClick={setActiveIndex}
                    onToggle={() => setSidebarCollapsed((v) => !v)}
                />

                <div className={`h-full ${anyCollapsed ? "min-w-0 flex-1" : "shrink-0 aspect-[612/792]"}`}>
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