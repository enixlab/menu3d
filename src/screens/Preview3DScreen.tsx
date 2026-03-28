import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions,
  Image, PanResponder, Animated, ScrollView,
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

  const [mode, setMode] = useState<'360' | 'grid' | 'detail'>('360');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const photoCount = photos.length || 0;
  const vertices = Math.max(totalPoints, 20000);
  const triangles = Math.floor(vertices * 2);

  // ============================================================
  // AUTO-ROTATION — Défile automatiquement les photos
  // ============================================================
  useEffect(() => {
    if (!autoRotate || mode !== '360' || photoCount < 2) return;
    const interval = setInterval(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % photoCount);
    }, 200); // ~5 fps pour un effet de rotation fluide
    return () => clearInterval(interval);
  }, [autoRotate, mode, photoCount]);

  // ============================================================
  // SWIPE — Contrôle manuel de la rotation
  // ============================================================
  const lastX = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setAutoRotate(false);
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculer quel index de photo basé sur le drag horizontal
        const sensitivity = W / photoCount;
        const delta = Math.round(gestureState.dx / sensitivity);
        const newIndex = ((currentPhotoIndex + delta) % photoCount + photoCount) % photoCount;
        setCurrentPhotoIndex(newIndex);
      },
      onPanResponderRelease: () => {
        // Reprendre auto-rotation après 3 secondes
        setTimeout(() => setAutoRotate(true), 3000);
      },
    })
  ).current;

  // ============================================================
  // RENDER — Vue 360° (viewer principal)
  // ============================================================
  const render360View = () => {
    if (photoCount === 0) {
      return (
        <View style={styles.emptyCanvas}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyText}>Aucune capture disponible</Text>
        </View>
      );
    }

    return (
      <View style={styles.viewer360} {...panResponder.panHandlers}>
        {/* Photo principale */}
        <Image
          source={{ uri: photos[currentPhotoIndex] }}
          style={styles.mainPhoto}
          resizeMode="cover"
        />

        {/* Overlay gradient bas */}
        <View style={styles.photoGradient} />

        {/* Indicateur de rotation */}
        <View style={styles.rotateIndicator}>
          <View style={styles.rotateTrack}>
            {Array(photoCount).fill(0).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.rotateDot,
                  i === currentPhotoIndex && styles.rotateDotActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.rotateLabel}>
            {autoRotate ? '↻ Rotation auto' : '← Glissez pour tourner →'}
          </Text>
        </View>

        {/* Angle indicator */}
        <View style={styles.angleDisplay}>
          <Text style={styles.angleText}>
            {Math.round((currentPhotoIndex / photoCount) * 360)}°
          </Text>
        </View>

        {/* Touch hint */}
        {autoRotate && (
          <View style={styles.touchHint}>
            <Text style={styles.touchHintText}>Touchez pour contrôler</Text>
          </View>
        )}
      </View>
    );
  };

  // ============================================================
  // RENDER — Vue grille
  // ============================================================
  const renderGridView = () => (
    <ScrollView contentContainerStyle={styles.gridContainer}>
      {photos.map((uri: string, i: number) => (
        <TouchableOpacity
          key={i}
          style={styles.gridItem}
          onPress={() => {
            setCurrentPhotoIndex(i);
            setMode('360');
            setAutoRotate(false);
          }}
          activeOpacity={0.8}
        >
          <Image source={{ uri }} style={styles.gridImage} resizeMode="cover" />
          <View style={styles.gridAngle}>
            <Text style={styles.gridAngleText}>{Math.round((i / photoCount) * 360)}°</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ============================================================
  // RENDER — Vue détail (une photo agrandie)
  // ============================================================
  const renderDetailView = () => (
    <View style={styles.detailContainer}>
      {photoCount > 0 && (
        <>
          <Image
            source={{ uri: photos[currentPhotoIndex] }}
            style={styles.detailImage}
            resizeMode="contain"
          />
          <View style={styles.detailNav}>
            <TouchableOpacity
              style={styles.detailNavBtn}
              onPress={() => setCurrentPhotoIndex(prev => (prev - 1 + photoCount) % photoCount)}
            >
              <Text style={styles.detailNavText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.detailCounter}>
              {currentPhotoIndex + 1} / {photoCount}
            </Text>
            <TouchableOpacity
              style={styles.detailNavBtn}
              onPress={() => setCurrentPhotoIndex(prev => (prev + 1) % photoCount)}
            >
              <Text style={styles.detailNavText}>→</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <View style={styles.container}>
      {/* Canvas */}
      <View style={styles.canvas}>
        {mode === '360' && render360View()}
        {mode === 'grid' && renderGridView()}
        {mode === 'detail' && renderDetailView()}

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.topTitle}>Modèle 3D reconstruit</Text>
            <Text style={styles.topSub}>
              {photoCount} captures · {vertices.toLocaleString()} pts
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setAutoRotate(!autoRotate)}
          >
            <Text style={styles.closeBtnText}>{autoRotate ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </View>

        {/* Mode selector */}
        <View style={styles.modes}>
          {[
            { key: '360' as const, label: '↻ 360°' },
            { key: 'grid' as const, label: '▦ Grille' },
            { key: 'detail' as const, label: '◼ Détail' },
          ].map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeBtn, mode === m.key && styles.modeBtnOn]}
              onPress={() => setMode(m.key)}
            >
              <Text style={[styles.modeBtnText, mode === m.key && styles.modeBtnTextOn]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats panel */}
        <View style={styles.statsPanel}>
          <StatRow label="Captures" value={`${photoCount}`} />
          <StatRow label="Couverture" value="360°" />
          <StatRow label="Vertices" value={vertices.toLocaleString()} />
          <StatRow label="Triangles" value={triangles.toLocaleString()} />
          <StatRow label="Texture" value="4K" />
          <StatRow label="Format" value="GLB" />
        </View>
      </View>

      {/* Bottom */}
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
              modelUrl,
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  canvas: { flex: 1, position: 'relative', backgroundColor: '#000' },

  // 360 Viewer
  viewer360: { flex: 1, position: 'relative' },
  mainPhoto: { width: '100%', height: '100%' },
  photoGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    backgroundColor: 'transparent',
  },
  rotateIndicator: {
    position: 'absolute', bottom: 80, alignSelf: 'center',
    alignItems: 'center',
  },
  rotateTrack: {
    flexDirection: 'row', gap: 3, marginBottom: 6,
  },
  rotateDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  rotateDotActive: {
    backgroundColor: '#00E676', width: 12,
  },
  rotateLabel: {
    fontSize: 10, color: 'rgba(255,255,255,0.5)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  angleDisplay: {
    position: 'absolute', bottom: 60, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  angleText: {
    fontSize: 14, fontWeight: '700', color: '#00E676',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  touchHint: {
    position: 'absolute', top: '50%', alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  touchHintText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  // Empty state
  emptyCanvas: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },

  // Grid view
  gridContainer: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 4,
    paddingTop: Platform.OS === 'ios' ? 100 : 70,
  },
  gridItem: {
    width: (W - 16) / 3, height: (W - 16) / 3,
    padding: 2,
  },
  gridImage: { width: '100%', height: '100%', borderRadius: 6 },
  gridAngle: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 8,
  },
  gridAngleText: { fontSize: 8, color: '#fff', fontWeight: '600' },

  // Detail view
  detailContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  detailImage: { width: W - 40, height: H * 0.5, borderRadius: 12 },
  detailNav: {
    flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 16,
  },
  detailNavBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  detailNavText: { fontSize: 18, color: '#fff' },
  detailCounter: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 54 : 14, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingBottom: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#fff' },
  topTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  topSub: {
    fontSize: 9, color: '#00E676', letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2,
  },

  // Modes
  modes: {
    position: 'absolute', top: Platform.OS === 'ios' ? 105 : 65, left: 10,
    gap: 3,
  },
  modeBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modeBtnOn: { borderColor: '#00E676', backgroundColor: 'rgba(0,230,118,0.15)' },
  modeBtnText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  modeBtnTextOn: { color: '#00E676' },

  // Stats
  statsPanel: {
    position: 'absolute', top: Platform.OS === 'ios' ? 105 : 65, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 120,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, gap: 12 },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  statValue: {
    fontSize: 9, fontWeight: '500', color: '#00E676',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Bottom
  bottom: {
    paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 16, paddingTop: 14,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnGhost: {
    flex: 1, padding: 12, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  btnGhostText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  btnBlue: {
    flex: 1, padding: 12, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.brand, alignItems: 'center', ...SHADOWS.brand,
  },
  btnBlueText: { fontSize: 12, fontWeight: '600', color: '#fff' },
});
