import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { Reconstruction3D } from '../services/reconstruction3d';

const { width } = Dimensions.get('window');

type Step = 'pick' | 'processing' | 'done';

export default function UploadScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { clientId, clientName } = route.params;
  const [step, setStep] = useState<Step>('pick');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission requise', 'Autorisez l\'acces a la camera.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission requise', 'Autorisez l\'acces a la galerie.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
    }

    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    setPhotoUri(uri);
    startReconstruction(uri);
  };

  const startReconstruction = async (uri: string) => {
    setStep('processing');
    setProgress(0);
    setProgressLabel('Demarrage...');

    try {
      const glbUrl = await Reconstruction3D.fromPhoto(uri, (p, label) => {
        setProgress(p);
        setProgressLabel(label);
      });

      if (!glbUrl) throw new Error('Aucun modele genere');

      setModelUrl(glbUrl);
      setProgress(100);
      setProgressLabel('Modele 3D pret !');
      setStep('done');
    } catch (err: any) {
      Alert.alert(
        'Erreur de reconstruction',
        err.message || 'Le service est temporairement indisponible. Reessayez.',
        [
          { text: 'Reessayer', onPress: () => { setStep('pick'); setPhotoUri(null); } },
          { text: 'Annuler', onPress: () => navigation.goBack() },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau plat 3D</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* STEP: Pick photo */}
      {step === 'pick' && (
        <View style={styles.pickContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>3D</Text>
          </View>
          <Text style={styles.pickTitle}>Une seule photo suffit</Text>
          <Text style={styles.pickSubtitle}>
            Prenez ou choisissez une photo de votre plat.{'\n'}
            L'IA genere un modele 3D automatiquement.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.8}
            onPress={() => pickImage(true)}
          >
            <Text style={styles.primaryBtnIcon}>📷</Text>
            <Text style={styles.primaryBtnText}>Prendre une photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            onPress={() => pickImage(false)}
          >
            <Text style={styles.secondaryBtnIcon}>🖼️</Text>
            <Text style={styles.secondaryBtnText}>Choisir dans la galerie</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP: Processing */}
      {step === 'processing' && (
        <View style={styles.processingContainer}>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.preview} />
          )}

          <View style={styles.progressSection}>
            <ActivityIndicator size="large" color={COLORS.brand} style={{ marginBottom: 16 }} />
            <Text style={styles.progressLabel}>{progressLabel}</Text>

            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>

            <Text style={styles.progressHint}>
              Reconstruction 3D en cours...{'\n'}
              Cela peut prendre 1 a 2 minutes.
            </Text>
          </View>
        </View>
      )}

      {/* STEP: Done */}
      {step === 'done' && (
        <View style={styles.doneContainer}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>Modele 3D genere !</Text>
          <Text style={styles.doneSubtitle}>Votre plat est pret en 3D et AR</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Preview3D', {
              clientId,
              clientName,
              modelUrl,
              photoUri,
            })}
          >
            <Text style={styles.primaryBtnText}>Voir en 3D</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SaveDish', {
              clientId,
              clientName,
              modelUrl,
              photoUri,
            })}
          >
            <Text style={styles.secondaryBtnText}>Enregistrer le plat</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  // PICK
  pickContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.brand,
  },
  pickTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  pickSubtitle: {
    fontSize: 15,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 12,
    ...SHADOWS.brand,
  },
  primaryBtnIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 12,
  },
  secondaryBtnIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },

  // PROCESSING
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingTop: 20,
  },
  preview: {
    width: width - 80,
    height: width - 80,
    borderRadius: RADIUS.xl,
    marginBottom: 30,
    backgroundColor: COLORS.bg,
  },
  progressSection: {
    alignItems: 'center',
    width: '100%',
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.bg2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.full,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brand,
    marginTop: 8,
  },
  progressHint: {
    fontSize: 13,
    color: COLORS.text3,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },

  // DONE
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkIcon: {
    fontSize: 36,
    color: COLORS.green,
    fontWeight: '700',
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  doneSubtitle: {
    fontSize: 15,
    color: COLORS.text2,
    marginBottom: 40,
  },
});
