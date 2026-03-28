import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, SHADOWS, SPACING, CATEGORIES } from '../constants/theme';
import { Storage } from '../services/storage';
import { Dish } from '../types';

const { width } = Dimensions.get('window');

export default function ClientMenuScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { clientId, clientName } = route.params;
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCat, setActiveCat] = useState('all');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await Storage.getDishes(clientId);
        setDishes(data);
      })();
    }, [clientId])
  );

  const filtered = activeCat === 'all' ? dishes : dishes.filter(d => d.cat === activeCat);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{clientName}</Text>
          <Text style={styles.subtitle}>Menu interactif 3D</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catBar}
        contentContainerStyle={{ paddingHorizontal: SPACING.xl, gap: 8 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catChip, activeCat === cat.id && styles.catChipActive]}
            onPress={() => setActiveCat(cat.id)}
          >
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={[styles.catLabel, activeCat === cat.id && styles.catLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dish list */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((dish) => (
          <TouchableOpacity
            key={dish.id}
            style={styles.dishCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ARViewer', {
              dish,
              modelUrl: dish.model || (dish as any).modelUrl || (dish as any).model3d,
            })}
          >
            <Image source={{ uri: dish.img }} style={styles.dishImg} />
            <View style={styles.dishBody}>
              <Text style={styles.dishCat}>{CATEGORIES.find(c => c.id === dish.cat)?.label || dish.cat}</Text>
              <Text style={styles.dishName}>{dish.name}</Text>
              <Text style={styles.dishDesc} numberOfLines={2}>{dish.desc}</Text>
              <View style={styles.dishFooter}>
                <Text style={styles.dishPrice}>{dish.price.toFixed(2)} EUR</Text>
                {dish.model ? (
                  <View style={styles.arTag}>
                    <Text style={styles.arTagText}>3D / AR</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun plat dans cette categorie</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.brand,
    fontWeight: '600',
    marginTop: 2,
  },
  catBar: {
    maxHeight: 50,
    marginBottom: 12,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
  },
  catChipActive: {
    backgroundColor: COLORS.brand,
  },
  catIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text2,
  },
  catLabelActive: {
    color: COLORS.white,
  },
  list: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  dishCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  dishImg: {
    width: 110,
    height: 110,
    backgroundColor: COLORS.bg,
  },
  dishBody: {
    flex: 1,
    padding: 12,
  },
  dishCat: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brand,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  dishDesc: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 4,
    lineHeight: 17,
  },
  dishFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dishPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.brand,
  },
  arTag: {
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  arTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brand,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.text3,
  },
});
