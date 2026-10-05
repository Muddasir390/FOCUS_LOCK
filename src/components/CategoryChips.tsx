import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { AppCategory, CATEGORY_LABELS } from '../data/appCategories';
import { useTheme } from '../hooks/useTheme';
import { radius, ThemeColors } from '../theme';

export type CategoryFilter = AppCategory | 'all';

type Props = {
  value: CategoryFilter;
  counts: Record<CategoryFilter, number>;
  onChange: (category: CategoryFilter) => void;
};

function Chip({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemoStyles(colors);
  const active = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(active, {
      toValue: selected ? 1 : 0,
      duration: 220,
      useNativeDriver: false, // colours cannot run on the native driver
    }).start();
  }, [active, selected]);

  const springTo = (toValue: number) =>
    Animated.spring(press, {
      toValue,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();

  // Uses the accent color (cyan) rather than primary (purple) so this row
  // reads as a distinct filter from the status row above it, not a duplicate.
  const backgroundColor = active.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.accent],
  });
  const borderColor = active.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accent],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springTo(0.92)}
      onPressOut={() => springTo(1)}
    >
      {/* Separate nodes: transform uses the native driver, colours do not. */}
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <Animated.View style={[styles.chip, { backgroundColor, borderColor }]}>
          <Text style={[styles.label, selected && styles.labelActive]}>
            {label}
          </Text>
          <Text style={[styles.count, selected && styles.countActive]}>
            {count}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function CategoryChips({ value, counts, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemoStyles(colors);
  // Only show categories apps actually fall into, so the row doesn't
  // advertise e.g. "Banking" when no banking app is installed.
  const categories = (Object.keys(CATEGORY_LABELS) as AppCategory[]).filter(
    key => counts[key] > 0,
  );
  if (categories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      <Chip
        label="All"
        count={counts.all}
        selected={value === 'all'}
        onPress={() => onChange('all')}
      />
      {categories.map(key => (
        <Chip
          key={key}
          label={CATEGORY_LABELS[key]}
          count={counts[key]}
          selected={value === key}
          onPress={() => onChange(key)}
        />
      ))}
    </ScrollView>
  );
}

function useMemoStyles(colors: ThemeColors) {
  return React.useMemo(() => createStyles(colors), [colors]);
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Bleeds to the screen edges so chips can scroll under the header's side padding.
    scroll: {
      marginHorizontal: -20,
      flexGrow: 0,
    },
    row: {
      paddingHorizontal: 20,
      gap: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    labelActive: {
      color: '#FFFFFF',
    },
    count: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      opacity: 0.8,
    },
    countActive: {
      color: '#FFFFFF',
      opacity: 0.9,
    },
  });
}
