"use client";

import { ChevronDown, ChevronUp, FileUp, Loader2, Send } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export default function Page() {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState(
        "Please provide a comprehensive summary of this research paper, including the key findings, methodology, and conclusions."
    );
    const [reasoning, setReasoning] = useState("");
    const [summary, setSummary] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showReasoning, setShowReasoning] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError("");
        setSummary("");
        setReasoning("");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("prompt", prompt);

        try {
            const res = await fetch("/api/summarize", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Something went wrong.");
                return;
            }

            const reader = res.body?.getReader();
            if (!reader) {
                setError("No response stream.");
                return;
            }

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
                            setReasoning((prev) => prev + chunk.delta);
                        } else if (chunk.type === "text") {
                            setSummary((prev) => prev + chunk.delta);
                        }
                    } catch {
                        // skip non-JSON lines
                    }
                }
            }
        } catch {
            setError("Failed to connect to the server.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-12">
            <div className="mb-8 space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">research.</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>New Summary</CardTitle>
                    <CardDescription>
                        Upload a PDF and customize your prompt, then submit to generate a
                        summary.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="file">Research Paper (PDF)</Label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const droppedFile = e.dataTransfer.files?.[0];
                                    if (droppedFile?.type === "application/pdf") {
                                        setFile(droppedFile);
                                    }
                                }}
                                className="border-input hover:border-ring/50 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 transition-colors"
                            >
                                <FileUp className="text-muted-foreground size-8" />
                                {file ? (
                                    <p className="text-sm font-medium">{file.name}</p>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Click or drag &amp; drop a PDF file
                                    </p>
                                )}
                                <input
                                    ref={fileInputRef}
                                    id="file"
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prompt">Prompt</Label>
                            <Textarea
                                id="prompt"
                                rows={3}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Enter your prompt..."
                                className="resize-y"
                                required
                            />
                        </div>

                        <Button type="submit" size="lg" disabled={loading || !file}>
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" data-icon="inline-start" />
                                    Summarizing…
                                </>
                            ) : (
                                <>
                                    <Send data-icon="inline-start" />
                                    Summarize
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {error && (
                <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    {error}
                </div>
            )}

            {(reasoning || loading) && reasoning !== "" && (
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={() => setShowReasoning((v) => !v)}
                        className="text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1 text-xs font-medium transition-colors"
                    >
                        {showReasoning ? (
                            <ChevronUp className="size-3.5" />
                        ) : (
                            <ChevronDown className="size-3.5" />
                        )}
                        {showReasoning ? "Hide" : "Show"} Reasoning
                        {loading && !summary ? " ⏳" : " ✓"}
                    </button>
                    {showReasoning && (
                        <Card>
                            <CardContent>
                                <div className="text-muted-foreground max-h-[400px] overflow-y-auto whitespace-pre-wrap text-xs/relaxed">
                                    {reasoning}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {summary && (
                <div className="mt-6">
                    <Separator className="mb-6" />
                    <h2 className="mb-3 text-sm font-semibold">Summary</h2>
                    <Card>
                        <CardContent>
                            <div className="whitespace-pre-wrap text-sm/relaxed">
                                {summary}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}