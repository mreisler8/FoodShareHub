
import React from 'react';
import { AppHeader } from './AppHeader';

interface UnifiedHeaderProps {
  showBackButton?: boolean;
  title?: string;
  onBackClick?: () => void;
}

export function UnifiedHeader({ showBackButton = false, title, onBackClick }: UnifiedHeaderProps) {
  return (
    <AppHeader 
      showBackButton={showBackButton}
      title={title}
      onBackClick={onBackClick}
    />
  );
}
