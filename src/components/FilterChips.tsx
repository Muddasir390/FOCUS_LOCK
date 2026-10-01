import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, radius } from '../theme';

export type AppFilter = 'all' | 'limited' | 'user' | 'system';

const CHIPS: { key: AppFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'limited', label: 'Limited' },
  { key: 'user', label: 'Installed' },
  { key: 'system', label: 'System' },
];

type Props = {
  value: AppFilter;
  counts: Record<AppFilter, number>;
  onChange: (filter: AppFilter) => void;
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

  const backgroundColor = active.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.primary],
  });
  const borderColor = active.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
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

export default function FilterChips({ value, counts, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map(chip => (
        <Chip
          key={chip.key}
          label={chip.label}
          count={counts[chip.key]}
          selected={value === chip.key}
          onPress={() => onChange(chip.key)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
