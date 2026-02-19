"use client";

import { useCallback } from "react";

export const MIN_PANEL_WIDTH = 180;
export const COLLAPSED_WIDTH = 48;
export const DEFAULT_PANEL_WIDTH = 320;

interface UseResizablePanelOptions {
    width?: number;
    side: "left" | "right";
    onWidthChange?: (width: number) => void;
}

export function useResizablePanel({
    width,
    side,
    onWidthChange,
}: UseResizablePanelOptions) {
    const collapsed = width !== undefined && width <= COLLAPSED_WIDTH;

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!onWidthChange) return;
            e.preventDefault();
            const startX = e.clientX;
            const startW = collapsed ? COLLAPSED_WIDTH : (width ?? DEFAULT_PANEL_WIDTH);

            const onMouseMove = (ev: MouseEvent) => {
                const delta = ev.clientX - startX;
                const newW = side === "right" ? startW + delta : startW - delta;
                if (newW < MIN_PANEL_WIDTH) {
                    onWidthChange(COLLAPSED_WIDTH);
                } else {
                    onWidthChange(newW);
                }
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                document.body.style.removeProperty("cursor");
                document.body.style.removeProperty("user-select");
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        },
        [collapsed, width, side, onWidthChange],
    );

    const handleDoubleClick = useCallback(() => {
        onWidthChange?.(DEFAULT_PANEL_WIDTH);
    }, [onWidthChange]);

    const expand = useCallback(() => {
        onWidthChange?.(DEFAULT_PANEL_WIDTH);
    }, [onWidthChange]);

    return { handleMouseDown, handleDoubleClick, expand };
}
