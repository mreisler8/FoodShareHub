import { LucideIcon } from 'lucide-react';

interface NavTab {
  key: string;
  label: string;
  Icon: LucideIcon;
  href?: string;
  onClick?: () => void;
}

interface BottomNavProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

export function BottomNav({ tabs, activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white pb-safe pt-2 shadow-inner flex justify-around">
      {tabs.map(tab => (
        <button
          key={tab.key}
          aria-label={tab.label}
          onClick={() => {
            onTabChange(tab.key);
            if (tab.onClick) {
              tab.onClick();
            }
          }}
          className={`flex flex-col items-center min-h-[44px] min-w-[44px] justify-center px-2 py-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
            activeTab === tab.key ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <tab.Icon className="h-6 w-6"/>
          <span className="text-xs mt-1">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}