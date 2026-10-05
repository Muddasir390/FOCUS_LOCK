import React, { useMemo } from 'react';
import {
  Animated,
  Image,
  ImageStyle,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useLoopValue } from '../hooks/useLoopValue';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../theme';

/**
 * A soft radial glow. It is one pre-rendered white gradient tinted to `color`, which keeps the
 * constantly animating background cheap to draw.
 */
export function Glow({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: ImageStyle;
}) {
  return (
    <Image
      source={require('../assets/glow.png')}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
    />
  );
}

function DriftingGlow({
  size,
  color,
  duration,
  travel,
  animated,
  style,
}: {
  size: number;
  color: string;
  duration: number;
  travel: number;
  animated: boolean;
  style: ViewStyle;
}) {
  const drift = useLoopValue(duration, { pingPong: true, enabled: animated });
  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-travel, travel],
  });
  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [travel, -travel],
  });
  const scale = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.15],
  });

  return (
    <Animated.View
      style={[
        staticStyles.glow,
        style,
        { transform: [{ translateX }, { translateY }, { scale }] },
      ]}
    >
      <Glow size={size} color={color} />
    </Animated.View>
  );
}

// Colorless, so shared as-is rather than recomputed per theme.
const staticStyles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
});

/**
 * Dark backdrop with slowly drifting colour glows. Pass `animated={false}` to freeze it: an
 * endlessly animating full-screen background keeps the GPU busy and drains the battery.
 */
export default function AnimatedBackground({
  animated = true,
}: {
  animated?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root} pointerEvents="none">
      <DriftingGlow
        size={460}
        color={colors.primary}
        duration={7000}
        travel={40}
        animated={animated}
        style={styles.topRight}
      />
      <DriftingGlow
        size={420}
        color={colors.accent}
        duration={9000}
        travel={50}
        animated={animated}
        style={styles.bottomLeft}
      />
      <DriftingGlow
        size={300}
        color={colors.blue}
        duration={8000}
        travel={30}
        animated={animated}
        style={styles.midLeft}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.bg,
      overflow: 'hidden',
    },
    topRight: {
      top: -190,
      right: -170,
    },
    bottomLeft: {
      bottom: -190,
      left: -190,
    },
    midLeft: {
      top: '38%',
      left: -170,
    },
  });
}
