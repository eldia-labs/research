"use client";

import {
    ArrowUp,
    ChevronDown,
    ChevronUp,
    Loader2,
    MessageSquare,
    Square,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    PromptInput,
    PromptInputAction,
    PromptInputActions,
    PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Separator } from "@/components/ui/separator";

export interface Message {
    role: "user" | "assistant";
    content: string;
    reasoning?: string;
}

interface ChatPanelProps {
    file: File | null;
    messages: Message[];
    onMessagesChange: (messages: Message[]) => void;
    collapsed: boolean;
    onToggle: () => void;
}

export function ChatPanel({ file, messages, onMessagesChange, collapsed, onToggle }: ChatPanelProps) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [showReasoning, setShowReasoning] = useState<Record<number, boolean>>(
        {}
    );
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!file || !input.trim()) return;

        const userMessage: Message = { role: "user", content: input.trim() };
        onMessagesChange([...messages, userMessage]);
        setInput("");
        setLoading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("prompt", userMessage.content);

        let reasoning = "";
        let content = "";

        try {
            const res = await fetch("/api/summarize", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                onMessagesChange([
                    ...messages,
                    userMessage,
                    {
                        role: "assistant",
                        content: data.error || "Something went wrong.",
                    },
                ]);
                return;
            }

            const reader = res.body?.getReader();
            if (!reader) {
                onMessagesChange([
                    ...messages,
                    userMessage,
                    { role: "assistant", content: "No response stream." },
                ]);
                return;
            }

            // Add a placeholder assistant message
            const messagesWithUser = [...messages, userMessage];
            onMessagesChange([
                ...messagesWithUser,
                { role: "assistant", content: "", reasoning: "" },
            ]);

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    try {
                        const chunk = JSON.parse(trimmed);
                        if (chunk.type === "reasoning") {
                            reasoning += chunk.delta;
                        } else if (chunk.type === "text") {
                            content += chunk.delta;
                        }
                    } catch {
                        // skip non-JSON lines
                    }
                }

                // Update the last assistant message in place
                onMessagesChange([
                    ...messagesWithUser,
                    {
                        role: "assistant",
                        content,
                        reasoning,
                    },
                ]);
            }
        } catch {
            onMessagesChange([
                ...messages,
                userMessage,
                { role: "assistant", content: "Failed to connect to the server." },
            ]);
        } finally {
            setLoading(false);
        }
    }

    function toggleReasoning(index: number) {
        setShowReasoning((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    if (collapsed) {
        return (
            <div className="relative flex h-full shrink-0">
                <button
                    type="button"
                    onDoubleClick={onToggle}
                    className="group relative z-10 flex shrink-0 cursor-col-resize items-center justify-center"
                    aria-label="Expand chat"
                >
                    <div className="h-full w-px bg-border group-hover:bg-primary group-hover:shadow-[0_0_0_1.5px_var(--color-primary)] transition-all" />
                    <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
                </button>
                <div className="flex h-full w-8 items-start justify-center pt-5">
                    <MessageSquare className="text-muted-foreground size-4" />
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex h-full flex-1 min-w-0 pb-20 xl:pb-0">
            <button
                type="button"
                onDoubleClick={onToggle}
                className="group relative z-10 hidden xl:flex shrink-0 cursor-col-resize items-center justify-center"
                aria-label="Collapse chat"
            >
                <div className="h-full w-px bg-border group-hover:bg-primary group-hover:shadow-[0_0_0_1.5px_var(--color-primary)] transition-all" />
                <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
            </button>

            <div className="flex h-full flex-1 min-w-0 flex-col overflow-hidden">
                <div className="px-4 py-5 shrink-0">
                    <h2 className="text-sm font-semibold">Chat</h2>
                </div>

                <Separator />

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                    {messages.map((msg, i) => (
                        <div key={i} className="space-y-1">
                            {msg.role === "user" ? (
                                <div className="flex justify-end">
                                    <div className="bg-primary text-primary-foreground max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words">
                                        {msg.content}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {msg.reasoning && (
                                        <button
                                            type="button"
                                            onClick={() => toggleReasoning(i)}
                                            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[0.65rem] font-medium transition-colors"
                                        >
                                            {showReasoning[i] ? (
                                                <ChevronUp className="size-3" />
                                            ) : (
                                                <ChevronDown className="size-3" />
                                            )}
                                            {showReasoning[i] ? "Hide" : "Show"} reasoning
                                        </button>
                                    )}
                                    {showReasoning[i] && msg.reasoning && (
                                        <div className="bg-muted rounded-lg px-3 py-2">
                                            <p className="text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap text-[0.65rem]/relaxed">
                                                {msg.reasoning}
                                            </p>
                                        </div>
                                    )}
                                    <div className="bg-muted text-foreground max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words">
                                        {msg.content || (
                                            <span className="text-muted-foreground italic">
                                                Thinking…
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && messages[messages.length - 1]?.role !== "assistant" && (
                        <div className="flex items-center gap-2">
                            <Loader2 className="text-muted-foreground size-3 animate-spin" />
                            <span className="text-muted-foreground text-xs">Thinking…</span>
                        </div>
                    )}
                </div>

                <Separator />

                <div className="p-3 shrink-0">
                    <PromptInput
                        value={input}
                        onValueChange={setInput}
                        isLoading={loading}
                        onSubmit={() => handleSubmit({ preventDefault: () => { } } as FormEvent)}
                        disabled={!file}
                        maxHeight={120}
                    >
                        <PromptInputTextarea
                            placeholder="Ask a question…"
                            className="text-sm"
                        />
                        <PromptInputActions className="justify-end pt-2">
                            <PromptInputAction
                                tooltip={loading ? "Stop generation" : "Send message"}
                            >
                                <Button
                                    variant="default"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    disabled={!file || loading || !input.trim()}
                                    onClick={() => handleSubmit({ preventDefault: () => { } } as FormEvent)}
                                >
                                    {loading ? (
                                        <Square className="size-4 fill-current" />
                                    ) : (
                                        <ArrowUp className="size-4" />
                                    )}
                                </Button>
                            </PromptInputAction>
                        </PromptInputActions>
                    </PromptInput>
                </div>
            </div>
        </div>
    );
}
