import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { Storage } from '../services/storage';

export default function SaveDishScreen({ navigation, route }: any) {
  const { clientId, vertices = 0, triangles = 0 } = route?.params || {};
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('plats');
  const [diam, setDiam] = useState('');
  const [height, setHeight] = useState('');
  const [opts, setOpts] = useState<{ n: string; p: string }[]>([]);

  const addOpt = () => setOpts([...opts, { n: '', p: '' }]);

  const save = async () => {
    if (!name.trim()) return;
    const sz = diam ? `⌀ ${diam}cm` : height ? `${height}cm` : '—';
    await Storage.addDish(clientId, {
      id: Date.now(),
      name: name.trim(),
      desc: desc.trim(),
      price: parseFloat(price) || 0,
      cat,
      size: sz,
      real: sz,
      img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=500&fit=crop',
      model: 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb',
      opts: opts.filter(o => o.n.trim()).map(o => ({ n: o.n.trim(), p: parseFloat(o.p) || 0 })),
      scans: 0,
      vertices,
    });
    navigation.navigate('Workspace', { clientId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.topTitle}>Nouveau <Text style={{ color: COLORS.brand }}>Plat</Text></Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>✕ Annuler</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.form}>
        <View style={styles.modelInfo}>
          <View style={styles.modelIcon}>
            <Text style={{ fontSize: 20 }}>◆</Text>
          </View>
          <Text style={styles.modelTitle}>Scan 3D validé</Text>
          <Text style={styles.modelSub}>
            {vertices.toLocaleString()} vertices · {triangles.toLocaleString()} triangles
          </Text>
        </View>

        <Field label="Nom du plat" value={name} onChange={setName} placeholder="Pizza Truffe & Burrata" />
        <Field label="Description" value={desc} onChange={setDesc} placeholder="Ingrédients, préparation…" multiline />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Prix (€)" value={price} onChange={setPrice} placeholder="18.90" keyboard="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Catégorie</Text>
            <View style={styles.selectWrap}>
              {['entrees', 'plats', 'pizzas', 'burgers', 'desserts', 'boissons'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, cat === c && styles.catChipOn]}
                  onPress={() => setCat(c)}
                >
                  <Text style={[styles.catChipText, cat === c && styles.catChipTextOn]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Diamètre (cm)" value={diam} onChange={setDiam} placeholder="32" keyboard="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Hauteur (cm)" value={height} onChange={setHeight} placeholder="5" keyboard="decimal-pad" />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Personnalisations</Text>
        {opts.map((o, i) => (
          <View key={i} style={styles.optRow}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Option"
              placeholderTextColor={COLORS.text4}
              value={o.n}
              onChangeText={t => { const n = [...opts]; n[i].n = t; setOpts(n); }}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="€"
              placeholderTextColor={COLORS.text4}
              keyboardType="decimal-pad"
              value={o.p}
              onChangeText={t => { const n = [...opts]; n[i].p = t; setOpts(n); }}
            />
          </View>
        ))}
        <TouchableOpacity style={styles.addOptBtn} onPress={addOpt}>
          <Text style={styles.addOptText}>+ Ajouter option</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Publier sur le Menu</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboard }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text4}
        multiline={multiline}
        keyboardType={keyboard || 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 10 : 10, paddingBottom: 10,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cancelText: { fontSize: 12, fontWeight: '600', color: COLORS.text3 },
  scroll: { flex: 1 },
  form: { padding: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },
  modelInfo: { alignItems: 'center', marginBottom: 20 },
  modelIcon: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: COLORS.brandLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  modelTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  modelSub: { fontSize: 9, color: COLORS.brand, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },
  fieldLabel: {
    fontSize: 10, color: COLORS.text3, textTransform: 'uppercase',
    letterSpacing: 1.5, fontWeight: '600', marginBottom: 4,
  },
  input: {
    padding: 10, paddingHorizontal: 14, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
    fontSize: 13, color: COLORS.text,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  selectWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  catChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipOn: { backgroundColor: COLORS.brandLight, borderColor: COLORS.brand },
  catChipText: { fontSize: 9, fontWeight: '600', color: COLORS.text3 },
  catChipTextOn: { color: COLORS.brand },
  optRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  addOptBtn: {
    padding: 8, borderRadius: RADIUS.sm, alignItems: 'center',
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    marginTop: 6, marginBottom: 14,
  },
  addOptText: { fontSize: 11, fontWeight: '600', color: COLORS.text3 },
  saveBtn: {
    padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.brand,
    alignItems: 'center', ...SHADOWS.brand,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
