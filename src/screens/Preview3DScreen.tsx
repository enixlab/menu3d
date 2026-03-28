import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

export default function Preview3DScreen({ navigation, route }: any) {
  const { clientId, totalPoints = 15000, sectors = [] } = route?.params || {};
  const [mode, setMode] = useState<'points' | 'mesh' | 'textured' | 'wire'>('points');
  const vertices = Math.max(totalPoints, 20000);
  const triangles = Math.floor(vertices * 2);

  const modes: { key: typeof mode; label: string }[] = [
    { key: 'points', label: '● Points' },
    { key: 'mesh', label: '△ Mesh' },
    { key: 'textured', label: '◼ Texturé' },
    { key: 'wire', label: '◇ Wire' },
  ];

  return (
    <View style={styles.container}>
      {/* 3D Canvas placeholder */}
      <View style={styles.canvas}>
        <View style={styles.sphere}>
          {/* Simulated point cloud visualization */}
          {Array(60).fill(0).map((_, i) => {
            const angle = (i / 60) * Math.PI * 2;
            const r = 80 + Math.sin(i * 0.7) * 20;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r * 0.6;
            return (
              <View
                key={i}
                style={[styles.point, {
                  left: W / 2 + x - 2,
                  top: H / 3 + y - 2,
                  backgroundColor: mode === 'points' ? COLORS.brand : mode === 'mesh' ? '#888' : COLORS.brand,
                  opacity: mode === 'wire' ? 0.3 : 0.8,
                }]}
              />
            );
          })}
        </View>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.topTitle}>Modèle 3D reconstruit</Text>
            <Text style={styles.topSub}>{vertices.toLocaleString()} pts · {triangles.toLocaleString()} triangles</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Mode selector */}
        <View style={styles.modes}>
          {modes.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeBtn, mode === m.key && styles.modeBtnOn]}
              onPress={() => setMode(m.key)}
            >
              <Text style={[styles.modeBtnText, mode === m.key && styles.modeBtnTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats panel */}
        <View style={styles.statsPanel}>
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
            onPress={() => navigation.navigate('SaveDish', { clientId, vertices, triangles })}
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
  canvas: { flex: 1, position: 'relative', backgroundColor: COLORS.bg },
  sphere: { ...StyleSheet.absoluteFillObject },
  point: {
    position: 'absolute', width: 4, height: 4, borderRadius: 2,
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 54 : 14, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  closeBtnText: { fontSize: 14, color: COLORS.text2 },
  topTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  topSub: { fontSize: 9, color: COLORS.brand, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },
  modes: {
    position: 'absolute', top: Platform.OS === 'ios' ? 100 : 60, left: 10,
    gap: 3,
  },
  modeBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  modeBtnOn: { borderColor: COLORS.brand, backgroundColor: COLORS.brandLight },
  modeBtnText: { fontSize: 9, fontWeight: '600', color: COLORS.text3 },
  modeBtnTextOn: { color: COLORS.brand },
  statsPanel: {
    position: 'absolute', top: Platform.OS === 'ios' ? 100 : 60, right: 10,
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.md,
    minWidth: 120,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  statLabel: { fontSize: 9, color: COLORS.text3 },
  statValue: { fontSize: 9, fontWeight: '500', color: COLORS.brand, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
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
