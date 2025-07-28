
import React from 'react';
import { AppHeader } from './AppHeader';

interface UnifiedHeaderProps {
  showBackButton?: boolean;
  title?: string;
  onBackClick?: () => void;
  mode?: 'logo' | 'back';
}

export function UnifiedHeader({ showBackButton = false, title, onBackClick, mode }: UnifiedHeaderProps) {
  // If mode is explicitly set, use it to determine showBackButton
  const shouldShowBack = mode === 'back' ? true : (mode === 'logo' ? false : showBackButton);
  
  return (
    <AppHeader 
      showBackButton={shouldShowBack}
      title={title}
      onBackClick={onBackClick}
    />
  );
}
