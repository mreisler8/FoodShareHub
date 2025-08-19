import { createRoot } from "react-dom/client";
import SimpleTest from "./test";

console.log('🚀 TEST: main.tsx loading...');

// Development debugging utilities
if (process.env.NODE_ENV === 'development') {
  import('./utils/buttonValidation').then(({ validateButtons }) => {
    (window as any).validateButtons = validateButtons;
  });
  
  import('./utils/qaValidation').then(({ QAValidator }) => {
    (window as any).QAValidator = QAValidator;
  });
}

console.log('🚀 TEST: About to render simple test...');
createRoot(document.getElementById("root")!).render(<SimpleTest />);
console.log('🚀 TEST: Simple test render called');
// Global error handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  // Log to analytics
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: `Unhandled Promise Rejection: ${event.reason}`,
      fatal: false,
    });
  }

  // Prevent default browser behavior
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);

  // Log to analytics
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: `Global Error: ${event.error?.message}`,
      fatal: true,
    });
  }
});