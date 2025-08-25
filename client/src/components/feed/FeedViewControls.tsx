import React from 'react';
import { Grid, List, LayoutGrid, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeedLayout, FeedViewMode } from './FeedLayoutProvider';

export function FeedViewControls() {
  const { viewMode, setViewMode } = useFeedLayout();

  const viewModes: { mode: FeedViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'list', icon: <List size={16} />, label: 'List' },
    { mode: 'grid', icon: <Grid size={16} />, label: 'Grid' },
    { mode: 'masonry', icon: <LayoutGrid size={16} />, label: 'Masonry' },
  ];

  return (
    <div className="flex items-center gap-2">
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as FeedViewMode)}>
        <TabsList className="grid grid-cols-3 w-auto">
          {viewModes.map(({ mode, icon, label }) => (
            <TabsTrigger
              key={mode}
              value={mode}
              className="flex items-center gap-2 px-3"
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}