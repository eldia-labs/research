"use client";

import { useState } from "react";

import { ChatPanel } from "@/components/chat-panel";
import { PdfViewer } from "@/components/pdf-viewer";
import { Sidebar } from "@/components/sidebar";

export default function Page() {
    const [file, setFile] = useState<File | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [chatCollapsed, setChatCollapsed] = useState(false);

    const anyCollapsed = sidebarCollapsed || chatCollapsed;

    return (
        <div className="flex h-screen w-screen overflow-hidden">
            <Sidebar
                file={file}
                onFileSelect={setFile}
                collapsed={sidebarCollapsed}
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
    );
}