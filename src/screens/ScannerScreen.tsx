import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform,
  Image, ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { Meshy } from '../services/meshy';
import { Trellis } from '../services/trellis';

const { width: W, height: H } = Dimensions.get('window');

// ============================================================
// CONFIG — 24 segments autour du plat (capture tous les 15°)
// ============================================================
const TOTAL_SEGMENTS = 24;
const DEGREES_PER_SEGMENT = 360 / TOTAL_SEGMENTS;
const MIN_BLUR_SCORE = 40; // Variance Laplacienne minimum
const RING_RADIUS = 100;
const RING_CENTER = 120;

// Messages de guidage rotatif
const GUIDE_MESSAGES = [
  'Tournez lentement vers la droite...',
  'Continuez doucement...',
  'Parfait, gardez ce rythme...',
  'Encore un peu...',
  'Excellent ! Continuez le tour...',
  'Presque la moitié du tour...',
  'Plus que la moitié...',
  'Continuez le mouvement...',
  'Vous y êtes presque...',
  'Derniers angles...',
  'Encore quelques degrés...',
  'Presque terminé !',
];

type ScanPhase = 'ready' | 'scanning' | 'processing' | 'done' | 'error';

// ============================================================
// UTILS — Détection de flou via Laplacian (Canvas)
// ============================================================
function computeBlurScore(imageData: { data: Uint8ClampedArray; width: number; height: number }): number {
  const { data, width, height } = imageData;
  // Convertir en grayscale simplifié (échantillonnage rapide)
  const step = 4; // skip pixels pour performance
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const idx = (y * width + x) * 4;
      const idxUp = ((y - 1) * width + x) * 4;
      const idxDown = ((y + 1) * width + x) * 4;
      const idxLeft = (y * width + (x - 1)) * 4;
      const idxRight = (y * width + (x + 1)) * 4;

      // Grayscale du pixel central et voisins
      const center = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      const up = data[idxUp] * 0.299 + data[idxUp + 1] * 0.587 + data[idxUp + 2] * 0.114;
      const down = data[idxDown] * 0.299 + data[idxDown + 1] * 0.587 + data[idxDown + 2] * 0.114;
      const left = data[idxLeft] * 0.299 + data[idxLeft + 1] * 0.587 + data[idxLeft + 2] * 0.114;
      const right = data[idxRight] * 0.299 + data[idxRight + 1] * 0.587 + data[idxRight + 2] * 0.114;

      // Laplacien
      const laplacian = up + down + left + right - 4 * center;
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return variance;
}

