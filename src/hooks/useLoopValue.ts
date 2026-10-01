import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

type Options = {
  /** Animate 0 -> 1 -> 0 instead of jumping back to 0 each cycle. */
  pingPong?: boolean;
  /** Wait this long (ms) before the first cycle. */
  delay?: number;
  /** Pauses the loop (the value stays where it is) while false. */
  enabled?: boolean;
};

/** An endlessly looping 0..1 animated value (native driven). */
export function useLoopValue(
  duration: number,
  { pingPong = false, delay = 0, enabled = true }: Options = {},
) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const forward = Animated.timing(value, {
      toValue: 1,
      duration,
      easing: pingPong ? Easing.inOut(Easing.sin) : Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const back = Animated.timing(value, {
      toValue: 0,
      duration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    });

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(pingPong ? Animated.sequence([forward, back]) : forward),
    ]);
    animation.start();
    return () => animation.stop();
  }, [value, duration, pingPong, delay, enabled]);

  return value;
}
