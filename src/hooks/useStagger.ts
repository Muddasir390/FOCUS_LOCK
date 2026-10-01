import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Returns `count` animated styles that fade and slide up one after another,
 * for a staggered entrance. Apply each to an Animated.View.
 */
export function useStagger(count: number, { delay = 0, step = 80 } = {}) {
  const values = useRef(
    Array.from({ length: count }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.stagger(
        step,
        values.map(value =>
          Animated.timing(value, {
            toValue: 1,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [values, delay, step]);

  return values.map(value => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  }));
}
