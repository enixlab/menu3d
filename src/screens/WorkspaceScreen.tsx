import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { Storage } from '../services/storage';
import { Dish } from '../types';

const { width } = Dimensions.get('window');
const CARD_W = (width - SPACING.xl * 2 - 12) / 2;

export default function WorkspaceScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { clientId, clientName } = route.params;
  const [dishes, setDishes] = useState<Dish[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await Storage.getDishes(clientId);
        setDishes(data);
      })();
    }, [clientId])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{clientName}</Text>
          <Text style={styles.subtitle}>{dishes.length} plats</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Dishes Grid */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.grid}>
          {dishes.map((dish) => (
            <TouchableOpacity
              key={dish.id}
              style={styles.dishCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Preview3D', {
                clientId,
                clientName,
                dish,
              })}
            >
              <Image source={{ uri: dish.img }} style={styles.dishImg} />
              <View style={styles.dishInfo}>
                <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
                <Text style={styles.dishPrice}>{dish.price.toFixed(2)} EUR</Text>
              </View>
              {dish.model ? (
                <View style={styles.badge3d}>
                  <Text style={styles.badge3dText}>3D</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {dishes.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>+</Text>
            <Text style={styles.emptyText}>Aucun plat encore</Text>
            <Text style={styles.emptySubtext}>Ajoutez votre premier plat en 3D</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Dish FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Upload', { clientId, clientName })}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>Ajouter un plat</Text>
      </TouchableOpacity>
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
    paddingBottom: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text2,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dishCard: {
    width: CARD_W,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  dishImg: {
    width: '100%',
    height: CARD_W,
    backgroundColor: COLORS.bg,
  },
  dishInfo: {
    padding: 10,
  },
  dishName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dishPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.brand,
    marginTop: 4,
  },
  badge3d: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badge3dText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    color: COLORS.text4,
    fontWeight: '300',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text2,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text3,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    ...SHADOWS.brand,
  },
  fabIcon: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '600',
    marginRight: 8,
  },
  fabText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
