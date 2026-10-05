import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCategory, CATEGORY_LABELS } from '../data/appCategories';
import { useTheme } from '../hooks/useTheme';
import { radius, ThemeColors } from '../theme';
import type { InstalledApp } from '../types';

type Props = {
  /** The app being categorized; null keeps the sheet closed. */
  app: InstalledApp | null;
  /** The app's resolved category (auto-detected, unless the user corrected it). */
  category: AppCategory;
  /** Whether `category` is a user correction rather than an auto-detected guess. */
  categoryIsOverridden: boolean;
  onSelectCategory: (category: AppCategory) => void;
  onResetCategory: () => void;
  onClose: () => void;
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as AppCategory[];

/** Small, focused bottom sheet for just correcting an app's category. */
export default function CategorySheet({
  app,
  category,
  categoryIsOverridden,
  onSelectCategory,
  onResetCategory,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<InstalledApp | null>(app);
  const [mounted, setMounted] = useState(false);
  const open = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (app) {
      setShown(app);
      setMounted(true);
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
  }, [app, open]);

  const translateY = open.interpolate({
    inputRange: [0, 1],
    outputRange: [520, 0],
  });
  const backdropOpacity = open.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.65],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <Pressable style={styles.dismiss} onPress={onClose} />

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

          {shown && (
            <View style={styles.appRow}>
              <View style={styles.iconWrap}>
                <Image
                  source={{ uri: `data:image/png;base64,${shown.icon}` }}
                  style={styles.icon}
                />
              </View>
              <Text style={styles.appName} numberOfLines={1}>
                {shown.appName}
              </Text>
            </View>
          )}

          <View style={styles.titleRow}>
            <Text style={styles.title}>Category</Text>
            {categoryIsOverridden && (
              <Pressable onPress={onResetCategory} hitSlop={8}>
                <Text style={styles.reset}>Reset to automatic</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.categoryRow}>
            {CATEGORIES.map(key => (
              <Pressable
                key={key}
                onPress={() => onSelectCategory(key)}
                style={[styles.categoryPill, category === key && styles.categoryPillActive]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    category === key && styles.categoryPillTextActive,
                  ]}
                >
                  {CATEGORY_LABELS[key]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Animated.View>
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
    appRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    icon: {
      width: 30,
      height: 30,
    },
    appName: {
      flex: 1,
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    reset: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    categoryPillTextActive: {
      color: '#FFFFFF',
    },
    done: {
      marginTop: 24,
      height: 54,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    doneText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
