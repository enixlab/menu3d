import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Platform, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, SHADOWS, CATEGORIES } from '../constants/theme';
import { Storage } from '../services/storage';
import { Client, Dish, CartItem } from '../types';

const { width } = Dimensions.get('window');
const numCols = width >= 768 ? 3 : 2;
const cardWidth = (width - 40 - (numCols - 1) * 10) / numCols;
const fmt = (v: number) => v.toFixed(2).replace('.', ',') + ' €';

export default function ClientMenuScreen({ navigation, route }: any) {
  const clientId = route?.params?.clientId;
  const [client, setClient] = useState<Client | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cat, setCat] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);

  const load = async () => {
    const cls = await Storage.getClients();
    setClient(cls.find(c => c.id === clientId) || null);
    setDishes(await Storage.getDishes(clientId));
  };

  useFocusEffect(useCallback(() => { load(); }, [clientId]));

  const filtered = cat === 'all' ? dishes : dishes.filter(d => d.cat === cat);
  const cartTotal = cart.reduce((s, i) => s + i.total, 0);

  if (!client) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          {client.logo ? (
            <Image source={{ uri: client.logo }} style={styles.logoImg} />
          ) : (
            <View style={[styles.logoPh, { backgroundColor: client.color + '20' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: client.color }}>{client.name[0]}</Text>
            </View>
          )}
          <Text style={styles.restoName}>{client.name}</Text>
        </View>
        <View style={styles.tableBadge}>
          <Text style={styles.tableText}>TABLE 7</Text>
        </View>
      </View>

      {/* Banner */}
      {client.banner ? (
        <Image source={{ uri: client.banner }} style={styles.banner} />
      ) : (
        <View style={[styles.banner, { backgroundColor: client.color + '08' }]} />
      )}

      <ScrollView style={{ flex: 1 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Notre Carte</Text>
          <Text style={styles.heroSub}>Visualisez chaque plat en taille réelle sur votre table</Text>
          <View style={styles.arBadge}>
            <View style={styles.arDot} />
            <Text style={styles.arText}>Réalité augmentée disponible</Text>
          </View>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cats} contentContainerStyle={{ paddingHorizontal: 20, gap: 4 }}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catBtn, cat === c.id && styles.catBtnOn]}
              onPress={() => setCat(c.id)}
            >
              <Text style={[styles.catText, cat === c.id && styles.catTextOn]}>
                {c.icon} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Grid */}
        <View style={styles.grid}>
          {filtered.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[styles.card, { width: cardWidth }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ARViewer', { dish: d })}
            >
              <View style={styles.cardImgWrap}>
                <Image source={{ uri: d.img }} style={styles.cardImg} />
                <View style={styles.cardTag}>
                  <Text style={styles.cardTagText}>3D · AR</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{d.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{d.desc}</Text>
                <View style={styles.cardFoot}>
                  <Text style={styles.cardPrice}>{fmt(d.price)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Float cart */}
      {cart.length > 0 && (
        <View style={styles.floatCart}>
          <TouchableOpacity style={styles.floatCartBtn} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>{cart.length}</Text>
              </View>
              <Text style={styles.cartLabel}>Ma commande</Text>
            </View>
            <Text style={styles.cartTotal}>{fmt(cartTotal)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,.9)', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { width: 28, height: 28, borderRadius: 6 },
  logoPh: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  restoName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  tableBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 5,
    backgroundColor: COLORS.brandLight, borderWidth: 1, borderColor: COLORS.brand + '15',
  },
  tableText: { fontSize: 9, fontWeight: '600', color: COLORS.brand, letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  banner: { width: '100%', height: 140, backgroundColor: COLORS.bg2 },
  hero: { padding: 20, paddingBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  heroSub: { fontSize: 12, color: COLORS.text2, marginTop: 3 },
  arBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
    backgroundColor: COLORS.brandLight,
  },
  arDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.brand },
  arText: { fontSize: 9, fontWeight: '600', color: COLORS.brand },
  cats: { marginBottom: 10, maxHeight: 40 },
  catBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  catBtnOn: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  catText: { fontSize: 11, fontWeight: '600', color: COLORS.text3 },
  catTextOn: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm,
  },
  cardImgWrap: { position: 'relative' },
  cardImg: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.bg2 },
  cardTag: {
    position: 'absolute', top: 6, right: 6,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255,255,255,.9)', borderWidth: 1, borderColor: COLORS.borderLight,
  },
  cardTagText: { fontSize: 8, fontWeight: '600', color: COLORS.brand, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cardBody: { padding: 10 },
  cardName: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  cardDesc: { fontSize: 9, color: COLORS.text3, lineHeight: 12, marginBottom: 6 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice: { fontSize: 16, fontWeight: '700', color: COLORS.brand },
  floatCart: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
  },
  floatCartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.lg,
  },
  cartCount: {
    width: 22, height: 22, borderRadius: 6, backgroundColor: COLORS.brand,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  cartCountText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  cartLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  cartTotal: { fontSize: 15, fontWeight: '700', color: COLORS.brand },
});
