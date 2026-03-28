import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions,
  Linking, ScrollView, Image,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

// ============================================================
// AR VIEWER — Affiche le plat en 3D/AR sur la table du client
// Utilise <model-viewer> de Google pour WebXR + iOS Quick Look
// ============================================================

export default function ARViewerScreen({ navigation, route }: any) {
  const { dish } = route?.params || {};
  const [arActive, setArActive] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  if (!dish) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Plat introuvable</Text>
        <TouchableOpacity style={styles.btnBlue} onPress={() => navigation.goBack()}>
          <Text style={styles.btnBlueText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const modelUrl = dish.modelUrl || dish.model3d || '';
  const usdzUrl = dish.usdzUrl || '';
  const hasModel = !!modelUrl;
  const photos = dish.photos || [];
  const fmt = (v: number) => v?.toFixed(2).replace('.', ',') + ' €';

  // ============================================================
  // WEB — Injecter <model-viewer> via HTML
  // ============================================================
  if (Platform.OS === 'web') {
    const modelViewerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0/model-viewer.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
            font-family: -apple-system, sans-serif;
          }
          model-viewer {
            width: 100vw;
            height: 100vh;
            --poster-color: transparent;
          }
          model-viewer::part(default-ar-button) {
            bottom: 120px;
            background: #0047FF;
            border-radius: 16px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 700;
            color: white;
            border: none;
          }
          .no-model {
            color: white;
            text-align: center;
            padding: 40px;
          }
          .no-model h2 { font-size: 24px; margin-bottom: 8px; }
          .no-model p { opacity: 0.6; font-size: 14px; }
        </style>
      </head>
      <body>
        ${hasModel ? `
          <model-viewer
            src="${modelUrl}"
            ${usdzUrl ? `ios-src="${usdzUrl}"` : ''}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            camera-controls
            touch-action="pan-y"
            auto-rotate
            auto-rotate-delay="0"
            rotation-per-second="30deg"
            shadow-intensity="1.5"
            shadow-softness="1"
            exposure="1.2"
            environment-image="neutral"
            poster="${dish.img || ''}"
            loading="eager"
            reveal="auto"
            alt="${dish.name || 'Plat 3D'}"
          >
            <button slot="ar-button" style="
              background: #0047FF;
              color: white;
              border: none;
              border-radius: 16px;
              padding: 14px 28px;
              font-size: 16px;
              font-weight: 700;
              cursor: pointer;
              position: absolute;
              bottom: 24px;
              left: 50%;
              transform: translateX(-50%);
              box-shadow: 0 4px 20px rgba(0,71,255,0.4);
            ">
              📱 Voir sur ma table
            </button>
          </model-viewer>
        ` : `
          <div class="no-model">
            <h2>📷 Aperçu du plat</h2>
            <p>Modèle 3D en cours de génération</p>
          </div>
        `}
      </body>
      </html>
    `;

    return (
      <View style={styles.container}>
        {/* Model Viewer iframe */}
        <View style={styles.webViewContainer}>
          {hasModel ? (
            <iframe
              srcDoc={modelViewerHtml}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="xr-spatial-tracking; camera; gyroscope; accelerometer"
              allowFullScreen
            />
          ) : (
            // Fallback: 360 photo viewer quand pas de modèle 3D
            <View style={styles.fallbackViewer}>
              <Photo360Viewer photos={photos} fallbackImage={dish.img} />
            </View>
          )}
        </View>

        {/* HUD overlay */}
        <View style={styles.arHud}>
          <TouchableOpacity style={styles.arBack} onPress={() => navigation.goBack()}>
            <Text style={{ color: '#fff', fontSize: 14 }}>✕</Text>
          </TouchableOpacity>
          <View style={styles.arHudCenter}>
            <Text style={styles.arHudTitle}>{dish.name}</Text>
            <Text style={styles.arHudPrice}>{fmt(dish.price)}</Text>
          </View>
          <TouchableOpacity style={styles.arInfoBtn} onPress={() => setShowInfo(!showInfo)}>
            <Text style={{ color: '#fff', fontSize: 12 }}>ℹ</Text>
          </TouchableOpacity>
        </View>

        {/* Info panel */}
        {showInfo && (
          <View style={styles.infoPanel}>
            <Text style={styles.infoPanelName}>{dish.name}</Text>
            {dish.desc ? <Text style={styles.infoPanelDesc}>{dish.desc}</Text> : null}
            <View style={styles.infoPanelRow}>
              <Text style={styles.infoPanelPrice}>{fmt(dish.price)}</Text>
              {dish.cat ? (
                <View style={styles.infoPanelCat}>
                  <Text style={styles.infoPanelCatText}>{dish.cat}</Text>
                </View>
              ) : null}
            </View>
            {hasModel && (
              <View style={styles.arReadyBadge}>
                <View style={styles.arReadyDot} />
                <Text style={styles.arReadyText}>AR disponible — Appuyez "Voir sur ma table"</Text>
              </View>
            )}
            {!hasModel && photos.length > 0 && (
              <View style={styles.arReadyBadge}>
                <Text style={styles.arReadyText}>↻ Glissez pour tourner le plat</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // ============================================================
  // NATIVE (React Native) — Ouvrir le modèle dans le viewer natif
  // ============================================================
  return (
    <View style={styles.container}>
      {/* Photo/model preview */}
      <View style={styles.nativePreview}>
        {photos.length > 0 ? (
          <Photo360Viewer photos={photos} fallbackImage={dish.img} />
        ) : dish.img ? (
          <Image source={{ uri: dish.img }} style={styles.nativeImage} resizeMode="cover" />
        ) : (
          <View style={styles.nativePlaceholder}>
            <Text style={{ fontSize: 64 }}>🍽</Text>
          </View>
        )}
      </View>

      {/* Top bar */}
      <View style={styles.arHud}>
        <TouchableOpacity style={styles.arBack} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 14 }}>✕</Text>
        </TouchableOpacity>
        <View style={styles.arHudCenter}>
          <Text style={styles.arHudTitle}>{dish.name}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Bottom info + AR button */}
      <View style={styles.nativeBottom}>
        <View style={styles.nativeInfo}>
          <Text style={styles.nativeName}>{dish.name}</Text>
          {dish.desc ? <Text style={styles.nativeDesc}>{dish.desc}</Text> : null}
          <Text style={styles.nativePrice}>{fmt(dish.price)}</Text>
        </View>

        {hasModel && (
          <TouchableOpacity
            style={styles.arLaunchBtn}
            onPress={() => {
              // Sur iOS: ouvre Quick Look avec USDZ
              // Sur Android: ouvre Scene Viewer avec GLB
              if (Platform.OS === 'ios' && usdzUrl) {
                Linking.openURL(usdzUrl);
              } else if (modelUrl) {
                const sceneViewerUrl = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_preferred&title=${encodeURIComponent(dish.name)}`;
                Linking.openURL(sceneViewerUrl);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.arLaunchText}>📱 Voir sur ma table en AR</Text>
          </TouchableOpacity>
        )}

        {!hasModel && (
          <View style={styles.arUnavailable}>
            <Text style={styles.arUnavailableText}>
              Modèle 3D en cours de génération...{'\n'}
              Revenez dans quelques minutes
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================
// COMPOSANT — Viewer 360° photos (fallback sans modèle 3D)
// ============================================================
function Photo360Viewer({ photos, fallbackImage }: { photos: string[]; fallbackImage?: string }) {
  const [index, setIndex] = useState(0);
  const items = photos.length > 0 ? photos : fallbackImage ? [fallbackImage] : [];

  if (items.length === 0) {
    return (
      <View style={p360Styles.empty}>
        <Text style={{ fontSize: 64 }}>🍽</Text>
        <Text style={p360Styles.emptyText}>Aucun aperçu disponible</Text>
      </View>
    );
  }

  // Auto-rotate
  React.useEffect(() => {
    if (items.length < 2) return;
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % items.length);
    }, 250);
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <View style={p360Styles.container}>
      <Image
        source={{ uri: items[index] }}
        style={p360Styles.image}
        resizeMode="cover"
      />
      {items.length > 1 && (
        <View style={p360Styles.indicator}>
          <Text style={p360Styles.indicatorText}>
            ↻ {Math.round((index / items.length) * 360)}°
          </Text>
        </View>
      )}
    </View>
  );
}

