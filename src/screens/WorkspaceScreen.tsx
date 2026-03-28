import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { Storage } from '../services/storage';
import { Client, Dish } from '../types';

const { width } = Dimensions.get('window');
const fmt = (v: number) => v.toFixed(2).replace('.', ',') + ' €';

export default function WorkspaceScreen({ navigation, route }: any) {
  const clientId = route?.params?.clientId;
  const [client, setClient] = useState<Client | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tab, setTab] = useState<'menu' | 'brand' | 'qr' | 'settings'>('menu');

  const load = async () => {
    const cls = await Storage.getClients();
    setClient(cls.find(c => c.id === clientId) || null);
    setDishes(await Storage.getDishes(clientId));
  };

  useFocusEffect(useCallback(() => { load(); }, [clientId]));

  const pickImage = async (type: 'logo' | 'banner') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [4, 1],
      quality: 0.9,
    });
    if (!result.canceled && client) {
      const cls = await Storage.getClients();
      const idx = cls.findIndex(c => c.id === clientId);
      if (idx >= 0) {
        cls[idx][type] = result.assets[0].uri;
        await Storage.saveClients(cls);
        setClient({ ...client, [type]: result.assets[0].uri });
      }
    }
  };

  if (!client) return <View style={styles.container}><Text>Chargement...</Text></View>;

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'menu', label: 'Menu 3D' },
    { key: 'brand', label: 'Branding' },
    { key: 'qr', label: 'QR Codes' },
    { key: 'settings', label: 'Paramètres' },
  ];

  return (
    <View style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>{client.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => navigation.navigate('Scanner', { clientId })}
        >
          <Text style={styles.scanBtnText}>+ Scanner un plat</Text>
        </TouchableOpacity>
      </View>

      {/* Banner */}
      {client.banner ? (
        <Image source={{ uri: client.banner }} style={styles.banner} />
      ) : (
        <View style={[styles.banner, { backgroundColor: client.color + '10' }]} />
      )}

      {/* Header with logo */}
      <View style={styles.headerRow}>
        {client.logo ? (
          <Image source={{ uri: client.logo }} style={styles.wsLogo} />
        ) : (
          <View style={[styles.wsLogoPlaceholder, { backgroundColor: client.color + '20' }]}>
            <Text style={[styles.wsLogoLetter, { color: client.color }]}>{client.name[0]}</Text>
          </View>
        )}
        <View>
          <Text style={styles.wsName}>{client.name}</Text>
          <Text style={styles.wsSub}>{client.sub}</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {/* MENU TAB */}
        {tab === 'menu' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plats ({dishes.length})</Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('Scanner', { clientId })}
              >
                <Text style={styles.primaryBtnText}>+ Scanner</Text>
              </TouchableOpacity>
            </View>
            {dishes.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Aucun plat scanné</Text>
                <Text style={styles.emptyDesc}>Utilisez le scanner pour créer des modèles 3D</Text>
              </View>
            ) : (
              dishes.map(d => (
                <TouchableOpacity key={d.id} style={styles.dishRow} activeOpacity={0.7}>
                  <Image source={{ uri: d.img }} style={styles.dishImg} />
                  <View style={styles.dishInfo}>
                    <Text style={styles.dishName}>{d.name}</Text>
                    <Text style={styles.dishMeta}>
                      {d.cat} · {(d.vertices || 0).toLocaleString()} vertices
                    </Text>
                  </View>
                  <Text style={styles.dishPrice}>{fmt(d.price)}</Text>
                  <View style={styles.dishBadge}>
                    <Text style={styles.dishBadgeText}>3D</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* BRANDING TAB */}
        {tab === 'brand' && (
          <View style={styles.brandSection}>
            <Text style={styles.brandTitle}>Branding du client</Text>

            <Text style={styles.fieldLabel}>Logo (512×512)</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('logo')}>
              {client.logo ? (
                <Image source={{ uri: client.logo }} style={styles.uploadPreview} />
              ) : (
                <Text style={styles.uploadPlus}>+ Logo</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Bannière (1920×480)</Text>
            <TouchableOpacity style={styles.uploadBoxWide} onPress={() => pickImage('banner')}>
              {client.banner ? (
                <Image source={{ uri: client.banner }} style={styles.uploadPreviewWide} />
              ) : (
                <Text style={styles.uploadPlus}>+ Bannière</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* QR TAB */}
        {tab === 'qr' && (
          <View style={{ padding: 20 }}>
            {dishes.length === 0 ? (
              <Text style={styles.emptyDesc}>Scannez des plats d'abord</Text>
            ) : (
              dishes.map(d => (
                <View key={d.id} style={styles.qrCard}>
                  <Text style={styles.qrName}>{d.name}</Text>
                  <Text style={styles.qrUrl}>menu3d.app/ar/{clientId}/{d.id}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <View style={{ padding: 20 }}>
            <Text style={styles.fieldLabel}>Nom du restaurant</Text>
            <View style={styles.inputFake}><Text style={styles.inputText}>{client.name}</Text></View>
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Statut</Text>
            <View style={styles.inputFake}><Text style={styles.inputText}>{client.status}</Text></View>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 20 }]}
              onPress={() => navigation.navigate('ClientPreview', { clientId })}
            >
              <Text style={styles.primaryBtnText}>👁 Prévisualiser le menu client</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 10 : 10, paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,.9)', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  backBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.text2 },
  topTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  scanBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.sm, backgroundColor: COLORS.brand },
  scanBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  banner: { width: '100%', height: 120, backgroundColor: COLORS.bg2 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, backgroundColor: COLORS.white,
  },
  wsLogo: { width: 48, height: 48, borderRadius: RADIUS.md, marginTop: -24, borderWidth: 2, borderColor: COLORS.white, ...SHADOWS.md },
  wsLogoPlaceholder: { width: 48, height: 48, borderRadius: RADIUS.md, marginTop: -24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white },
  wsLogoLetter: { fontSize: 18, fontWeight: '700' },
  wsName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  wsSub: { fontSize: 11, color: COLORS.text3, marginTop: 1 },
  tabBar: {
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    maxHeight: 44,
  },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.brand },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.text3 },
  tabTextActive: { color: COLORS.brand },
  content: { flex: 1 },
  section: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  primaryBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.brand, ...SHADOWS.brand,
  },
  primaryBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text3, marginBottom: 4 },
  emptyDesc: { fontSize: 12, color: COLORS.text4 },
  dishRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm,
  },
  dishImg: { width: 48, height: 48, borderRadius: RADIUS.sm },
  dishInfo: { flex: 1 },
  dishName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  dishMeta: { fontSize: 10, color: COLORS.text3, marginTop: 1 },
  dishPrice: { fontSize: 15, fontWeight: '700', color: COLORS.brand, marginRight: 6 },
  dishBadge: { backgroundColor: COLORS.brandLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs },
  dishBadgeText: { fontSize: 9, fontWeight: '600', color: COLORS.brand },
  brandSection: { padding: 20 },
  brandTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  fieldLabel: { fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 4 },
  uploadBox: {
    width: 80, height: 80, borderRadius: RADIUS.md, borderWidth: 2, borderStyle: 'dashed',
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, overflow: 'hidden',
  },
  uploadPreview: { width: 80, height: 80 },
  uploadBoxWide: {
    width: '100%', height: 80, borderRadius: RADIUS.md, borderWidth: 2, borderStyle: 'dashed',
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, overflow: 'hidden',
  },
  uploadPreviewWide: { width: '100%', height: 80 },
  uploadPlus: { fontSize: 14, color: COLORS.text4, fontWeight: '600' },
  qrCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 16,
    borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 10,
    alignItems: 'center',
  },
  qrName: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  qrUrl: { fontSize: 10, color: COLORS.text3, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  inputFake: { backgroundColor: COLORS.surface2, padding: 12, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  inputText: { fontSize: 13, color: COLORS.text },
});
