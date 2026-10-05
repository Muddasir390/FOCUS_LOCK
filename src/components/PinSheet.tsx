import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { radius, ThemeColors } from '../theme';
import Toast from './Toast';

const PIN_LENGTH = 4;

type Props = {
  visible: boolean;
  /** "setup" the first time ever (no PIN exists yet); "verify" every time after. */
  mode: 'setup' | 'verify';
  onSetPin: (pin: string) => Promise<void> | void;
  verifyPin: (pin: string) => boolean;
  /** Called once the PIN has been created (setup) or correctly entered (verify). */
  onSuccess: () => void;
  onCancel: () => void;
};

/** Bottom sheet that guards changing or removing a limit behind a single app-wide PIN. */
export default function PinSheet({
  visible,
  mode,
  onSetPin,
  verifyPin,
  onSuccess,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mounted, setMounted] = useState(visible);
  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [confirmPinVisible, setConfirmPinVisible] = useState(false);
  const [toast, setToast] = useState<{ key: number; message: string } | null>(null);
  const toastKey = useRef(0);
  const open = useRef(new Animated.Value(0)).current;

  // Each toast gets a fresh key so firing the same message twice in a row
  // (e.g. "Incorrect PIN" again) remounts Toast and restarts its 3s timer,
  // instead of React seeing an unchanged string and skipping the update.
  const showToast = (message: string) => {
    toastKey.current += 1;
    setToast({ key: toastKey.current, message });
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setPinValue('');
      setConfirmPin('');
      setPinVisible(false);
      setConfirmPinVisible(false);
      setToast(null);
      Animated.spring(open, {
        toValue: 1,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(open, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, open]);

  const translateY = open.interpolate({
    inputRange: [0, 1],
    outputRange: [520, 0],
  });
  const backdropOpacity = open.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.65],
  });

  const handleConfirm = async () => {
    if (mode === 'setup') {
      if (pin.length !== PIN_LENGTH) {
        showToast(`PIN must be ${PIN_LENGTH} digits`);
        return;
      }
      if (pin !== confirmPin) {
        showToast("PINs don't match");
        setConfirmPin('');
        return;
      }
      await onSetPin(pin);
      onSuccess();
    } else {
      if (verifyPin(pin)) {
        onSuccess();
      } else {
        showToast('Incorrect PIN');
        setPinValue('');
      }
    }
  };

  const canConfirm =
    mode === 'setup'
      ? pin.length === PIN_LENGTH && confirmPin.length === PIN_LENGTH
      : pin.length === PIN_LENGTH;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <Pressable style={styles.dismiss} onPress={onCancel} />

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>{mode === 'setup' ? 'Create a PIN' : 'Enter PIN'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'setup'
              ? 'This PIN will be required to change or remove any limit, or to turn protection off.'
              : 'Enter your PIN to continue.'}
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={text => {
                setPinValue(text.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH));
              }}
              placeholder={mode === 'setup' ? 'New PIN' : 'PIN'}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry={!pinVisible}
              maxLength={PIN_LENGTH}
              autoFocus
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setPinVisible(v => !v)}
              hitSlop={8}
            >
              <Text style={styles.eyeIcon}>{pinVisible ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>

          {mode === 'setup' && (
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={text => {
                  setConfirmPin(text.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH));
                }}
                placeholder="Confirm PIN"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                secureTextEntry={!confirmPinVisible}
                maxLength={PIN_LENGTH}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setConfirmPinVisible(v => !v)}
                hitSlop={8}
              >
                <Text style={styles.eyeIcon}>{confirmPinVisible ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.confirm, !canConfirm && styles.confirmDisabled]}
            disabled={!canConfirm}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmText}>
              {mode === 'setup' ? 'Set PIN' : 'Confirm'}
            </Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>

        <Toast
          key={toast?.key}
          message={toast?.message ?? null}
          onHide={() => setToast(null)}
        />
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#000000',
    },
    dismiss: {
      ...StyleSheet.absoluteFill,
    },
    sheet: {
      paddingHorizontal: 24,
      paddingTop: 12,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      marginBottom: 20,
      backgroundColor: colors.surfaceAlt,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      textAlign: 'center',
    },
    inputWrap: {
      marginTop: 18,
      justifyContent: 'center',
    },
    input: {
      height: 54,
      borderRadius: radius.md,
      paddingHorizontal: 18,
      paddingRight: 48,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 20,
      letterSpacing: 8,
      color: colors.text,
    },
    eyeButton: {
      position: 'absolute',
      right: 14,
      height: 54,
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyeIcon: {
      fontSize: 17,
    },
    confirm: {
      marginTop: 20,
      height: 54,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    confirmDisabled: {
      opacity: 0.4,
    },
    confirmText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    cancel: {
      marginTop: 6,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
    },
  });
}
