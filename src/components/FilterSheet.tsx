import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import FilterChips, { AppFilter } from './FilterChips';

type Props = {
  visible: boolean;
  filter: AppFilter;
  filterCounts: Record<AppFilter, number>;
  onChangeFilter: (filter: AppFilter) => void;
  onClose: () => void;
};

/** Bottom sheet for the status filter (All/Limited/Installed/System). */
export default function FilterSheet({
  visible,
  filter,
  filterCounts,
  onChangeFilter,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const open = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
  }, [visible, open]);

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

          <View style={styles.titleRow}>
            <Text style={styles.title}>Filter</Text>
            {filter !== 'all' && (
              <Pressable onPress={() => onChangeFilter('all')} hitSlop={8}>
                <Text style={styles.reset}>Reset</Text>
              </Pressable>
            )}
          </View>

          <FilterChips value={filter} counts={filterCounts} onChange={onChangeFilter} />

          <Pressable style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    // 20px, not 24, to match FilterChips' -20 edge-bleed margin.
    paddingHorizontal: 20,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
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
