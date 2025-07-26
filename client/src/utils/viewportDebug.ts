// Debug utility to help identify viewport responsiveness issues
export const logViewportInfo = () => {
  if (typeof window !== 'undefined') {
    console.log('🖥️ Viewport Debug Info:', {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      isMobile: window.innerWidth < 1024,
      isDesktop: window.innerWidth >= 1024,
      userAgent: navigator.userAgent
    });
    
    // Check CSS media query matches
    const mobileQuery = window.matchMedia('(max-width: 1023px)');
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    
    console.log('📱 Media Query Results:', {
      mobileMatches: mobileQuery.matches,
      desktopMatches: desktopQuery.matches
    });
  }
};

// Auto-log on page load in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.addEventListener('load', logViewportInfo);
  window.addEventListener('resize', logViewportInfo);
}