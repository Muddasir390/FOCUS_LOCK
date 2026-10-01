import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, radius } from '../../theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
};

export default function PrimaryButton({ label, onPress, loading }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springTo(0.96)}
      onPressOut={() => springTo(1)}
      disabled={loading}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.button, { transform: [{ scale }] }]}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
