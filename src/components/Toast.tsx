import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { radius, ThemeColors } from '../theme';

type Props = {
  /** The message to show, or null to show nothing. */
  message: string | null;
  /** Called once the toast has finished its auto-hide animation. */
  onHide: () => void;
  /** How long the toast stays fully visible before fading out, in ms. */
  duration?: number;
};

/** A small, self-dismissing banner for brief status messages (e.g. "Incorrect PIN"). */
export default function Toast({ message, onHide, duration = 3000 }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
    // Re-run whenever a new message comes in, even if it's the same text as before.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, duration]);

  if (!message) return null;

  return (
    <Animated.View
      style={[styles.toast, { top: insets.top + 16, opacity }]}
      pointerEvents="none"
    >
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    toast: {
      position: 'absolute',
      alignSelf: 'center',
      maxWidth: '86%',
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: radius.pill,
      backgroundColor: colors.danger,
    },
    text: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'center',
    },
  });
}
