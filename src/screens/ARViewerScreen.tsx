import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Share,
} from 'react-native';
import ModelViewer from '../components/ModelViewer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

const { width } = Dimensions.get('window');

function arViewerHTML(modelUrl: string, dishName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #FFFFFF; height: 100vh; overflow: hidden; }
    model-viewer {
      width: 100vw;
      height: 100vh;
      --poster-color: transparent;
    }
    .ar-btn {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #0047FF;
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 16px;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(0,71,255,0.3);
      white-space: nowrap;
    }
    .dish-label {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255,255,255,0.95);
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      white-space: nowrap;
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
    ar-scale="auto"
    shadow-intensity="1"
    shadow-softness="1"
    environment-image="neutral"
    exposure="1"
    style="background-color: #FFFFFF;"
  >
    <button slot="ar-button" class="ar-btn">📱 Voir sur ma table</button>
  </model-viewer>
  <div class="dish-label">${dishName}</div>
</body>
</html>`;
}

export default function ARViewerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { dish, modelUrl } = route.params;
  const glbUrl = modelUrl || dish?.model || dish?.modelUrl || dish?.model3d || '';
  const dishName = dish?.name || 'Plat 3D';

  const shareDish = async () => {
    try {
      await Share.share({
        message: `Decouvrez "${dishName}" en 3D et AR ! Scannez le QR code ou ouvrez ce lien pour voir le plat sur votre table.`,
        title: `${dishName} - Vue AR`,
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{dishName}</Text>
          {dish?.price && (
            <Text style={styles.headerPrice}>{dish.price.toFixed(2)} EUR</Text>
          )}
        </View>
        <TouchableOpacity onPress={shareDish} style={styles.shareBtn}>
          <Text style={styles.shareIcon}>↗</Text>
        </TouchableOpacity>
      </View>

      {/* AR Viewer */}
      <View style={styles.viewerContainer}>
        {glbUrl ? (
          <ModelViewer html={arViewerHTML(glbUrl, dishName)} style={styles.webview} />
        ) : (
          <View style={styles.noModel}>
            <Text style={styles.noModelIcon}>3D</Text>
            <Text style={styles.noModelText}>Modele 3D non disponible</Text>
          </View>
        )}
      </View>

      {/* Bottom info */}
      <View style={styles.bottomBar}>
        <Text style={styles.hint}>
          Touchez pour tourner  •  Pincez pour zoomer  •  AR sur mobile
        </Text>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.brand,
    marginTop: 2,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 20,
    color: COLORS.brand,
    fontWeight: '700',
  },
  viewerContainer: {
    flex: 1,
    margin: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  noModel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  noModelIcon: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.text4,
    marginBottom: 12,
  },
  noModelText: {
    fontSize: 16,
    color: COLORS.text3,
  },
  bottomBar: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 28,
    paddingTop: 8,
    alignItems: 'center',
  },
  hint: {
    fontSize: 12,
    color: COLORS.text3,
    textAlign: 'center',
  },
});
