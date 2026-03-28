import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { Storage } from '../services/storage';
import { Client, Dish } from '../types';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function DashboardScreen({ navigation }: any) {
  const [clients, setClients] = useState<Client[]>([]);
  const [dishCounts, setDishCounts] = useState<Record<string, number>>({});
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const cls = await Storage.getClients();
    setClients(cls);
    const dc: Record<string, number> = {};
    const sc: Record<string, number> = {};
    for (const c of cls) {
      const dishes = await Storage.getDishes(c.id);
      dc[c.id] = dishes.length;
      sc[c.id] = dishes.reduce((s, d) => s + (d.scans || 0), 0);
    }
    setDishCounts(dc);
    setScanCounts(sc);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalDishes = Object.values(dishCounts).reduce((a, b) => a + b, 0);
  const totalScans = Object.values(scanCounts).reduce((a, b) => a + b, 0);

  const addClient = async () => {
    const cls = await Storage.getClients();
    cls.push({
      id: 'c' + Date.now(),
      name: 'Nouveau Restaurant',
      sub: 'À configurer',
      color: '#0047FF',
      logo: '',
      banner: '',
      status: 'draft',
    });
    await Storage.saveClients(cls);
    load();
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>◆</Text>
          </View>
          <Text style={styles.logoText}>Menu<Text style={{ color: COLORS.brand }}>3D</Text></Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>A</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
      >
        {/* Metrics */}
        <View style={styles.metrics}>
          <MetricCard icon="👥" value={clients.filter(c => c.status === 'live').length.toString()} label="Clients actifs" trend="↑ 3" />
          <MetricCard icon="🍽" value={totalDishes.toString()} label="Plats 3D" trend="↑ 12%" />
          <MetricCard icon="📱" value={totalScans.toLocaleString()} label="Scans AR" trend="↑ 28%" />
          <MetricCard icon="📈" value="34.7%" label="Conversion" trend="↑ 5%" />
        </View>

        {/* Section header */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes Clients</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={addClient}>
            <Text style={styles.btnPrimaryText}>+ Nouveau</Text>
          </TouchableOpacity>
        </View>

        {/* Client cards */}
        <View style={styles.clientsGrid}>
          {clients.map(c => (
            <TouchableOpacity
              key={c.id}
              style={styles.clientCard}
              onPress={() => navigation.navigate('Workspace', { clientId: c.id })}
              activeOpacity={0.7}
            >
              <View style={styles.clientTop}>
                {c.logo ? (
                  <Image source={{ uri: c.logo }} style={styles.clientLogo} />
                ) : (
                  <View style={[styles.clientLogoPlaceholder, { backgroundColor: c.color + '15' }]}>
                    <Text style={[styles.clientLogoLetter, { color: c.color }]}>{c.name[0]}</Text>
                  </View>
                )}
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{c.name}</Text>
                  <Text style={styles.clientSub}>{c.sub}</Text>
                </View>
                <View style={[styles.badge, c.status === 'live' ? styles.badgeLive : styles.badgeDraft]}>
                  <Text style={[styles.badgeText, { color: c.status === 'live' ? COLORS.green : COLORS.yellow }]}>
                    {c.status === 'live' ? '● Live' : '◌ Draft'}
                  </Text>
                </View>
              </View>
              <View style={styles.clientStats}>
                <View style={styles.clientStat}>
                  <Text style={styles.clientStatVal}>{dishCounts[c.id] || 0}</Text>
                  <Text style={styles.clientStatLabel}>PLATS 3D</Text>
                </View>
                <View style={styles.clientStat}>
                  <Text style={styles.clientStatVal}>{scanCounts[c.id] || 0}</Text>
                  <Text style={styles.clientStatLabel}>SCANS AR</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Add client card */}
          <TouchableOpacity style={styles.addCard} onPress={addClient}>
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>Nouveau client</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function MetricCard({ icon, value, label, trend }: { icon: string; value: string; label: string; trend: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricTrend}>{trend}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,.85)',
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  logoIconText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  logoText: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  avatar: { width: 32, height: 32, borderRadius: 9, backgroundColor: COLORS.brandLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '700', color: COLORS.brand },
  scroll: { flex: 1 },

  metrics: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    padding: 16, paddingHorizontal: isTablet ? 32 : 20,
  },
  metric: {
    flex: 1, minWidth: (width - 60) / 2,
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding: 16, borderWidth: 1, borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  metricIcon: { fontSize: 20, marginBottom: 8 },
  metricVal: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  metricLabel: { fontSize: 11, color: COLORS.text3, marginTop: 4, fontWeight: '500' },
  metricTrend: { fontSize: 11, fontWeight: '600', color: COLORS.green, marginTop: 6 },

  section: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: isTablet ? 32 : 20, paddingTop: 16, paddingBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2 },
  btnPrimary: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.brand, ...SHADOWS.brand,
  },
  btnPrimaryText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  clientsGrid: { paddingHorizontal: isTablet ? 32 : 20 },
  clientCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 20,
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm,
    marginBottom: 12,
  },
  clientTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  clientLogo: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg2 },
  clientLogoPlaceholder: { width: 44, height: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  clientLogoLetter: { fontSize: 18, fontWeight: '700' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  clientSub: { fontSize: 11, color: COLORS.text3, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs },
  badgeLive: { backgroundColor: COLORS.greenLight },
  badgeDraft: { backgroundColor: COLORS.yellowLight },
  badgeText: { fontSize: 10, fontWeight: '600' },
  clientStats: {
    flexDirection: 'row', gap: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  clientStat: { flex: 1 },
  clientStatVal: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  clientStatLabel: { fontSize: 9, color: COLORS.text3, letterSpacing: 1, marginTop: 1 },

  addCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 20,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', minHeight: 120,
    marginBottom: 12,
  },
  addIcon: { fontSize: 28, color: COLORS.text3, marginBottom: 4 },
  addText: { fontSize: 12, fontWeight: '600', color: COLORS.text3 },
});
