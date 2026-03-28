import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS, SPACING, CATEGORIES } from '../constants/theme';
import { Storage } from '../services/storage';

export default function SaveDishScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { clientId, clientName, modelUrl, photoUri } = route.params;

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('plats');
  const [saving, setSaving] = useState(false);

  const cats = CATEGORIES.filter(c => c.id !== 'all');

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Donnez un nom a votre plat.');
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price))) {
      Alert.alert('Prix requis', 'Entrez un prix valide.');
      return;
    }

    setSaving(true);
    try {
      const dishes = await Storage.getDishes(clientId);
      const newId = dishes.length > 0 ? Math.max(...dishes.map(d => d.id)) + 1 : 1;

      await Storage.addDish(clientId, {
        id: newId,
        name: name.trim(),
        desc: desc.trim(),
        price: parseFloat(price),
        cat: category,
        size: '',
        real: '',
        img: photoUri || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=500&fit=crop',
        model: modelUrl || '',
        opts: [],
        scans: 0,
        vertices: 0,
      });

      // Go back to workspace
      navigation.navigate('Workspace', { clientId, clientName });
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le plat.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.white }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enregistrer le plat</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <Text style={styles.label}>Nom du plat *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Pizza Truffe & Burrata"
            placeholderTextColor={COLORS.text3}
            value={name}
            onChangeText={setName}
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Ingredients, preparation..."
            placeholderTextColor={COLORS.text3}
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={3}
          />

          {/* Price */}
          <Text style={styles.label}>Prix (EUR) *</Text>
          <TextInput
            style={styles.input}
            placeholder="18.90"
            placeholderTextColor={COLORS.text3}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />

          {/* Category */}
          <Text style={styles.label}>Categorie</Text>
          <View style={styles.catGrid}>
            {cats.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.catChip,
                  category === c.id && styles.catChipActive,
                ]}
                onPress={() => setCategory(c.id)}
              >
                <Text style={styles.catIcon}>{c.icon}</Text>
                <Text style={[
                  styles.catLabel,
                  category === c.id && styles.catLabelActive,
                ]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Model info */}
          {modelUrl ? (
            <View style={styles.modelInfo}>
              <Text style={styles.modelInfoIcon}>✓</Text>
              <Text style={styles.modelInfoText}>Modele 3D attache</Text>
            </View>
          ) : (
            <View style={[styles.modelInfo, { backgroundColor: COLORS.yellowLight }]}>
              <Text style={styles.modelInfoIcon}>!</Text>
              <Text style={[styles.modelInfoText, { color: COLORS.yellow }]}>Aucun modele 3D</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Save button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            activeOpacity={0.8}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text2,
    marginBottom: 6,
    marginTop: 20,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  catIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text2,
  },
  catLabelActive: {
    color: COLORS.brand,
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    borderRadius: RADIUS.md,
    padding: 14,
    marginTop: 24,
  },
  modelInfoIcon: {
    fontSize: 18,
    marginRight: 10,
    color: COLORS.green,
    fontWeight: '700',
  },
  modelInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.xl,
    paddingBottom: 32,
    backgroundColor: COLORS.white,
  },
  saveBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.brand,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
