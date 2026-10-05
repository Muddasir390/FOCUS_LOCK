import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../theme';

type Props = {
  value: boolean;
  /** Shown under the switch, e.g. "On" or "Setup needed". */
  label: string;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
};

const TRACK_WIDTH = 54;
const THUMB = 26;
const PADDING = 3;

export default function ProtectionSwitch({
  value,
  label,
  disabled,
  onValueChange,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: value ? 1 : 0,
      friction: 7,
      tension: 140,
      useNativeDriver: false, // the track colour cannot run on the native driver
    }).start();
  }, [position, value]);

  const trackColor = position.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceAlt, colors.primary],
  });
  const thumbX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [PADDING, TRACK_WIDTH - THUMB - PADDING],
  });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[styles.root, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { left: thumbX }]} />
      </Animated.View>
      <Text style={[styles.label, value && !disabled && styles.labelOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      alignItems: 'center',
      gap: 4,
    },
    disabled: {
      opacity: 0.55,
    },
    track: {
      width: TRACK_WIDTH,
      height: THUMB + PADDING * 2,
      borderRadius: (THUMB + PADDING * 2) / 2,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
    },
    thumb: {
      position: 'absolute',
      width: THUMB,
      height: THUMB,
      borderRadius: THUMB / 2,
      backgroundColor: '#FFFFFF',
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    labelOn: {
      color: colors.accent,
    },
  });
}
