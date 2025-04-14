import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, StyleSheet, Linking, Platform } from 'react-native';
import WebViewWrapper from './WebViewWrapper';

const App: React.FC = () => {
  const [initialUrl, setInitialUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Handle deep linking
    const getInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        
        if (url) {
          // Handle deep link URL
          // Transform it to a format your web app can handle
          parseDeepLink(url);
        } else {
          // No deep link, use default URL
          setInitialUrl('http://localhost:5000');
        }
      } catch (e) {
        console.error('Error getting initial URL', e);
        setInitialUrl('http://localhost:5000');
      } finally {
        setIsLoading(false);
      }
    };

    // Set up a listener for URL events
    const handleLinkingChange = ({ url }: { url: string }) => {
      parseDeepLink(url);
    };

    const linkingSubscription = Linking.addEventListener('url', handleLinkingChange);
    getInitialURL();

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  const parseDeepLink = (url: string) => {
    // Example: circles://restaurant/123 -> /restaurant/123
    try {
      const scheme = Platform.OS === 'android' ? 'circles://' : 'circles://';
      let path = url.replace(scheme, '');
      
      // Set the WebView to load this path
      setInitialUrl(`http://localhost:5000/${path}`);
    } catch (error) {
      console.error('Error parsing deep link', error);
      setInitialUrl('http://localhost:5000');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Circles</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <WebViewWrapper initialUrl={initialUrl} />
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
  },
});

export default App;