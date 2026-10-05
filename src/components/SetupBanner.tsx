import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLoopValue } from '../hooks/useLoopValue';
import { useTheme } from '../hooks/useTheme';
import { radius, ThemeColors } from '../theme';

type Props = {
  usageAccess: boolean;
  overlay: boolean;
  onAllowUsageAccess: () => void;
  onAllowOverlay: () => void;
  onOpenAppInfo: () => void;
};

function Step({
  index,
  title,
  description,
  done,
  highlight,
  onPress,
}: {
  index: number;
  title: string;
  description: string;
  done: boolean;
  /** The step to do next; its button pulses. */
  highlight: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStepStyles(colors), [colors]);
  const check = useRef(new Animated.Value(done ? 1 : 0)).current;
  const pulse = useLoopValue(900, { pingPong: true });

  useEffect(() => {
    Animated.spring(check, {
      toValue: done ? 1 : 0,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [check, done]);

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });
  const buttonOpacity = highlight ? glow : 1;

  return (
    <View style={styles.step}>
      <View style={[styles.badge, done && styles.badgeDone]}>
        <Animated.Text
          style={[
            styles.badgeText,
            { transform: [{ scale: done ? check : 1 }] },
          ]}
        >
          {done ? '✓' : index}
        </Animated.Text>
      </View>
      <View style={styles.stepMeta}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
      {!done && (
        <Pressable onPress={onPress}>
          <Animated.View style={[styles.allow, { opacity: buttonOpacity }]}>
            <Text style={styles.allowText}>Allow</Text>
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}

/** Walks the user through the two permissions needed to track and block apps. */
export default function SetupBanner({
  usageAccess,
  overlay,
  onAllowUsageAccess,
  onAllowOverlay,
  onOpenAppInfo,
}: Props) {
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
      <Text style={styles.title}>Finish setup</Text>
      <Text style={styles.subtitle}>
        FocusLock needs two permissions to track and block apps.
      </Text>

      <Step
        index={1}
        title="Usage access"
        description="See how long each app is used"
        done={usageAccess}
        highlight={!usageAccess}
        onPress={onAllowUsageAccess}
      />
      <Step
        index={2}
        title="Display over other apps"
        description="Show the lock screen when time is up"
        done={overlay}
        highlight={usageAccess && !overlay}
        onPress={onAllowOverlay}
      />

      <View style={styles.help}>
        <Text style={styles.helpText}>
          Toggle not responding, or Android says "App was denied access"?
          That's a one-time Android security check for apps installed outside
          the Play Store — it won't happen once FocusLock is published there.
          Open app info, tap the ⋮ menu (top right) and choose "Allow
          restricted settings", then come back and try again.
        </Text>
        <Pressable onPress={onOpenAppInfo} hitSlop={8}>
          <Text style={styles.helpLink}>Open app info</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginBottom: 4,
      padding: 18,
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(124, 92, 255, 0.45)',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      marginTop: -8,
      fontSize: 13,
      color: colors.textMuted,
    },
    help: {
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    helpText: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
    helpLink: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.accent,
    },
  });
}

function createStepStyles(colors: ThemeColors) {
  return StyleSheet.create({
    step: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    badge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    badgeDone: {
      backgroundColor: colors.accent,
    },
    badgeText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    stepMeta: {
      flex: 1,
      gap: 2,
    },
    stepTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    stepDescription: {
      fontSize: 12,
      color: colors.textMuted,
    },
    allow: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    allowText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
