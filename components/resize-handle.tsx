"use client";

interface ResizeHandleProps {
  label: string;
  className?: string;
  isDragging?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}

export function ResizeHandle({
  label,
  className = "",
  isDragging = false,
  onMouseDown,
  onDoubleClick,
}: ResizeHandleProps) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      className={`group relative z-10 shrink-0 cursor-col-resize items-center justify-center ${className}`}
      aria-label={label}
    >
      <div
        className={`h-full w-px transition-all ${
          isDragging
            ? "bg-primary shadow-[0_0_0_1.5px_var(--color-primary)]"
            : "bg-border group-hover:bg-primary group-hover:shadow-[0_0_0_1.5px_var(--color-primary)]"
        }`}
      />
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </button>
  );
}
