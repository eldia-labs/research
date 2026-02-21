"use client";

import { useCallback, useState } from "react";

import { Chat, type Message } from "@/components/chat";
import { PdfViewer } from "@/components/pdf-viewer";
import { type ActiveSection, SectionNav } from "@/components/section-nav";
import { Sidebar } from "@/components/sidebar";
import { extractPdfInfo, type PaperMetadata } from "@/lib/pdf";

const MIN_PDF_WIDTH = 480;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [paperMetadata, setPaperMetadata] = useState<
    Record<number, PaperMetadata | null>
  >({});
  const [chatHistories, setChatHistories] = useState<Record<number, Message[]>>(
    {},
  );

  const [activeSection, setActiveSection] = useState<ActiveSection>("pdf");
  const [textSelection, setTextSelection] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [chatWidth, setChatWidth] = useState(320);

  const activeFile = activeIndex !== null ? (files[activeIndex] ?? null) : null;
  const activeMessages =
    activeIndex !== null ? (chatHistories[activeIndex] ?? []) : [];

  async function fetchMetadata(file: File, index: number) {
    try {
      const { doi, arxivId, firstPageText } = await extractPdfInfo(file);
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
  }

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
    fetchMetadata(file, index);
  }

  const handleSidebarWidthChange = useCallback(
    (newWidth: number) => {
      const maxWidth = window.innerWidth - chatWidth - MIN_PDF_WIDTH;
      setSidebarWidth(Math.min(newWidth, maxWidth));
    },
    [chatWidth],
  );

  const handleChatWidthChange = useCallback(
    (newWidth: number) => {
      const maxWidth = window.innerWidth - sidebarWidth - MIN_PDF_WIDTH;
      setChatWidth(Math.min(newWidth, maxWidth));
    },
    [sidebarWidth],
  );

  const handleMessagesChange = useCallback(
    (messages: Message[]) => {
      if (activeIndex === null) return;
      setChatHistories((prev) => ({ ...prev, [activeIndex]: messages }));
    },
    [activeIndex],
  );

  const handleTextSelection = useCallback((selection: string) => {
    setTextSelection(selection);
    setActiveSection("chat");
  }, []);

  const handleClearSelection = useCallback(() => {
    setTextSelection(null);
  }, []);

  const handleFileClick = useCallback((index: number) => {
    setActiveIndex(index);
    setTextSelection(null);
  }, []);

  return (
    <>
      <div className="hidden xl:flex h-screen w-screen overflow-hidden">
        <Sidebar
          files={files}
          paperMetadata={paperMetadata}
          activeIndex={activeIndex}
          width={sidebarWidth}
          onWidthChange={handleSidebarWidthChange}
          onFileAdd={handleAddFile}
          onFileClick={handleFileClick}
        />

        <div className="h-full min-w-[480px] flex-[2]">
          <PdfViewer file={activeFile} onSelection={handleTextSelection} />
        </div>

        <Chat
          file={activeFile}
          messages={activeMessages}
          selection={textSelection}
          width={chatWidth}
          onMessagesChange={handleMessagesChange}
          onWidthChange={handleChatWidthChange}
          onClearSelection={handleClearSelection}
        />
      </div>

      <div className="flex xl:hidden h-screen w-screen overflow-hidden flex-col">
        <div className="flex-1 min-h-0">
          <div
            className={`h-full ${activeSection === "files" ? "block" : "hidden"}`}
          >
            <Sidebar
              files={files}
              paperMetadata={paperMetadata}
              activeIndex={activeIndex}
              onFileAdd={(f) => {
                handleAddFile(f);
                setActiveSection("pdf");
              }}
              onFileClick={(i) => {
                handleFileClick(i);
                setActiveSection("pdf");
              }}
            />
          </div>
          <div
            className={`h-full ${activeSection === "pdf" ? "block" : "hidden"}`}
          >
            <PdfViewer file={activeFile} onSelection={handleTextSelection} />
          </div>
          <div
            className={`h-full ${activeSection === "chat" ? "block" : "hidden"}`}
          >
            <Chat
              file={activeFile}
              messages={activeMessages}
              selection={textSelection}
              onMessagesChange={handleMessagesChange}
              onClearSelection={handleClearSelection}
            />
          </div>
        </div>
        <SectionNav active={activeSection} onChange={setActiveSection} />
      </div>
    </>
  );
}
