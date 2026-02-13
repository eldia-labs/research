"use client";

import { BookOpen, FileText, MessageSquare } from "lucide-react";

export type ActiveSection = "files" | "pdf" | "chat";

interface SectionNavProps {
    active: ActiveSection;
    onChange: (section: ActiveSection) => void;
}

const tabs: { id: ActiveSection; label: string; icon: React.ElementType }[] = [
    { id: "files", label: "Files", icon: FileText },
    { id: "pdf", label: "Viewer", icon: BookOpen },
    { id: "chat", label: "Chat", icon: MessageSquare },
];

export function SectionNav({ active, onChange }: SectionNavProps) {
    return (
        <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-input bg-background px-2 py-2 shadow-lg xl:hidden">
            {tabs.map((tab) => {
                const isActive = active === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`relative flex items-center justify-center rounded-lg p-2.5 transition-colors duration-150 ${isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        aria-label={tab.label}
                    >
                        <tab.icon className="size-4" />
                    </button>
                );
            })}
        </nav>
    );
}
