import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { radius, ThemeColors } from '../theme';

/** Shown when limits exist but protection is switched off, so they are not being enforced. */
export default function PausedBanner({ onResume }: { onResume: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  return (
    <Animated.View
      style={[styles.card, { opacity: enter, transform: [{ translateY }] }]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>Protection is paused</Text>
        <Text style={styles.subtitle}>
          Your limits are not being enforced right now.
        </Text>
      </View>
      <Pressable style={styles.button} onPress={onResume}>
        <Text style={styles.buttonText}>Resume</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(255, 176, 32, 0.5)',
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.warning,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textMuted,
    },
    button: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
