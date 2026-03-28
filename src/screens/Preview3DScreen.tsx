import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import ModelViewer from '../components/ModelViewer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

const { width, height } = Dimensions.get('window');

function modelViewerHTML(modelUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #F4F7FF; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    model-viewer {
      width: 100vw;
      height: 100vh;
      --poster-color: transparent;
    }
    .ar-btn {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #0047FF;
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(0,71,255,0.25);
      z-index: 10;
    }
  </style>
</head>
<body>
  <model-viewer
    src="${modelUrl}"
    auto-rotate
    camera-controls
    touch-action="pan-y"
    ar
    ar-modes="webxr scene-viewer quick-look"
    shadow-intensity="1"
    shadow-softness="1"
    environment-image="neutral"
    exposure="1"
    style="background-color: #F4F7FF;"
  >
    <button slot="ar-button" class="ar-btn">📱 Voir sur ma table</button>
  </model-viewer>
</body>
</html>`;
}

export default function Preview3DScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { clientId, clientName, modelUrl, photoUri, dish } = route.params;

  // Use modelUrl from params or from dish object
  const glbUrl = modelUrl || dish?.model || dish?.modelUrl || dish?.model3d || '';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{dish?.name || 'Apercu 3D'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 3D Viewer */}
      <View style={styles.viewerContainer}>
        {glbUrl ? (
          <ModelViewer html={modelViewerHTML(glbUrl)} style={styles.webview} />
        ) : (
          <View style={styles.noModel}>
            <Text style={styles.noModelText}>Aucun modele 3D disponible</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {(clientId && (modelUrl || photoUri)) && (
          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SaveDish', {
              clientId,
              clientName,
              modelUrl: glbUrl,
              photoUri,
            })}
          >
            <Text style={styles.saveBtnText}>Enregistrer ce plat</Text>
          </TouchableOpacity>
        )}

        {dish && (
          <TouchableOpacity
            style={styles.arBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ARViewer', { dish, modelUrl: glbUrl })}
          >
            <Text style={styles.arBtnText}>📱 Vue AR</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  viewerContainer: {
    flex: 1,
    margin: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: '#F4F7FF',
    ...SHADOWS.md,
  },
  webview: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },
  noModel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noModelText: {
    fontSize: 16,
    color: COLORS.text3,
  },
  actions: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 32,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.brand,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  arBtn: {
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  arBtnText: {
    color: COLORS.brand,
    fontSize: 16,
    fontWeight: '700',
  },
});