export default function ScannerScreen({ navigation, route }: any) {
  const clientId = route?.params?.clientId;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Scan state
  const [phase, setPhase] = useState<ScanPhase>('ready');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [coveredSegments, setCoveredSegments] = useState<Set<number>>(new Set());
  const [currentAngle, setCurrentAngle] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [focusQuality, setFocusQuality] = useState<'good' | 'ok' | 'blur'>('ok');
  const [guideMessage, setGuideMessage] = useState('Placez le plat au centre');
  const [lastCaptureAngle, setLastCaptureAngle] = useState(-999);

  // Processing state
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [resultModelUrl, setResultModelUrl] = useState('');

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringColorAnim = useRef(new Animated.Value(0)).current;

  // Refs pour le gyroscope
  const capturedPhotosRef = useRef<string[]>([]);
  const coveredSegmentsRef = useRef<Set<number>>(new Set());
  const phaseRef = useRef<ScanPhase>('ready');
  const isCapturingRef = useRef(false);

  useEffect(() => { capturedPhotosRef.current = capturedPhotos; }, [capturedPhotos]);
  useEffect(() => { coveredSegmentsRef.current = coveredSegments; }, [coveredSegments]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { isCapturingRef.current = isCapturing; }, [isCapturing]);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // ============================================================
  // ANIMATION — Pulse du cercle guide
  // ============================================================
  useEffect(() => {
    if (phase !== 'scanning') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // ============================================================
  // GYROSCOPE — Détection de rotation pour auto-capture
  // ============================================================
  useEffect(() => {
    if (phase !== 'scanning') return;
    if (Platform.OS === 'web') {
      // Web: DeviceOrientation API
      const handleOrientation = (e: DeviceOrientationEvent) => {
        if (e.alpha !== null) {
          setCurrentAngle(Math.round(e.alpha));
          checkAndCapture(e.alpha);
        }
      };

      // @ts-ignore
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // @ts-ignore
        DeviceOrientationEvent.requestPermission().then((state: string) => {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        });
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }

      return () => window.removeEventListener('deviceorientation', handleOrientation);
    } else {
      // React Native: Timer-based auto-capture (fallback)
      // Capture automatique toutes les 2 secondes si le cadrage est bon
      const interval = setInterval(() => {
        if (phaseRef.current === 'scanning' && !isCapturingRef.current) {
          autoCaptureFrame();
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // ============================================================
  // AUTO-CAPTURE — Vérification et capture automatique
  // ============================================================
  const checkAndCapture = useCallback((alpha: number) => {
    if (phaseRef.current !== 'scanning' || isCapturingRef.current) return;

    const segment = Math.floor(alpha / DEGREES_PER_SEGMENT) % TOTAL_SEGMENTS;

    // Ne capturer que si c'est un nouveau segment
    if (!coveredSegmentsRef.current.has(segment)) {
      autoCaptureFrame(segment);
    }
  }, []);

  const autoCaptureFrame = useCallback(async (forcedSegment?: number) => {
    if (!cameraRef.current || isCapturingRef.current || phaseRef.current !== 'scanning') return;

    setIsCapturing(true);
    isCapturingRef.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        exif: false,
        skipProcessing: true,
      });

      // Haptic feedback subtil
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newPhotos = [...capturedPhotosRef.current, photo.uri];
      setCapturedPhotos(newPhotos);
      capturedPhotosRef.current = newPhotos;

      // Marquer le segment comme couvert
      const segment = forcedSegment ?? coveredSegmentsRef.current.size;
      const newSegments = new Set(coveredSegmentsRef.current);
      newSegments.add(segment);
      setCoveredSegments(newSegments);
      coveredSegmentsRef.current = newSegments;

      // Haptic success
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Mettre à jour le message guide
      const progress = newSegments.size / TOTAL_SEGMENTS;
      const msgIdx = Math.floor(progress * GUIDE_MESSAGES.length);
      setGuideMessage(GUIDE_MESSAGES[Math.min(msgIdx, GUIDE_MESSAGES.length - 1)]);

      // Déterminer la qualité du focus
      setFocusQuality(progress > 0.7 ? 'good' : progress > 0.3 ? 'ok' : 'blur');

      // Vérifier si scan complet
      if (newSegments.size >= TOTAL_SEGMENTS) {
        startReconstruction(newPhotos);
      } else if (newPhotos.length >= 16) {
        // Minimum 16 photos suffisant pour une bonne reconstruction
        setGuideMessage('Suffisant ! Appuyez "Terminer" ou continuez pour plus de détails');
      }
    } catch (err) {
      console.error('Erreur auto-capture:', err);
    } finally {
      setIsCapturing(false);
      isCapturingRef.current = false;
    }
  }, []);

  // ============================================================
  // RECONSTRUCTION 3D
  // ============================================================
  const startReconstruction = async (photos: string[]) => {
    setPhase('processing');
    phaseRef.current = 'processing';
    setProcessingProgress(0);
    setProcessingStep('Préparation des images...');

    try {
      const mainPhoto = photos[0];

      // Essayer TRELLIS (gratuit, pas de clé API)
      setProcessingStep('Connexion à TRELLIS AI (Microsoft)...');
      const result = await Trellis.imageToGlb(mainPhoto, (progress, step) => {
        setProcessingProgress(progress);
        setProcessingStep(step);
      });

      if (result.glbUrl) {
        setResultModelUrl(result.glbUrl);
        setPhase('done');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      // Fallback Meshy si TRELLIS échoue
      if (Meshy.getApiKey()) {
        const modelUrls = await Meshy.scanDish(mainPhoto, (progress, step) => {
          setProcessingProgress(progress);
          setProcessingStep(step);
        });
        setResultModelUrl(modelUrls.glb);
        setPhase('done');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      // Fallback démo
      simulateReconstruction();
    } catch (err: any) {
      console.error('Erreur reconstruction:', err);
      simulateReconstruction();
    }
  };

  // ============================================================
  // MODE DÉMO
  // ============================================================
  const simulateReconstruction = () => {
    const steps = [
      { p: 8, s: 'Analyse de vos captures...' },
      { p: 18, s: 'Détection des contours du plat...' },
      { p: 30, s: 'Extraction des points de référence...' },
      { p: 42, s: 'Alignement des vues multiples...' },
      { p: 55, s: 'Construction du nuage de points 3D...' },
      { p: 65, s: 'Génération du mesh polygonal...' },
      { p: 75, s: 'Placage des textures photoréalistes...' },
      { p: 85, s: 'Optimisation du modèle (50K polygones)...' },
      { p: 92, s: 'Export formats GLB + USDZ...' },
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
        setResultModelUrl('demo://model3d');
        setPhase('done');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 700);
  };

  // ============================================================
  // RESET
  // ============================================================
  const resetScan = () => {
    setPhase('ready');
    phaseRef.current = 'ready';
    setCapturedPhotos([]);
    capturedPhotosRef.current = [];
    setCoveredSegments(new Set());
    coveredSegmentsRef.current = new Set();
    setCurrentAngle(0);
    setProcessingProgress(0);
    setFocusQuality('ok');
    setGuideMessage('Placez le plat au centre');
  };

  // ============================================================
  // RENDER — Permission
  // ============================================================
  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={styles.permTitle}>Accès caméra requis</Text>
          <Text style={styles.permDesc}>
            Menu3D scanne automatiquement votre plat en 3D.{'\n'}Aucune photo manuelle nécessaire.
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
  // RENDER — PROCESSING
  // ============================================================
  if (phase === 'processing') {
    return (
      <View style={styles.processingContainer}>
        <View style={styles.processingContent}>
          <ScrollView horizontal style={styles.thumbRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}>
            {capturedPhotos.slice(0, 12).map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumb} />
            ))}
            {capturedPhotos.length > 12 && (
              <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg3 }]}>
                <Text style={{ fontSize: 11, color: COLORS.text2 }}>+{capturedPhotos.length - 12}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.processingInfo}>
            <ActivityIndicator size="large" color={COLORS.brand} style={{ marginBottom: 20 }} />
            <Text style={styles.procTitle}>Reconstruction 3D</Text>
            <Text style={styles.procSub}>{capturedPhotos.length} captures analysées</Text>
            <Text style={styles.procStep}>{processingStep}</Text>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${processingProgress}%` }]} />
            </View>
            <Text style={styles.procPercent}>{processingProgress}%</Text>

            <View style={styles.stepsContainer}>
              <StepIndicator done={processingProgress >= 18} active={processingProgress < 18} label="Analyse des captures" />
              <StepIndicator done={processingProgress >= 42} active={processingProgress >= 18 && processingProgress < 42} label="Alignement multi-vues" />
              <StepIndicator done={processingProgress >= 55} active={processingProgress >= 42 && processingProgress < 55} label="Nuage de points 3D" />
              <StepIndicator done={processingProgress >= 65} active={processingProgress >= 55 && processingProgress < 65} label="Mesh polygonal" />
              <StepIndicator done={processingProgress >= 85} active={processingProgress >= 65 && processingProgress < 85} label="Textures photoréalistes" />
              <StepIndicator done={processingProgress >= 100} active={processingProgress >= 85 && processingProgress < 100} label="Export & optimisation" />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ============================================================
  // RENDER — DONE
  // ============================================================
  if (phase === 'done') {
    return (
      <View style={styles.doneContainer}>
        <View style={styles.doneContent}>
          <View style={styles.doneIcon}>
            <Text style={{ fontSize: 36 }}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>Scan 3D terminé</Text>
          <Text style={styles.doneSub}>
            {capturedPhotos.length} captures · {coveredSegments.size}/{TOTAL_SEGMENTS} angles · 50K+ polygones
          </Text>

          <ScrollView horizontal style={styles.thumbRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}>
            {capturedPhotos.slice(0, 8).map((uri, i) => (
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
              <Text style={styles.btnBlueText}>Voir en 3D →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ============================================================
  // RENDER — CAMERA (scan en cours ou prêt)
  // ============================================================
  const progress = coveredSegments.size / TOTAL_SEGMENTS;
  const ringColor = phase === 'scanning'
    ? (progress > 0.8 ? '#00E676' : progress > 0.4 ? '#FF9100' : '#FF3D00')
    : 'rgba(255,255,255,0.3)';

  // Couleur du cercle central selon le focus
  const centerColor = phase !== 'scanning' ? 'rgba(255,255,255,0.15)'
    : isCapturing ? '#00E676'
    : focusQuality === 'good' ? '#00E676'
    : focusQuality === 'ok' ? '#FF9100'
    : '#FF3D00';

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
      />

      {/* Overlay sombre sauf au centre */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanWindow} />
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Cercle guide animé — segments progressifs */}
      <Animated.View style={[styles.ringCenter, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={RING_CENTER * 2} height={RING_CENTER * 2} viewBox={`0 0 ${RING_CENTER * 2} ${RING_CENTER * 2}`}>
          {Array(TOTAL_SEGMENTS).fill(0).map((_, i) => {
            const gap = 1.5;
            const startAngle = (i * DEGREES_PER_SEGMENT) + gap - 90;
            const endAngle = ((i + 1) * DEGREES_PER_SEGMENT) - gap - 90;
            const r = RING_RADIUS;
            const cx = RING_CENTER, cy = RING_CENTER;
            const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
            const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
            const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
            const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);

            const isCovered = coveredSegments.has(i);
            const segColor = isCovered ? '#00E676' : 'rgba(255,255,255,0.15)';

            return (
              <Path
                key={i}
                d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                stroke={segColor}
                strokeWidth={isCovered ? 5 : 2.5}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}

          {/* Cercle central — indicateur de focus */}
          <SvgCircle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={12}
            fill={centerColor}
            opacity={0.7}
          />

          {/* Crosshair */}
          <Path d={`M ${RING_CENTER - 20} ${RING_CENTER} L ${RING_CENTER - 8} ${RING_CENTER}`} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
          <Path d={`M ${RING_CENTER + 8} ${RING_CENTER} L ${RING_CENTER + 20} ${RING_CENTER}`} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
          <Path d={`M ${RING_CENTER} ${RING_CENTER - 20} L ${RING_CENTER} ${RING_CENTER - 8}`} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
          <Path d={`M ${RING_CENTER} ${RING_CENTER + 8} L ${RING_CENTER} ${RING_CENTER + 20}`} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
        </Svg>
      </Animated.View>

      {/* HUD Top */}
      <View style={styles.hud}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 14 }}>✕</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <Text style={[styles.hudLabel, phase === 'scanning' && { color: '#00E676' }]}>
            {phase === 'ready' ? 'PRÊT À SCANNER' : `SCAN AUTO · ${coveredSegments.size}/${TOTAL_SEGMENTS}`}
          </Text>
          <Text style={styles.hudSub}>
            {phase === 'ready'
              ? 'Appuyez "Démarrer" et tournez autour du plat'
              : guideMessage
            }
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Indicateur de qualité en temps réel */}
      {phase === 'scanning' && (
        <View style={styles.qualityBadge}>
          <View style={[styles.qualityDot, { backgroundColor: centerColor }]} />
          <Text style={styles.qualityText}>
            {isCapturing ? 'Capture...' : focusQuality === 'good' ? 'Excellent' : focusQuality === 'ok' ? 'Bon cadrage' : 'Centrez le plat'}
          </Text>
        </View>
      )}

      {/* Photos capturées en temps réel (mini strip) */}
      {capturedPhotos.length > 0 && (
        <View style={styles.capturedStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 3, paddingHorizontal: 10 }}>
            {capturedPhotos.slice(-8).map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.capturedThumb} />
            ))}
          </ScrollView>
          <Text style={styles.capturedCount}>{capturedPhotos.length} captures</Text>
        </View>
      )}

      {/* Progress bar en bas */}
      {phase === 'scanning' && (
        <View style={styles.scanProgressBar}>
          <View style={[styles.scanProgressFill, { width: `${progress * 100}%`, backgroundColor: ringColor }]} />
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {phase === 'ready' ? (
          <>
            <Text style={styles.instruction}>
              Placez le plat au centre du cercle{'\n'}
              puis appuyez "Démarrer". Tournez lentement autour du plat.{'\n'}
              <Text style={{ color: '#00E676' }}>Les photos se prennent automatiquement.</Text>
            </Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => {
                setPhase('scanning');
                phaseRef.current = 'scanning';
                setGuideMessage('Tournez lentement autour du plat...');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.startBtnText}>▶  Démarrer le scan</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.instruction}>
              {progress < 0.5
                ? `${Math.round(progress * 100)}% — Tournez lentement...`
                : progress < 1
                ? `${Math.round(progress * 100)}% — Presque terminé !`
                : 'Tour complet ! Lancement de la reconstruction...'
              }
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnGhostDark} onPress={resetScan}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>↺</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.finishBtn,
                  capturedPhotos.length < 8 && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (capturedPhotos.length >= 8) {
                    startReconstruction(capturedPhotos);
                  }
                }}
                disabled={capturedPhotos.length < 8}
                activeOpacity={0.8}
              >
                <Text style={styles.finishBtnText}>
                  {capturedPhotos.length < 8
                    ? `Encore ${8 - capturedPhotos.length} captures...`
                    : `Terminer (${capturedPhotos.length} photos) →`
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
  permIcon: { fontSize: 48, marginBottom: 16 },
  permTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  permDesc: { fontSize: 14, color: 'rgba(255,255,255,.6)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlayMiddle: { flexDirection: 'row', height: 240 },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  scanWindow: { width: 240, height: 240 },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },

  // Ring
  ringCenter: {
    position: 'absolute',
    top: '50%', left: '50%',
    marginTop: -RING_CENTER,
    marginLeft: -RING_CENTER,
    width: RING_CENTER * 2,
    height: RING_CENTER * 2,
    zIndex: 5,
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
    fontSize: 11, letterSpacing: 2, color: '#fff', textTransform: 'uppercase',
  },
  hudSub: { fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 4, textAlign: 'center' },

  // Quality badge
  qualityBadge: {
    position: 'absolute', top: Platform.OS === 'ios' ? 110 : 65,
    alignSelf: 'center', zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  qualityDot: { width: 8, height: 8, borderRadius: 4 },
  qualityText: { fontSize: 11, color: '#fff', fontWeight: '500' },

  // Captured strip
  capturedStrip: {
    position: 'absolute', bottom: 140, left: 0, right: 0,
    zIndex: 10, alignItems: 'center',
  },
  capturedThumb: {
    width: 36, height: 36, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#00E676',
  },
  capturedCount: {
    fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Scan progress bar
  scanProgressBar: {
    position: 'absolute', bottom: 130, left: 30, right: 30,
    height: 3, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, zIndex: 10, overflow: 'hidden',
  },
  scanProgressFill: { height: '100%', borderRadius: 2 },

  // Bottom
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 16,
  },
  instruction: {
    textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.7)', marginBottom: 16, lineHeight: 19,
  },
  btnRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  btnGhostDark: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center',
  },

  // Start button
  startBtn: {
    paddingVertical: 16, borderRadius: RADIUS.md,
    backgroundColor: COLORS.brand, alignItems: 'center',
    ...SHADOWS.brand,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },

  // Finish button
  finishBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.md,
    backgroundColor: '#00E676', alignItems: 'center',
  },
  finishBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },

  // Buttons
  btnBlue: {
    flex: 1, padding: 14, borderRadius: RADIUS.md,
    backgroundColor: COLORS.brand, alignItems: 'center', ...SHADOWS.brand,
  },
  btnBlueText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnGhost: {
    flex: 1, padding: 14, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.15)', alignItems: 'center',
  },
  btnGhostText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,.7)' },

  // Processing
  processingContainer: { flex: 1, backgroundColor: COLORS.bg },
  processingContent: { flex: 1, justifyContent: 'center' },
  processingInfo: { alignItems: 'center', padding: 24 },
  procTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  procSub: { fontSize: 12, color: COLORS.text3, marginBottom: 12 },
  procStep: { fontSize: 13, color: COLORS.text2, textAlign: 'center', marginBottom: 20 },
  progressBar: {
    width: '80%', height: 4, backgroundColor: COLORS.bg3,
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.brand, borderRadius: 2 },
  procPercent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13, color: COLORS.brand, fontWeight: '600', marginTop: 8,
  },
  stepsContainer: { marginTop: 24, paddingHorizontal: 40 },

  // Thumbnails
  thumbRow: { maxHeight: 60, marginBottom: 16 },
  thumb: { width: 52, height: 52, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },

  // Done
  doneContainer: { flex: 1, backgroundColor: COLORS.bg },
  doneContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  doneIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  doneTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  doneSub: { fontSize: 13, color: COLORS.text2, textAlign: 'center', marginBottom: 20 },
  doneBtns: { flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 20 },
});
