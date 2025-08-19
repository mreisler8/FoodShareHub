import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Development debugging utilities
if (process.env.NODE_ENV === 'development') {
  import('./utils/buttonValidation').then(({ validateButtons }) => {
    (window as any).validateButtons = validateButtons;
  });
  
  import('./utils/qaValidation').then(({ QAValidator }) => {
    (window as any).QAValidator = QAValidator;
  });
}

createRoot(document.getElementById("root")!).render(<App />);
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