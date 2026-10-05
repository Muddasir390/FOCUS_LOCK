import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppCategory, CATEGORY_LABELS } from '../data/appCategories';
import { useTheme } from '../hooks/useTheme';
import { radius, ThemeColors } from '../theme';
import type { InstalledApp } from '../types';
import { formatDuration, formatMinutes } from '../utils/time';

type Props = {
  app: InstalledApp;
  /** Position in the list; the first few cards enter one after another. */
  index: number;
  /** Daily limit in minutes, or 0 when the app has no limit. */
  limitMinutes: number;
  /** Time spent in the app today, in milliseconds. */
  usedMs: number;
  /** True when a time-window rule (daily or date-specific) blocks this app right now, regardless of minutes used. */
  timeBlocked: boolean;
  /** True when this app has one or more date-specific limits set, beyond its plain daily limit. */
  hasDateOverride: boolean;
  /** True when this app has a recurring daily time-of-day block configured. */
  hasDailyWindow: boolean;
  /** The app's resolved category. */
  category: AppCategory;
  onPress: (app: InstalledApp) => void;
  /** Opens the category picker for this app, separately from the main limit sheet. */
  onPressCategory: (app: InstalledApp) => void;
};

const STAGGER_COUNT = 8;
const STAGGER_MS = 55;

function AppCard({
  app,
  index,
  limitMinutes,
  usedMs,
  timeBlocked,
  hasDateOverride,
  hasDailyWindow,
  category,
  onPress,
  onPressCategory,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  const limited = limitMinutes > 0;
  const limitMs = limitMinutes * 60_000;
  const ratio = limited ? Math.min(usedMs / limitMs, 1) : 0;
  const minutesBlocked = limited && usedMs >= limitMs;
  const blocked = minutesBlocked || timeBlocked;
  const tint = blocked
    ? colors.danger
    : ratio >= 0.8
    ? colors.warning
    : colors.accent;

  const fill = useRef(new Animated.Value(ratio)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      // Only the first screenful is staggered; cards scrolled in later show at once.
      delay: index < STAGGER_COUNT ? index * STAGGER_MS : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  useEffect(() => {
    Animated.timing(fill, {
      toValue: ratio,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fill, ratio]);

  const springTo = (toValue: number) =>
    Animated.spring(press, {
      toValue,
      friction: 7,
      tension: 220,
      useNativeDriver: true,
    }).start();

  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [26, 0],
  });

  return (
    <Pressable
      onPress={() => onPress(app)}
      onPressIn={() => springTo(0.97)}
      onPressOut={() => springTo(1)}
    >
      <Animated.View
        style={[
          styles.card,
          blocked && styles.cardBlocked,
          { opacity: enter, transform: [{ translateY }, { scale: press }] },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Image
              source={{ uri: `data:image/png;base64,${app.icon}` }}
              style={styles.icon}
            />
          </View>

          <View style={styles.meta}>
            <Text style={styles.name} numberOfLines={1}>
              {app.appName}
            </Text>
            <Text style={styles.packageName} numberOfLines={1}>
              {app.packageName}
            </Text>
          </View>

          <View style={[styles.pill, (limited || blocked) && styles.pillLimited]}>
            <View
              style={[
                styles.dot,
                { backgroundColor: limited || blocked ? tint : colors.textMuted },
              ]}
            />
            <Text style={styles.pillText}>
              {blocked
                ? 'Blocked'
                : limited
                ? `${formatMinutes(limitMinutes)} / day`
                : 'No limit'}
            </Text>
          </View>
        </View>

        <View style={styles.tagsRow}>
          <Pressable
            onPress={() => onPressCategory(app)}
            hitSlop={6}
            style={styles.categoryChip}
          >
            <Text style={styles.categoryChipText}>{CATEGORY_LABELS[category]}</Text>
          </Pressable>
          {hasDateOverride && <Text style={styles.scheduleTag}>📅 Date limit</Text>}
          {hasDailyWindow && <Text style={styles.scheduleTag}>🕐 Time block</Text>}
        </View>

        {(limited || blocked) && (
          <View style={styles.footer}>
            <View style={styles.track}>
              <Animated.View
                style={[
                  styles.fill,
                  { backgroundColor: tint, transform: [{ scaleX: fill }] },
                ]}
              />
            </View>
            <View style={styles.footerText}>
              <Text style={styles.footerLabel}>
                {formatDuration(usedMs)} used
              </Text>
              <Text style={[styles.footerLabel, blocked && { color: tint }]}>
                {minutesBlocked
                  ? 'Unlocks at midnight'
                  : timeBlocked
                  ? 'Blocked by schedule'
                  : `${formatDuration(limitMs - usedMs)} left`}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default memo(AppCard);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      padding: 14,
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardBlocked: {
      borderColor: 'rgba(255, 92, 122, 0.4)',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    icon: {
      width: 40,
      height: 40,
    },
    meta: {
      flex: 1,
      gap: 3,
    },
    name: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    packageName: {
      fontSize: 12,
      color: colors.textMuted,
    },
    tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent,
    },
    scheduleTag: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    pillLimited: {
      backgroundColor: colors.primarySoft,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    footer: {
      gap: 8,
    },
    track: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
    },
    fill: {
      height: 6,
      borderRadius: 3,
      transformOrigin: 'left',
    },
    footerText: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    footerLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
