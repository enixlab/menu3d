import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface Props {
  onAuth: () => void;
}

export default function AuthScreen({ onAuth }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(TextInput | null)[]>([]);

  const sendCode = () => {
    if (!email.trim()) return;
    setStep(2);
    setTimeout(() => inputs.current[0]?.focus(), 300);
  };

  const handleDigit = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
    if (index === 5 && text) {
      onAuth();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Gradient accent line */}
      <View style={styles.accentLine} />

      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>◆</Text>
          </View>
          <Text style={styles.logoText}>Menu<Text style={styles.logoBrand}>3D</Text></Text>
        </View>

        {step === 1 ? (
          <>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>Accédez à votre espace professionnel</Text>

            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={COLORS.text4}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={sendCode}
            />

            <TouchableOpacity style={styles.button} onPress={sendCode} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Recevoir un code</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Aucun mot de passe requis. Un code unique vous sera envoyé.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Vérification</Text>
            <Text style={styles.subtitle}>
              Code envoyé à {email.replace(/(.{2}).*(@)/, '$1***$2')}
            </Text>

            <View style={styles.codeRow}>
              {code.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref: TextInput | null) => { inputs.current[i] = ref; }}
                  style={[styles.codeDigit, digit ? styles.codeDigitFilled : null]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(t) => handleDigit(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  selectionColor={COLORS.brand}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={onAuth} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Vérifier</Text>
            </TouchableOpacity>

            <Text style={styles.note}>Entrez n'importe quel code pour la démo</Text>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.brand,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: 36,
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  logoBrand: {
    color: COLORS.brand,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text2,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  button: {
    width: '100%',
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    marginTop: 12,
    ...SHADOWS.brand,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 16,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 20,
  },
  codeDigit: {
    width: 46,
    height: 54,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  codeDigitFilled: {
    borderColor: COLORS.brand,
  },
});
