"use client";

import {
    ArrowUp,
    ChevronDown,
    ChevronUp,
    Loader2,
    MessageSquare,
    Quote,
    Square,
    X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ModelSwitcher } from "@/components/model-switcher";
import { ResizeHandle } from "@/components/resize-handle";
import { Button } from "@/components/ui/button";
import {
    PromptInput,
    PromptInputAction,
    PromptInputActions,
    PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Separator } from "@/components/ui/separator";
import { COLLAPSED_WIDTH, useResizablePanel } from "@/hooks/use-resizable-panel";
import { DEFAULT_MODEL, type Model } from "@/lib/models";

export interface Message {
    role: "user" | "assistant";
    content: string;
    reasoning?: string;
    quotedText?: string;
}

interface ChatProps {
    file: File | null;
    messages: Message[];
    selection?: string | null;
    width?: number;
    onMessagesChange: (messages: Message[]) => void;
    onWidthChange?: (width: number) => void;
    onClearSelection?: () => void;
}

export function Chat({ file, messages, selection, width, onMessagesChange, onWidthChange, onClearSelection }: ChatProps) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [model, setModel] = useState<Model>(DEFAULT_MODEL);

    const [showReasoning, setShowReasoning] = useState<Record<number, boolean>>({});
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const collapsed = width !== undefined && width <= COLLAPSED_WIDTH;

    const { handleMouseDown, handleDoubleClick, expand } = useResizablePanel({
        width,
        side: "left",
        onWidthChange,
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    async function handleSubmit() {
        if (!file || !input.trim()) return;

        // Build the user prompt with selection context
        let promptText = input.trim();
        if (selection) {
            promptText = `Regarding this selected text from the paper:\n\n"${selection}"\n\n${promptText}`;
        }

        const userMessage: Message = {
            role: "user",
            content: input.trim(),
            quotedText: selection || undefined,
        };
        onMessagesChange([...messages, userMessage]);
        setInput("");
        onClearSelection?.();
        setLoading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("prompt", promptText);
        formData.append("provider", model.provider);
        formData.append("model", model.id);
        // Send conversation history so the model has context of previous turns
        if (messages.length > 0) {
            formData.append(
                "history",
                JSON.stringify(
                    messages.map((m) => ({ role: m.role, content: m.content }))
                )
            );
        }

        let reasoning = "";
        let content = "";

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await fetch("/api/summarize", {
                method: "POST",
                body: formData,
                signal: controller.signal,
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
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            onMessagesChange([
                ...messages,
                userMessage,
                { role: "assistant", content: "Failed to connect to the server." },
            ]);
        } finally {
            abortRef.current = null;
            setLoading(false);
        }
    }

    function handleStop() {
        abortRef.current?.abort();
    }

    function toggleReasoning(index: number) {
        setShowReasoning((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    if (collapsed) {
        return (
            <div className="relative flex h-full shrink-0">
                <ResizeHandle
                    side="left"
                    label="Expand chat"
                    className="flex"
                    onMouseDown={handleMouseDown}
                    onDoubleClick={handleDoubleClick}
                />
                <div
                    className="flex h-full w-12 flex-col items-center cursor-pointer"
                    onClick={expand}
                >
                    <div
                        className="flex h-12 w-full items-center justify-center"
                    >
                        <MessageSquare className="text-muted-foreground size-4" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex h-full shrink-0 pb-20 xl:pb-0" style={width !== undefined ? { width } : undefined}>
            <ResizeHandle
                side="left"
                label="Collapse chat"
                className="hidden xl:flex"
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
            />

            <div className="flex h-full flex-1 min-w-0 flex-col overflow-hidden">
                <div className="flex h-12 items-center border-b border-border px-4 shrink-0">
                    <h2 className="text-sm font-semibold">Chat</h2>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                    {messages.map((msg, i) => (
                        <div key={i} className="space-y-1">
                            {msg.role === "user" ? (
                                <div className="flex justify-end">
                                    <div className="max-w-[85%] space-y-1">
                                        {msg.quotedText && (
                                            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary-foreground/70">
                                                <div className="flex items-start gap-1.5">
                                                    <Quote className="mt-0.5 size-3 shrink-0 rotate-180 opacity-60" />
                                                    <p className="line-clamp-4 whitespace-pre-wrap italic">{msg.quotedText}</p>
                                                    <Quote className="mt-0.5 size-3 shrink-0 self-end opacity-60" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words">
                                            {msg.content}
                                        </div>
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
                    {/* Selection preview */}
                    {selection && (
                        <div className="mb-2 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-2">
                            <Quote className="mt-0.5 size-3.5 shrink-0 rotate-180 text-muted-foreground" />
                            <p className="flex-1 text-xs text-muted-foreground line-clamp-3">
                                {selection}
                            </p>
                            <Quote className="mt-0.5 size-3.5 shrink-0 self-end text-muted-foreground" />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-5 shrink-0"
                                onClick={onClearSelection}
                            >
                                <X className="size-3" />
                            </Button>
                        </div>
                    )}

                    <PromptInput
                        value={input}
                        onValueChange={setInput}
                        isLoading={loading}
                        onSubmit={handleSubmit}
                        disabled={!file}
                        maxHeight={120}
                    >
                        <PromptInputTextarea
                            placeholder="Ask a question…"
                            className="text-sm"
                        />
                        <PromptInputActions className="justify-between pt-2">
                            <ModelSwitcher model={model} onChange={setModel} />
                            <PromptInputAction
                                tooltip={loading ? "Stop generation" : "Send message"}
                            >
                                {loading ? (
                                    <Button
                                        variant="default"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={handleStop}
                                    >
                                        <Square className="size-4 fill-current" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="default"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        disabled={!file || !input.trim()}
                                        onClick={handleSubmit}
                                    >
                                        <ArrowUp className="size-4" />
                                    </Button>
                                )}
                            </PromptInputAction>
                        </PromptInputActions>
                    </PromptInput>
                </div>
            </div>
        </div>
    );
}
