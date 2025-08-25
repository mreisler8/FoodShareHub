import { useState } from "react";
import { cn } from "@/lib/utils";

export type HeroTabType = 'for-you' | 'trending' | 'near-you';

interface HeroTabsProps {
  activeTab: HeroTabType;
  onTabChange: (tab: HeroTabType) => void;
}

const tabs = [
  {
    id: 'for-you' as const,
    label: 'For You',
    description: 'Lists from followed users or Circles'
  },
  {
    id: 'trending' as const,
    label: 'Trending',
    description: 'Lists with high save counts'
  },
  {
    id: 'near-you' as const,
    label: 'Near You',
    description: 'Lists tagged with current location'
  }
];

export function HeroTabs({ activeTab, onTabChange }: HeroTabsProps) {
  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "group relative min-w-0 flex-1 whitespace-nowrap py-4 px-1 text-sm font-medium text-center border-b-2 focus:outline-none transition-colors duration-200",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <span className="truncate">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}