"use client";

import { useState } from "react";

import { ChatPanel } from "@/components/chat-panel";
import { PdfViewer } from "@/components/pdf-viewer";
import { type ActiveSection, SectionNav } from "@/components/section-nav";
import { Sidebar } from "@/components/sidebar";

export default function Page() {
    const [file, setFile] = useState<File | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [chatCollapsed, setChatCollapsed] = useState(false);
    const [activeSection, setActiveSection] = useState<ActiveSection>("pdf");

    const anyCollapsed = sidebarCollapsed || chatCollapsed;

    return (
        <>
            <div className="hidden xl:flex h-screen w-screen overflow-hidden">
                <Sidebar
                    file={file}
                    collapsed={sidebarCollapsed}
                    onFileSelect={setFile}
                    onToggle={() => setSidebarCollapsed((v) => !v)}
                />

                <div className={`h-full ${anyCollapsed ? "min-w-0 flex-1" : "shrink-0 aspect-[612/792]"}`}>
                    <PdfViewer file={file} />
                </div>

                <ChatPanel
                    file={file}
                    collapsed={chatCollapsed}
                    onToggle={() => setChatCollapsed((v) => !v)}
                />
            </div>

            <div className="flex xl:hidden h-screen w-screen overflow-hidden flex-col">
                <div className="flex-1 min-h-0">
                    <div className={`h-full ${activeSection === "files" ? "block" : "hidden"}`}>
                        <Sidebar
                            file={file}
                            collapsed={false}
                            onFileSelect={(f) => {
                                setFile(f);
                                setActiveSection("pdf");
                            }}
                            onToggle={() => { }}
                        />
                    </div>
                    <div className={`h-full ${activeSection === "pdf" ? "block" : "hidden"}`}>
                        <PdfViewer file={file} />
                    </div>
                    <div className={`h-full ${activeSection === "chat" ? "block" : "hidden"}`}>
                        <ChatPanel
                            file={file}
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