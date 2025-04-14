import React, { useRef, useState, useEffect } from 'react';
import { SafeAreaView, ActivityIndicator, StyleSheet, BackHandler, Platform, View, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

interface WebViewWrapperProps {
  initialUrl?: string;
}

const WebViewWrapper: React.FC<WebViewWrapperProps> = ({ initialUrl }) => {
  const webViewRef = useRef<WebView | null>(null);
  const [loading, setLoading] = useState(true);
  
  // The URL of your web app when deployed
  // During development, use your local IP address or the Replit URL
  const WEB_APP_URL = initialUrl || 'http://localhost:5000'; 
  
  // Handle back button press (Android)
  const handleBackPress = () => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  };
  
  // Add Android back button handler
  useEffect(() => {
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
      };
    }
  }, []);
  
  // JavaScript to inject into the WebView
  const injectedJavaScript = `
    // This code runs in the WebView context
    
    // Add a class to the body to apply mobile-specific styles
    document.body.classList.add('mobile-app');
    
    // Set up a function to receive messages from React Native
    window.receivedFromNative = function(message) {
      console.log('Received from native:', message);
      // Handle messages based on type
      if (message.type === 'location_update') {
        // Update UI or state based on location
        window.dispatchEvent(new CustomEvent('location_update', { 
          detail: message.coords 
        }));
      }
      // Add more message handlers as needed
    };
    
    // Intercept external links
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a');
      if (target && target.getAttribute('target') === '_blank') {
        e.preventDefault();
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'external_link', url: target.href})
        );
        return false;
      }
      return true;
    }, false);
    
    // Set up a communication channel to send messages to React Native
    window.sendToNative = function(message) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    };
    
    true; // Return true to continue loading
  `;
  
  // Handle messages from WebView to React Native
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Handle different message types
      switch (data.type) {
        case 'external_link':
          // Open external link in device browser
          Linking.openURL(data.url).catch(err => 
            console.error('Failed to open URL:', err)
          );
          break;
          
        case 'auth_token':
          // Store authentication token
          console.log('Received auth token');
          // In a real app, you would store this in secure storage
          break;
          
        case 'share':
          // Trigger native share dialog
          console.log('Share request', data.content);
          // Implement share functionality
          break;
          
        default:
          console.log('Unhandled message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Handle navigation state change
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    // You can intercept navigation events here
    console.log('Navigation state changed:', navState.url);
  };
  
  // Send a message to the web app
  const sendToWebApp = (message: any) => {
    if (webViewRef.current) {
      const messageString = JSON.stringify(message);
      webViewRef.current.injectJavaScript(`
        window.receivedFromNative(${messageString});
        true;
      `);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled={true}
        userAgent="ReactNativeWebView/CirclesApp"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    zIndex: 999,
  },
});

export default WebViewWrapper;