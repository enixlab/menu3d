import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

export default function Preview3DScreen({ navigation, route }: any) {
  const {
    clientId,
    totalPoints = 50000,
    modelUrl = '',
    photos = [],
  } = route?.params || {};

  const vertices = Math.max(totalPoints, 20000);
  const triangles = Math.floor(vertices * 2);
  const hasModel = !!modelUrl && modelUrl !== 'demo://model3d';

  // Utiliser un modèle démo si pas de vrai modèle
  const displayModelUrl = hasModel
    ? modelUrl
    : 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

  // ============================================================
  // HTML model-viewer — rendu 3D interactif natif
  // ============================================================
  const modelViewerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0/model-viewer.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:#0a0a0a;font-family:-apple-system,sans-serif}
    model-viewer{
      width:100vw;
      height:100vh;
      --poster-color:transparent;
      --progress-bar-color:#0047FF;
    }
    .hotspot{
      background:rgba(0,71,255,0.9);
      border-radius:20px;
      padding:6px 12px;
      font-size:11px;
      color:white;
      font-weight:600;
      pointer-events:none;
      white-space:nowrap;
    }
    .controls{
      position:fixed;
      bottom:20px;
      left:50%;
      transform:translateX(-50%);
      display:flex;
      gap:8px;
      z-index:100;
    }
    .ctrl-btn{
      background:rgba(255,255,255,0.12);
      backdrop-filter:blur(10px);
      border:1px solid rgba(255,255,255,0.15);
      color:white;
      border-radius:12px;
      padding:10px 16px;
      font-size:12px;
      font-weight:600;
      cursor:pointer;
      transition:all 0.2s;
    }
    .ctrl-btn:hover,.ctrl-btn.active{
      background:rgba(0,71,255,0.8);
      border-color:#0047FF;
    }
    .stats{
      position:fixed;
      top:80px;
      right:12px;
      background:rgba(0,0,0,0.7);
      backdrop-filter:blur(10px);
      border:1px solid rgba(255,255,255,0.08);
      border-radius:12px;
      padding:10px 14px;
      z-index:100;
    }
    .stat-row{display:flex;justify-content:space-between;gap:16px;padding:2px 0}
    .stat-label{font-size:9px;color:rgba(255,255,255,0.4)}
    .stat-value{font-size:9px;color:#00E676;font-weight:600;font-family:monospace}
    .hint{
      position:fixed;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      color:rgba(255,255,255,0.4);
      font-size:13px;
      pointer-events:none;
      animation:fadeOut 3s forwards;
      animation-delay:2s;
    }
    @keyframes fadeOut{to{opacity:0}}
    .ar-badge{
      position:fixed;
      bottom:80px;
      left:50%;
      transform:translateX(-50%);
      background:rgba(0,230,118,0.15);
      border:1px solid rgba(0,230,118,0.3);
      border-radius:20px;
      padding:6px 16px;
      display:flex;
      align-items:center;
      gap:6px;
      z-index:100;
    }
    .ar-dot{width:6px;height:6px;border-radius:50%;background:#00E676}
    .ar-text{font-size:11px;color:#00E676;font-weight:500}
  </style>
</head>
<body>
  <model-viewer
    id="viewer"
    src="${displayModelUrl}"
    ar
    ar-modes="webxr scene-viewer quick-look"
    ar-scale="auto"
    camera-controls
    touch-action="pan-y"
    auto-rotate
    auto-rotate-delay="0"
    rotation-per-second="20deg"
    interaction-prompt="auto"
    shadow-intensity="1.8"
    shadow-softness="1"
    exposure="1.1"
    environment-image="neutral"
    camera-orbit="0deg 65deg 2.5m"
    min-camera-orbit="auto auto 1m"
    max-camera-orbit="auto auto 10m"
    field-of-view="30deg"
    loading="eager"
    reveal="auto"
    alt="Plat 3D scanné"
  >
    <button slot="ar-button" style="
      background:#0047FF;color:white;border:none;border-radius:16px;
      padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;
      position:absolute;bottom:24px;left:50%;transform:translateX(-50%);
      box-shadow:0 4px 24px rgba(0,71,255,0.5);z-index:200;
    ">📱 Voir sur ma table</button>
  </model-viewer>

  <div class="hint">↻ Glissez pour tourner · Pincez pour zoomer</div>

  <div class="stats">
    <div class="stat-row"><span class="stat-label">Vertices</span><span class="stat-value">${vertices.toLocaleString()}</span></div>
    <div class="stat-row"><span class="stat-label">Triangles</span><span class="stat-value">${triangles.toLocaleString()}</span></div>
    <div class="stat-row"><span class="stat-label">Texture</span><span class="stat-value">4K</span></div>
    <div class="stat-row"><span class="stat-label">Format</span><span class="stat-value">GLB</span></div>
    <div class="stat-row"><span class="stat-label">AR</span><span class="stat-value">Ready</span></div>
  </div>

  <div class="ar-badge">
    <div class="ar-dot"></div>
    <span class="ar-text">AR disponible</span>
  </div>

  <div class="controls">
    <button class="ctrl-btn active" onclick="toggleAutoRotate(this)">↻ Auto</button>
    <button class="ctrl-btn" onclick="resetCamera()">⊙ Reset</button>
    <button class="ctrl-btn" onclick="toggleWireframe(this)">◇ Wire</button>
  </div>

  <script>
    const viewer = document.getElementById('viewer');
    let wireMode = false;

    function toggleAutoRotate(btn) {
      viewer.autoRotate = !viewer.autoRotate;
      btn.classList.toggle('active');
    }

    function resetCamera() {
      viewer.cameraOrbit = '0deg 65deg 2.5m';
      viewer.fieldOfView = '30deg';
    }

    function toggleWireframe(btn) {
      wireMode = !wireMode;
      btn.classList.toggle('active');
      if (wireMode) {
        viewer.style.filter = 'invert(1) hue-rotate(180deg)';
        viewer.style.opacity = '0.8';
      } else {
        viewer.style.filter = 'none';
        viewer.style.opacity = '1';
      }
    }
  </script>
</body>
</html>`;

  return (
    <View style={styles.container}>
      {/* Model Viewer 3D */}
      {Platform.OS === 'web' ? (
        <iframe
          srcDoc={modelViewerHtml}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#0a0a0a',
          } as any}
          allow="xr-spatial-tracking; camera; gyroscope; accelerometer; fullscreen"
          allowFullScreen
        />
      ) : (
        <View style={styles.nativeFallback}>
          <Text style={styles.nativeText}>
            Ouvrez sur un navigateur web pour voir le modèle 3D interactif
          </Text>
        </View>
      )}

      {/* Top bar overlay */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 14 }}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.topTitle}>Modèle 3D</Text>
          <Text style={styles.topSub}>
            {hasModel ? 'Reconstruction IA' : 'Aperçu démo'} · {photos.length} captures
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Bottom actions */}
      <View style={styles.bottom}>
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Scanner', { clientId })}>
            <Text style={styles.btnGhostText}>↺ Re-scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnBlue}
            onPress={() => navigation.navigate('SaveDish', {
              clientId,
              vertices,
              triangles,
              modelUrl: displayModelUrl,
              photos,
            })}
          >
            <Text style={styles.btnBlueText}>Enregistrer →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  // Native fallback
  nativeFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  nativeText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center' },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 54 : 14, paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  topSub: {
    fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2,
  },

  // Bottom
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
    paddingTop: 14,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnGhost: {
    flex: 1, padding: 12, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  btnGhostText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  btnBlue: {
    flex: 1, padding: 12, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.brand, alignItems: 'center', ...SHADOWS.brand,
  },
  btnBlueText: { fontSize: 12, fontWeight: '600', color: '#fff' },
});
