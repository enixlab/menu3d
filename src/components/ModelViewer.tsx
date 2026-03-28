import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

interface ModelViewerProps {
  html: string;
  style?: any;
}

/**
 * Cross-platform model viewer wrapper.
 * Web: uses iframe (WebView doesn't exist on web)
 * Native: uses react-native-webview
 */
export default function ModelViewer({ html, style }: ModelViewerProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {/* @ts-ignore - iframe is valid on web */}
        <iframe
          srcDoc={html}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 'inherit',
          }}
          allow="xr-spatial-tracking; camera; gyroscope; accelerometer; fullscreen"
          allowFullScreen
        />
      </View>
    );
  }

  // Native: lazy load WebView
  const WebView = require('react-native-webview').WebView;
  return (
    <WebView
      source={{ html }}
      style={[styles.container, style]}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
