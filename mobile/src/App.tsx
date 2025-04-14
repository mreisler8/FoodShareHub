import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, StyleSheet, Linking, Platform, ActivityIndicator } from 'react-native';
import WebViewWrapper from './WebViewWrapper';
import AuthScreen from './screens/AuthScreen';
import AuthService from './services/AuthService';

const App: React.FC = () => {
  const [initialUrl, setInitialUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  // Base URL for API requests
  const API_BASE_URL = 'http://localhost:5000';

  useEffect(() => {
    // Check authentication status and handle deep linking
    const initialize = async () => {
      try {
        // Check if user is authenticated
        const isAuth = await AuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          // Get stored user data
          const token = await AuthService.getAuthToken();
          const user = await AuthService.getUserData();
          
          setAuthToken(token);
          setUserData(user);
        }
        
        // Handle deep linking
        const url = await Linking.getInitialURL();
        if (url) {
          parseDeepLink(url);
        } else {
          setInitialUrl(API_BASE_URL);
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        setInitialUrl(API_BASE_URL);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Set up a listener for URL events
    const handleLinkingChange = ({ url }: { url: string }) => {
      parseDeepLink(url);
    };

    const linkingSubscription = Linking.addEventListener('url', handleLinkingChange);

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  const parseDeepLink = (url: string) => {
    try {
      const scheme = Platform.OS === 'android' ? 'circles://' : 'circles://';
      let path = url.replace(scheme, '');
      
      // Set the WebView to load this path
      setInitialUrl(`${API_BASE_URL}/${path}`);
    } catch (error) {
      console.error('Error parsing deep link', error);
      setInitialUrl(API_BASE_URL);
    }
  };

  const handleAuthenticated = async (token: string, user: any) => {
    try {
      // Save authentication data
      await AuthService.saveAuthData(token, user);
      
      // Update state
      setAuthToken(token);
      setUserData(user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error handling authentication:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      setIsAuthenticated(false);
      setAuthToken(null);
      setUserData(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Pass messages from WebView to native code
  const handleWebViewMessage = (message: any) => {
    if (message.type === 'logout') {
      handleLogout();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0070f3" />
        <Text style={styles.loadingText}>Circles</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {isAuthenticated ? (
        <WebViewWrapper 
          initialUrl={initialUrl} 
          onMessage={handleWebViewMessage}
          authToken={authToken}
          userData={userData}
        />
      ) : (
        <AuthScreen 
          onAuthenticated={handleAuthenticated} 
          apiBaseUrl={API_BASE_URL} 
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
  },
});

export default App;