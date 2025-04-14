/**
 * Utilities for detecting and interacting with the native mobile app wrapper
 */

// Check if the app is running in the native mobile wrapper
export const isNativeApp = () => {
  return typeof window !== 'undefined' && 
    (window.isNativeApp === true || (window as any).nativeAuth !== undefined);
};

// Interface for the native auth API provided by the WebView
interface NativeAuth {
  login: (username: string, password: string) => void;
  register: (username: string, email: string, password: string) => void;
  logout: () => void;
  isNativeApp: boolean;
}

// Get the native auth API if available
export const getNativeAuth = (): NativeAuth | null => {
  if (typeof window !== 'undefined' && (window as any).nativeAuth) {
    return (window as any).nativeAuth as NativeAuth;
  }
  return null;
};

// Listen for auth events from the native app
export const listenForNativeAuthEvents = (callback: (event: CustomEvent) => void) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('native_auth_update', ((event: CustomEvent) => {
      callback(event);
    }) as EventListener);

    return () => {
      window.removeEventListener('native_auth_update', callback as EventListener);
    };
  }
  return () => {};
};

// Add a native-specific class to the body for CSS targeting
export const addNativeAppClass = () => {
  if (typeof document !== 'undefined' && isNativeApp()) {
    document.body.classList.add('native-app');
  }
};