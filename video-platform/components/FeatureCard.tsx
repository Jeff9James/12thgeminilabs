import type { ReactNode } from "react";

type FeatureCardProps = {
    icon: ReactNode;
    title: string;
    description: string;
    tags?: string[];
    tagColors?: string[];
};

export function FeatureCard({ icon, title, description, tags = [], tagColors = [] }: FeatureCardProps) {
    return (
        <div className="bg-card dither-light border-2 border-border p-4 pixel-border hover:bg-card-hover transition-none hover:border-accent group">
            <div className="flex items-start gap-3">
                <div className="shrink-0 mt-1 text-accent group-hover:text-cream transition-none">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h3 className="font-silk text-sm text-cream mb-1 leading-tight">{title}</h3>
                    <p className="font-retro text-base text-cream/60 leading-tight">{description}</p>
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((tag, i) => (
                                <span
                                    key={tag}
                                    className="pixel-tag border-current"
                                    style={{ color: tagColors[i] || "#e8a525" }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
