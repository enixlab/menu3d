import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { Storage } from '../services/storage';
import { Client } from '../types';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [clients, setClients] = useState<Client[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await Storage.getClients();
    setClients(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const statusColors: Record<string, { bg: string; text: string }> = {
    live: { bg: COLORS.greenLight, text: COLORS.green },
    draft: { bg: COLORS.yellowLight, text: COLORS.yellow },
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>MENU3D</Text>
          <Text style={styles.subtitle}>Vos restaurants</Text>
        </View>
        <TouchableOpacity style={styles.menuBtn}>
          <Text style={styles.menuIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{clients.length}</Text>
          <Text style={styles.statLabel}>Restaurants</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{clients.filter(c => c.status === 'live').length}</Text>
          <Text style={styles.statLabel}>En ligne</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: COLORS.cyan }]}>3D</Text>
          <Text style={styles.statLabel}>& AR</Text>
        </View>
      </View>

      {/* Client List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
      >
        {clients.map((client) => {
          const st = statusColors[client.status] || statusColors.draft;
          return (
            <TouchableOpacity
              key={client.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Workspace', { clientId: client.id, clientName: client.name })}
            >
              <View style={[styles.cardIcon, { backgroundColor: client.color + '15' }]}>
                <Text style={[styles.cardIconText, { color: client.color }]}>
                  {client.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{client.name}</Text>
                <Text style={styles.cardSub}>{client.sub}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.text }]}>
                  {client.status === 'live' ? 'En ligne' : 'Brouillon'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Client Menu Preview */}
        {clients.filter(c => c.status === 'live').map((client) => (
          <TouchableOpacity
            key={`preview-${client.id}`}
            style={styles.previewBtn}
            onPress={() => navigation.navigate('ClientPreview', { clientId: client.id, clientName: client.name })}
          >
            <Text style={styles.previewBtnText}>Voir le menu client : {client.name}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.brand,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text2,
    marginTop: 2,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.brand,
  },
  menuIcon: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statNum: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.brand,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text2,
    marginTop: 2,
  },
  list: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIconText: {
    fontSize: 22,
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardSub: {
    fontSize: 13,
    color: COLORS.text2,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewBtn: {
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  previewBtnText: {
    color: COLORS.brand,
    fontWeight: '600',
    fontSize: 14,
  },
});
