import type { ReactElement } from "react";

type PixelIconProps = {
    type: string;
    size?: number;
    color?: string;
};

export function PixelIcon({ type, size = 24, color = "currentColor" }: PixelIconProps) {
    const s = size;

    const icons: Record<string, ReactElement> = {
        file: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="1" y="0" width="4" height="1" fill={color} />
                <rect x="5" y="1" width="1" height="1" fill={color} />
                <rect x="6" y="2" width="1" height="1" fill={color} />
                <rect x="1" y="0" width="1" height="8" fill={color} />
                <rect x="6" y="2" width="1" height="6" fill={color} />
                <rect x="1" y="7" width="6" height="1" fill={color} />
                <rect x="4" y="0" width="1" height="3" fill={color} opacity="0.4" />
                <rect x="5" y="2" width="1" height="1" fill={color} opacity="0.4" />
            </svg>
        ),
        search: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="2" y="0" width="3" height="1" fill={color} />
                <rect x="1" y="1" width="1" height="1" fill={color} />
                <rect x="5" y="1" width="1" height="1" fill={color} />
                <rect x="0" y="2" width="1" height="2" fill={color} />
                <rect x="6" y="2" width="1" height="2" fill={color} />
                <rect x="1" y="4" width="1" height="1" fill={color} />
                <rect x="5" y="4" width="1" height="1" fill={color} />
                <rect x="2" y="5" width="3" height="1" fill={color} />
                <rect x="5" y="5" width="1" height="1" fill={color} />
                <rect x="6" y="6" width="1" height="1" fill={color} />
                <rect x="7" y="7" width="1" height="1" fill={color} />
            </svg>
        ),
        chat: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="0" y="0" width="8" height="1" fill={color} />
                <rect x="0" y="0" width="1" height="6" fill={color} />
                <rect x="7" y="0" width="1" height="6" fill={color} />
                <rect x="0" y="5" width="5" height="1" fill={color} />
                <rect x="5" y="5" width="1" height="1" fill={color} />
                <rect x="4" y="6" width="1" height="1" fill={color} />
                <rect x="3" y="7" width="1" height="1" fill={color} />
                <rect x="5" y="5" width="3" height="1" fill={color} />
                <rect x="2" y="2" width="1" height="1" fill={color} opacity="0.5" />
                <rect x="4" y="2" width="1" height="1" fill={color} opacity="0.5" />
                <rect x="6" y="2" width="1" height="1" fill={color} opacity="0.5" />
            </svg>
        ),
        brain: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="2" y="0" width="4" height="1" fill={color} />
                <rect x="1" y="1" width="1" height="1" fill={color} />
                <rect x="6" y="1" width="1" height="1" fill={color} />
                <rect x="0" y="2" width="1" height="3" fill={color} />
                <rect x="7" y="2" width="1" height="3" fill={color} />
                <rect x="3" y="2" width="2" height="1" fill={color} opacity="0.3" />
                <rect x="1" y="5" width="1" height="1" fill={color} />
                <rect x="6" y="5" width="1" height="1" fill={color} />
                <rect x="2" y="6" width="4" height="1" fill={color} />
                <rect x="3" y="7" width="2" height="1" fill={color} />
                <rect x="2" y="3" width="1" height="1" fill={color} opacity="0.5" />
                <rect x="5" y="3" width="1" height="1" fill={color} opacity="0.5" />
            </svg>
        ),
        star: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="3" y="0" width="2" height="1" fill={color} />
                <rect x="3" y="1" width="2" height="1" fill={color} />
                <rect x="0" y="2" width="8" height="1" fill={color} />
                <rect x="1" y="3" width="6" height="1" fill={color} />
                <rect x="1" y="4" width="6" height="1" fill={color} />
                <rect x="1" y="5" width="2" height="1" fill={color} />
                <rect x="5" y="5" width="2" height="1" fill={color} />
                <rect x="0" y="6" width="2" height="1" fill={color} />
                <rect x="6" y="6" width="2" height="1" fill={color} />
                <rect x="0" y="7" width="1" height="1" fill={color} />
                <rect x="7" y="7" width="1" height="1" fill={color} />
            </svg>
        ),
        pwa: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="1" y="0" width="6" height="1" fill={color} />
                <rect x="0" y="1" width="1" height="6" fill={color} />
                <rect x="7" y="1" width="1" height="6" fill={color} />
                <rect x="1" y="7" width="6" height="1" fill={color} />
                <rect x="2" y="2" width="1" height="1" fill={color} opacity="0.5" />
                <rect x="3" y="3" width="2" height="2" fill={color} opacity="0.3" />
                <rect x="5" y="2" width="1" height="1" fill={color} opacity="0.5" />
                <rect x="2" y="5" width="1" height="1" fill={color} opacity="0.5" />
                <rect x="5" y="5" width="1" height="1" fill={color} opacity="0.5" />
            </svg>
        ),
        history: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="2" y="0" width="4" height="1" fill={color} />
                <rect x="1" y="1" width="1" height="1" fill={color} />
                <rect x="6" y="1" width="1" height="1" fill={color} />
                <rect x="0" y="2" width="1" height="4" fill={color} />
                <rect x="7" y="2" width="1" height="4" fill={color} />
                <rect x="1" y="6" width="1" height="1" fill={color} />
                <rect x="6" y="6" width="1" height="1" fill={color} />
                <rect x="2" y="7" width="4" height="1" fill={color} />
                <rect x="4" y="2" width="1" height="3" fill={color} opacity="0.6" />
                <rect x="4" y="4" width="2" height="1" fill={color} opacity="0.6" />
            </svg>
        ),
        folder: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="0" y="1" width="3" height="1" fill={color} />
                <rect x="3" y="2" width="1" height="1" fill={color} />
                <rect x="0" y="2" width="1" height="5" fill={color} />
                <rect x="4" y="2" width="4" height="1" fill={color} />
                <rect x="7" y="2" width="1" height="5" fill={color} />
                <rect x="0" y="7" width="8" height="1" fill={color} />
            </svg>
        ),
        stream: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="0" y="1" width="5" height="1" fill={color} />
                <rect x="0" y="3" width="7" height="1" fill={color} />
                <rect x="0" y="5" width="4" height="1" fill={color} />
                <rect x="0" y="7" width="6" height="1" fill={color} />
                <rect x="6" y="1" width="1" height="1" fill={color} opacity="0.3" />
                <rect x="5" y="5" width="1" height="1" fill={color} opacity="0.3" />
            </svg>
        ),
        mcp: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="3" y="0" width="2" height="2" fill={color} />
                <rect x="3" y="2" width="2" height="1" fill={color} opacity="0.5" />
                <rect x="0" y="3" width="8" height="2" fill={color} />
                <rect x="0" y="5" width="2" height="1" fill={color} opacity="0.5" />
                <rect x="3" y="5" width="2" height="1" fill={color} opacity="0.5" />
                <rect x="6" y="5" width="2" height="1" fill={color} opacity="0.5" />
                <rect x="0" y="6" width="2" height="2" fill={color} />
                <rect x="3" y="6" width="2" height="2" fill={color} />
                <rect x="6" y="6" width="2" height="2" fill={color} />
            </svg>
        ),
        color: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="1" y="0" width="3" height="1" fill="#ef4444" />
                <rect x="0" y="1" width="1" height="3" fill="#ef4444" />
                <rect x="4" y="0" width="1" height="1" fill="#f97316" />
                <rect x="4" y="1" width="3" height="1" fill="#e8a525" />
                <rect x="7" y="1" width="1" height="3" fill="#e8a525" />
                <rect x="0" y="4" width="1" height="3" fill="#22d3ee" />
                <rect x="1" y="7" width="3" height="1" fill="#22d3ee" />
                <rect x="4" y="7" width="3" height="1" fill="#4ade80" />
                <rect x="7" y="4" width="1" height="3" fill="#4ade80" />
                <rect x="3" y="3" width="2" height="2" fill={color} />
            </svg>
        ),
        ocr: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="0" y="0" width="3" height="1" fill={color} />
                <rect x="0" y="0" width="1" height="3" fill={color} />
                <rect x="5" y="0" width="3" height="1" fill={color} />
                <rect x="7" y="0" width="1" height="3" fill={color} />
                <rect x="0" y="5" width="1" height="3" fill={color} />
                <rect x="0" y="7" width="3" height="1" fill={color} />
                <rect x="7" y="5" width="1" height="3" fill={color} />
                <rect x="5" y="7" width="3" height="1" fill={color} />
                <rect x="2" y="3" width="4" height="1" fill={color} opacity="0.4" />
                <rect x="3" y="5" width="2" height="1" fill={color} opacity="0.4" />
            </svg>
        ),
        modes: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="0" y="0" width="3" height="3" fill={color} />
                <rect x="4" y="0" width="4" height="1" fill={color} opacity="0.5" />
                <rect x="4" y="2" width="3" height="1" fill={color} opacity="0.3" />
                <rect x="0" y="5" width="3" height="3" fill={color} opacity="0.6" />
                <rect x="4" y="5" width="4" height="1" fill={color} opacity="0.5" />
                <rect x="4" y="7" width="3" height="1" fill={color} opacity="0.3" />
            </svg>
        ),
        voice: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="3" y="0" width="2" height="1" fill={color} />
                <rect x="3" y="1" width="2" height="3" fill={color} />
                <rect x="1" y="3" width="1" height="2" fill={color} />
                <rect x="6" y="3" width="1" height="2" fill={color} />
                <rect x="2" y="5" width="4" height="1" fill={color} />
                <rect x="3" y="6" width="2" height="1" fill={color} opacity="0.5" />
                <rect x="2" y="7" width="4" height="1" fill={color} />
            </svg>
        ),
        demo: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="1" y="0" width="6" height="1" fill={color} />
                <rect x="0" y="1" width="1" height="5" fill={color} />
                <rect x="7" y="1" width="1" height="5" fill={color} />
                <rect x="1" y="6" width="6" height="1" fill={color} />
                <rect x="3" y="2" width="1" height="3" fill={color} opacity="0.6" />
                <rect x="4" y="3" width="1" height="1" fill={color} opacity="0.6" />
                <rect x="5" y="2" width="1" height="1" fill={color} opacity="0.3" />
            </svg>
        ),
        filter: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="0" y="0" width="8" height="1" fill={color} />
                <rect x="1" y="1" width="6" height="1" fill={color} />
                <rect x="2" y="2" width="4" height="1" fill={color} />
                <rect x="3" y="3" width="2" height="1" fill={color} />
                <rect x="3" y="4" width="2" height="1" fill={color} opacity="0.6" />
                <rect x="3" y="5" width="2" height="1" fill={color} opacity="0.4" />
                <rect x="3" y="6" width="2" height="1" fill={color} opacity="0.3" />
            </svg>
        ),
        auto: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="2" y="0" width="4" height="1" fill={color} />
                <rect x="1" y="1" width="1" height="1" fill={color} />
                <rect x="6" y="1" width="1" height="1" fill={color} />
                <rect x="0" y="2" width="1" height="4" fill={color} />
                <rect x="7" y="2" width="1" height="4" fill={color} />
                <rect x="1" y="6" width="1" height="1" fill={color} />
                <rect x="6" y="6" width="1" height="1" fill={color} />
                <rect x="2" y="7" width="4" height="1" fill={color} />
                <rect x="3" y="2" width="2" height="1" fill={color} opacity="0.5" />
                <rect x="4" y="3" width="1" height="2" fill={color} opacity="0.5" />
                <rect x="2" y="4" width="2" height="1" fill={color} opacity="0.5" />
            </svg>
        ),
        arrow: (
            <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
                <rect x="3" y="0" width="2" height="1" fill={color} />
                <rect x="2" y="1" width="1" height="1" fill={color} />
                <rect x="5" y="1" width="1" height="1" fill={color} />
                <rect x="1" y="2" width="1" height="1" fill={color} />
                <rect x="6" y="2" width="1" height="1" fill={color} />
                <rect x="3" y="2" width="2" height="5" fill={color} />
            </svg>
        ),
    };

    return (
        <span className="inline-block" style={{ imageRendering: "pixelated" }}>
            {icons[type] || icons.file}
        </span>
    );
}