const p360Styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  image: { width: '100%', height: '100%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 13 },
  indicator: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12,
  },
  indicatorText: {
    fontSize: 12, color: '#00E676', fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  errorText: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 100 },

  // Web model-viewer
  webViewContainer: { flex: 1 },
  fallbackViewer: { flex: 1 },

  // AR HUD
  arHud: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  arBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center',
  },
  arHudCenter: { flex: 1, alignItems: 'center' },
  arHudTitle: { fontSize: 16, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  arHudPrice: { fontSize: 20, fontWeight: '800', color: '#00E676', marginTop: 2 },
  arInfoBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center',
  },

  // Info panel
  infoPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
    paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  infoPanelName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  infoPanelDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10, lineHeight: 18 },
  infoPanelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  infoPanelPrice: { fontSize: 24, fontWeight: '800', color: COLORS.brand },
  infoPanelCat: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  infoPanelCatText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  arReadyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8,
  },
  arReadyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E676' },
  arReadyText: { fontSize: 12, color: '#00E676', fontWeight: '500' },

  // Native
  nativePreview: { flex: 1 },
  nativeImage: { width: '100%', height: '100%' },
  nativePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  nativeBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  nativeInfo: { marginBottom: 16 },
  nativeName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  nativeDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  nativePrice: { fontSize: 24, fontWeight: '800', color: COLORS.brand },
  arLaunchBtn: {
    paddingVertical: 16, borderRadius: 16,
    backgroundColor: COLORS.brand, alignItems: 'center',
    shadowColor: COLORS.brand, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12,
  },
  arLaunchText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  arUnavailable: {
    paddingVertical: 12, alignItems: 'center',
  },
  arUnavailableText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 18 },

  // Shared buttons
  btnBlue: {
    padding: 14, borderRadius: RADIUS.md,
    backgroundColor: COLORS.brand, alignItems: 'center', margin: 20,
  },
  btnBlueText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
