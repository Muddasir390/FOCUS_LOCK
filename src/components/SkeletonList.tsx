import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useLoopValue } from '../hooks/useLoopValue';
import { colors, radius } from '../theme';

const PLACEHOLDERS = 7;

/** Pulsing placeholder cards shown while the app list is loading. */
export default function SkeletonList() {
  const pulse = useLoopValue(750, { pingPong: true });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.85],
  });

  return (
    <View style={styles.list}>
      {Array.from({ length: PLACEHOLDERS }, (_, i) => (
        <Animated.View key={i} style={[styles.card, { opacity }]}>
          <View style={styles.icon} />
          <View style={styles.meta}>
            <View style={[styles.line, styles.lineTitle]} />
            <View style={[styles.line, styles.lineSub]} />
          </View>
          <View style={styles.pill} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  meta: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceAlt,
  },
  lineTitle: {
    width: '55%',
  },
  lineSub: {
    width: '80%',
    height: 8,
  },
  pill: {
    width: 74,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
});
