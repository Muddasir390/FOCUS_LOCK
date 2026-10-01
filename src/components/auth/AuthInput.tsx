import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputInstance,
  TextInputProps,
} from 'react-native';
import EyeIcon from '../icons/EyeIcon';
import { colors, radius } from '../../theme';

type Props = TextInputProps & {
  label: string;
  /** Adds an eye toggle that reveals/hides the text. */
  password?: boolean;
  inputRef?: React.Ref<TextInputInstance>;
};

/** Text field whose label floats up when focused or filled. */
export default function AuthInput({
  label,
  password,
  inputRef,
  value,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const focus = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(value ? 1 : 0)).current;
  const floating = focused || !!value;

  useEffect(() => {
    Animated.timing(lift, {
      toValue: floating ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [floating, lift]);

  useEffect(() => {
    Animated.timing(focus, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // colours cannot run on the native driver
    }).start();
  }, [focused, focus]);

  const borderColor = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });
  const labelColor = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.textMuted, colors.primary],
  });
  const translateY = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });
  const scale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.78],
  });

  return (
    <Animated.View style={[styles.wrap, { borderColor }]}>
      {/* Separate nodes: the label's transform is native, its colour is not. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.labelWrap, { transform: [{ translateY }, { scale }] }]}
      >
        <Animated.Text style={[styles.label, { color: labelColor }]}>
          {label}
        </Animated.Text>
      </Animated.View>

      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        secureTextEntry={password && hidden}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        {...rest}
      />

      {password && (
        <Pressable
          onPress={() => setHidden(h => !h)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        >
          <EyeIcon off={!hidden} size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  labelWrap: {
    position: 'absolute',
    left: 16,
    transformOrigin: 'left',
  },
  label: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    height: 60,
    paddingTop: 20,
    paddingBottom: 4,
    paddingVertical: 0,
    fontSize: 16,
    color: colors.text,
  },
});
