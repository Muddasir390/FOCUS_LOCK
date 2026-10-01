import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius } from '../theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

function SearchIcon() {
  return (
    <View style={styles.iconBox}>
      <View style={styles.lens} />
      <View style={styles.handle} />
    </View>
  );
}

export default function SearchBar({ value, onChangeText }: Props) {
  const focus = useRef(new Animated.Value(0)).current;

  const animateTo = (toValue: number) =>
    Animated.timing(focus, {
      toValue,
      duration: 220,
      useNativeDriver: false, // border colour cannot run on the native driver
    }).start();

  const borderColor = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  return (
    <Animated.View style={[styles.wrap, { borderColor }]}>
      <SearchIcon />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => animateTo(1)}
        onBlur={() => animateTo(0)}
        placeholder="Search apps"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityLabel="Clear search"
        >
          <Text style={styles.clear}>✕</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
    color: colors.text,
  },
  clear: {
    fontSize: 14,
    color: colors.textMuted,
  },
  iconBox: {
    width: 18,
    height: 18,
  },
  lens: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  handle: {
    position: 'absolute',
    right: 1,
    bottom: 2,
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textMuted,
    transform: [{ rotate: '45deg' }],
  },
});
