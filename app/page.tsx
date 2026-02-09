"use client";

import { useState } from "react";

import { ChatPanel } from "@/components/chat-panel";
import { PdfViewer } from "@/components/pdf-viewer";
import { Sidebar } from "@/components/sidebar";

export default function Page() {
    const [file, setFile] = useState<File | null>(null);

    return (
        <div className="flex h-screen w-screen overflow-hidden">
            <Sidebar file={file} onFileSelect={setFile} />

            <div className="h-full shrink-0 border-x">
                <PdfViewer file={file} />
            </div>

            <ChatPanel file={file} />
        </div>
    );
}