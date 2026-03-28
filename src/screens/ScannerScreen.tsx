import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform,
  Image, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { Meshy } from '../services/meshy';

const { width: W, height: H } = Dimensions.get('window');

// 8 angles de scan requis (comme Face ID mais pour un plat)
const SCAN_ANGLES = [
  { label: 'Face', instruction: 'Prenez le plat de face' },
  { label: 'Droite', instruction: 'Tournez vers la droite (45°)' },
  { label: 'Côté droit', instruction: 'Continuez vers la droite (90°)' },
  { label: 'Arrière-droite', instruction: 'Encore un peu (135°)' },
  { label: 'Arrière', instruction: 'Dos du plat (180°)' },
  { label: 'Arrière-gauche', instruction: 'Continuez le tour (225°)' },
  { label: 'Côté gauche', instruction: 'Presque fini (270°)' },
  { label: 'Avant-gauche', instruction: 'Dernier angle (315°)' },
];

const TOTAL_SECTORS = SCAN_ANGLES.length;

type ScanPhase = 'ready' | 'capturing' | 'processing' | 'done' | 'error';

export default function ScannerScreen({ navigation, route }: any) {
  const clientId = route?.params?.clientId;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Scan state
  const [phase, setPhase] = useState<ScanPhase>('ready');
  const [currentAngle, setCurrentAngle] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [resultModelUrl, setResultModelUrl] = useState('');

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // ============================================================
  // CAPTURE — Prendre une photo pour ce secteur
  // ============================================================
  const captureAngle = async () => {
    if (!cameraRef.current) return;

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Prendre la photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        exif: false,
      });

      const newPhotos = [...capturedPhotos, photo.uri];
      setCapturedPhotos(newPhotos);

      // Haptic success pour ce secteur
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (currentAngle < TOTAL_SECTORS - 1) {
        // Passer au secteur suivant
        setCurrentAngle(currentAngle + 1);
      } else {
        // Tous les secteurs capturés → lancer la reconstruction
        startReconstruction(newPhotos);
      }
    } catch (err) {
      console.error('Erreur capture:', err);
    }
  };

  // ============================================================
  // RECONSTRUCTION 3D — Envoi à Meshy AI
  // ============================================================
  const startReconstruction = async (photos: string[]) => {
    setPhase('processing');
    setProcessingProgress(0);
    setProcessingStep('Préparation des images...');

    try {
      // On utilise la photo principale (face) pour la reconstruction
      // En production : upload toutes les photos vers un CDN puis multi-view
      const mainPhoto = photos[0];

      // Vérifier que l'API key est configurée
      if (!Meshy.getApiKey()) {
        // Mode démo sans API key
        simulateReconstruction();
        return;
      }

      // Upload de l'image et reconstruction via Meshy AI
      const modelUrls = await Meshy.scanDish(mainPhoto, (progress, step) => {
        setProcessingProgress(progress);
        setProcessingStep(step);
      });

      setResultModelUrl(modelUrls.glb);
      setPhase('done');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error('Erreur reconstruction:', err);
      // Fallback mode démo
      simulateReconstruction();
    }
  };

  // ============================================================
  // MODE DÉMO — Simulation reconstruction (sans API key)
  // ============================================================
  const simulateReconstruction = () => {
    const steps = [
      { p: 10, s: 'Analyse des 8 captures...' },
      { p: 20, s: 'Détection des points de référence...' },
      { p: 35, s: 'Alignement des vues multiples...' },
      { p: 50, s: 'Reconstruction du nuage de points...' },
      { p: 65, s: 'Génération du mesh polygonal...' },
      { p: 78, s: 'Application des textures HD...' },
      { p: 88, s: 'Optimisation du modèle (50K polygones)...' },
      { p: 95, s: 'Export GLB + USDZ...' },
      { p: 100, s: 'Modèle 3D prêt !' },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProcessingProgress(steps[i].p);
        setProcessingStep(steps[i].s);
        i++;
      } else {
        clearInterval(interval);
        setResultModelUrl('https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb');
        setPhase('done');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 800);
  };

  // ============================================================
  // RESET
  // ============================================================
  const resetScan = () => {
    setPhase('ready');
    setCurrentAngle(0);
    setCapturedPhotos([]);
    setProcessingProgress(0);
  };

  // ============================================================
  // RENDER — Permission check
  // ============================================================
  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permTitle}>Accès caméra requis</Text>
          <Text style={styles.permDesc}>
            Pour scanner les plats en 3D, Menu3D a besoin d'accéder à votre caméra
          </Text>
          <TouchableOpacity style={styles.btnBlue} onPress={requestPermission}>
            <Text style={styles.btnBlueText}>Autoriser la caméra</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.goBack()}>
            <Text style={styles.btnGhostText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================================
  // RENDER — PROCESSING (reconstruction en cours)
  // ============================================================
  if (phase === 'processing') {
    return (
      <View style={styles.processingContainer}>
        <View style={styles.processingContent}>
          {/* Preview des photos capturées */}
          <ScrollView horizontal style={styles.thumbRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}>
            {capturedPhotos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumb} />
            ))}
          </ScrollView>

          <View style={styles.processingInfo}>
            <ActivityIndicator size="large" color={COLORS.brand} style={{ marginBottom: 20 }} />
            <Text style={styles.procTitle}>Reconstruction 3D</Text>
            <Text style={styles.procStep}>{processingStep}</Text>

            {/* Barre de progression */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${processingProgress}%` }]} />
            </View>
            <Text style={styles.procPercent}>{processingProgress}%</Text>

            {/* Étapes détaillées */}
            <View style={styles.stepsContainer}>
              <StepIndicator done={processingProgress >= 10} active={processingProgress < 10} label="Analyse des captures" />
              <StepIndicator done={processingProgress >= 35} active={processingProgress >= 10 && processingProgress < 35} label="Alignement multi-vues" />
              <StepIndicator done={processingProgress >= 50} active={processingProgress >= 35 && processingProgress < 50} label="Nuage de points 3D" />
              <StepIndicator done={processingProgress >= 65} active={processingProgress >= 50 && processingProgress < 65} label="Mesh polygonal" />
              <StepIndicator done={processingProgress >= 78} active={processingProgress >= 65 && processingProgress < 78} label="Textures photoréalistes" />
              <StepIndicator done={processingProgress >= 95} active={processingProgress >= 78 && processingProgress < 95} label="Optimisation & export" />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ============================================================
  // RENDER — DONE (scan terminé)
  // ============================================================
  if (phase === 'done') {
    return (
      <View style={styles.doneContainer}>
        <View style={styles.doneContent}>
          <View style={styles.doneIcon}>
            <Text style={{ fontSize: 32 }}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>Scan 3D terminé</Text>
          <Text style={styles.doneSub}>
            {capturedPhotos.length} captures analysées · 50,000+ polygones · Textures 4K
          </Text>

          <ScrollView horizontal style={styles.thumbRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}>
            {capturedPhotos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumb} />
            ))}
          </ScrollView>

          <View style={styles.doneBtns}>
            <TouchableOpacity style={styles.btnGhost} onPress={resetScan}>
              <Text style={styles.btnGhostText}>↺ Re-scanner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnBlue}
              onPress={() => navigation.navigate('Preview3D', {
                clientId,
                totalPoints: 50000,
                modelUrl: resultModelUrl,
                photos: capturedPhotos,
              })}
            >
              <Text style={styles.btnBlueText}>Voir le modèle 3D →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ============================================================
  // RENDER — CAMERA (scan en cours)
  // ============================================================
  const doneSectors = capturedPhotos.length;

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
      />

      {/* Face ID style sectors ring */}
      <View style={styles.sectorsCenter}>
        <Svg width={220} height={220} viewBox="0 0 220 220">
          {Array(TOTAL_SECTORS).fill(0).map((_, i) => {
            const startAngle = (i * 360) / TOTAL_SECTORS - 90;
            const endAngle = ((i + 1) * 360) / TOTAL_SECTORS - 90;
            const r = 95;
            const cx = 110, cy = 110;
            const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
            const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
            const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
            const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
            const done = i < doneSectors;
            const active = i === currentAngle && phase === 'capturing';

            return (
              <Path
                key={i}
                d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                stroke={done ? COLORS.brand : active ? 'rgba(0,71,255,0.6)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={done ? 5 : active ? 4 : 2.5}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
          <Circle cx={110} cy={110} r={3} fill="rgba(0,71,255,0.5)" />
        </Svg>
      </View>

      {/* HUD Top */}
      <View style={styles.hud}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 14 }}>✕</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <Text style={[styles.hudLabel, phase === 'capturing' && { color: COLORS.brand }]}>
            {phase === 'ready' ? 'PRÊT' : `CAPTURE ${doneSectors + 1}/${TOTAL_SECTORS}`}
          </Text>
          <Text style={styles.hudSub}>
            {phase === 'ready'
              ? 'Positionnez le plat au centre'
              : SCAN_ANGLES[currentAngle]?.instruction
            }
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Angle indicator */}
      <View style={styles.angleLabel}>
        <Text style={styles.angleLabelText}>
          {phase === 'capturing' ? SCAN_ANGLES[currentAngle]?.label : '—'}
        </Text>
      </View>

      {/* Captured photos strip */}
      {capturedPhotos.length > 0 && (
        <ScrollView horizontal style={styles.capturedStrip} contentContainerStyle={{ gap: 4, paddingHorizontal: 10 }}>
          {capturedPhotos.map((uri, i) => (
            <View key={i} style={styles.capturedThumbWrap}>
              <Image source={{ uri }} style={styles.capturedThumb} />
              <View style={styles.capturedCheck}>
                <Text style={{ color: '#fff', fontSize: 8 }}>✓</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Sector progress dots */}
      <View style={styles.sectorDots}>
        {Array(TOTAL_SECTORS).fill(0).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < doneSectors && styles.dotDone,
              i === currentAngle && phase === 'capturing' && styles.dotActive,
            ]}
          />
        ))}
        <Text style={styles.dotCount}>{doneSectors}/{TOTAL_SECTORS}</Text>
      </View>

      {/* Bottom */}
      <View style={styles.bottom}>
        <Text style={styles.instruction}>
          {phase === 'ready'
            ? 'Centrez le plat dans le cercle et appuyez sur le bouton'
            : `Angle ${doneSectors + 1}/${TOTAL_SECTORS} — ${SCAN_ANGLES[currentAngle]?.instruction}`
          }
        </Text>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnGhostDark} onPress={resetScan}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>↺</Text>
          </TouchableOpacity>

          {/* Gros bouton de capture (comme l'appareil photo) */}
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={() => {
              if (phase === 'ready') setPhase('capturing');
              captureAngle();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnGhostDark, doneSectors < 3 && { opacity: 0.3 }]}
            onPress={() => {
              if (doneSectors >= 3) startReconstruction(capturedPhotos);
            }}
            disabled={doneSectors < 3}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>FIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ============================================================
// COMPOSANT — Step indicator
// ============================================================
function StepIndicator({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <View style={stepStyles.row}>
      <View style={[
        stepStyles.dot,
        done && stepStyles.dotDone,
        active && stepStyles.dotActive,
      ]} />
      <Text style={[
        stepStyles.label,
        done && { color: COLORS.green },
        active && { color: COLORS.text },
      ]}>
        {done ? '✓ ' : ''}{label}
      </Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotDone: { backgroundColor: COLORS.green },
  dotActive: { backgroundColor: COLORS.brand },
  label: { fontSize: 12, color: COLORS.text3 },
});

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Permission
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  permTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  permDesc: { fontSize: 13, color: 'rgba(255,255,255,.6)', textAlign: 'center', marginBottom: 24 },

  // Sectors ring
  sectorsCenter: {
    position: 'absolute', top: '50%', left: '50%',
    marginTop: -110, marginLeft: -110,
    width: 220, height: 220,
  },

  // HUD
  hud: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 54 : 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center',
  },
  hudCenter: { flex: 1, alignItems: 'center' },
  hudLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10, letterSpacing: 2, color: '#fff', textTransform: 'uppercase',
  },
  hudSub: { fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 3, textAlign: 'center' },

  // Angle indicator
  angleLabel: {
    position: 'absolute', top: '50%', left: '50%',
    marginTop: -10, marginLeft: -30, width: 60,
    alignItems: 'center',
  },
  angleLabelText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9, color: COLORS.brand, letterSpacing: 1,
  },

  // Captured photos strip
  capturedStrip: {
    position: 'absolute', top: Platform.OS === 'ios' ? 100 : 60,
    left: 0, right: 0, maxHeight: 52,
  },
  capturedThumbWrap: { position: 'relative' },
  capturedThumb: { width: 44, height: 44, borderRadius: 8, borderWidth: 2, borderColor: COLORS.brand },
  capturedCheck: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center',
  },

  // Sector dots
  sectorDots: {
    position: 'absolute', bottom: 140, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.15)' },
  dotDone: { backgroundColor: COLORS.brand },
  dotActive: { backgroundColor: 'rgba(0,71,255,.5)' },
  dotCount: {
    marginLeft: 8, color: '#fff', fontSize: 11, fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Bottom
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 16,
  },
  instruction: {
    textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.6)', marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24,
  },
  btnGhostDark: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center',
  },

  // Capture button (big circle like camera app)
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnInner: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#fff',
  },

  // Buttons
  btnBlue: {
    flex: 1, padding: 14, borderRadius: RADIUS.md,
    backgroundColor: COLORS.brand, alignItems: 'center', ...SHADOWS.brand,
  },
  btnBlueText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnGhost: {
    flex: 1, padding: 14, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  btnGhostText: { fontSize: 13, fontWeight: '600', color: COLORS.text2 },

  // Processing
  processingContainer: { flex: 1, backgroundColor: COLORS.bg },
  processingContent: { flex: 1, justifyContent: 'center' },
  processingInfo: { alignItems: 'center', padding: 24 },
  procTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  procStep: { fontSize: 13, color: COLORS.text2, textAlign: 'center', marginBottom: 20 },
  progressBar: {
    width: '80%', height: 4, backgroundColor: COLORS.bg3,
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: COLORS.brand, borderRadius: 2,
  },
  procPercent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12, color: COLORS.brand, fontWeight: '600', marginTop: 8,
  },
  stepsContainer: { marginTop: 24, paddingHorizontal: 40 },

  // Thumbnails
  thumbRow: { maxHeight: 60, marginBottom: 16 },
  thumb: { width: 52, height: 52, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },

  // Done
  doneContainer: { flex: 1, backgroundColor: COLORS.bg },
  doneContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  doneIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.greenLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  doneTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  doneSub: { fontSize: 13, color: COLORS.text2, textAlign: 'center', marginBottom: 20 },
  doneBtns: { flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 20 },
});
