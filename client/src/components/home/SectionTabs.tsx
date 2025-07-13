
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import './SectionTabs.css';

interface SectionTabsProps {
  onTabChange: (tab: string) => void;
  activeTab?: string;
}

export function SectionTabs({ onTabChange, activeTab = 'My Lists' }: SectionTabsProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    onTabChange(tab);
  };

  return (
    <div className="section-tabs">
      <div className="tabs-container">
        <button 
          onClick={() => handleTabChange('My Lists')} 
          className={`tab-button ${currentTab === 'My Lists' ? 'active' : ''}`}
        >
          My Lists
        </button>
        <button 
          onClick={() => handleTabChange('Top Picks')} 
          className={`tab-button ${currentTab === 'Top Picks' ? 'active' : ''}`}
        >
          Top Picks
        </button>
        <button 
          onClick={() => handleTabChange('Circles')} 
          className={`tab-button ${currentTab === 'Circles' ? 'active' : ''}`}
        >
          Circles
        </button>
      </div>
    </div>
  );
}
