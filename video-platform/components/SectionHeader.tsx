import type { ReactNode } from "react";

type SectionHeaderProps = {
    icon: ReactNode;
    title: string;
    subtitle?: string;
};

export function SectionHeader({ icon, title, subtitle }: SectionHeaderProps) {
    return (
        <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-2">
                <span className="text-accent">{icon}</span>
                <h2 className="font-pixel text-lg sm:text-xl text-cream tracking-wider">{title}</h2>
                <span className="text-accent">{icon}</span>
            </div>
            {subtitle && (
                <p className="font-retro text-lg text-cream/50 max-w-2xl mx-auto">{subtitle}</p>
            )}
            <div className="mt-3 flex items-center justify-center gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                    <span
                        key={i}
                        className="inline-block w-2 h-1"
                        style={{
                            backgroundColor: i % 2 === 0 ? "#e8a525" : "transparent",
                            opacity: Math.abs(i - 10) < 5 ? 1 : 0.3,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
