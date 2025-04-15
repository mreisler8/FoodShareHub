import { useState, useEffect } from 'react';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if the screen is mobile-sized
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check immediately on mount
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}