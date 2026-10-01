import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useLoopValue } from '../hooks/useLoopValue';
import { colors } from '../theme';
import { Glow } from './AnimatedBackground';

const LOGO_SIZE = 132;

function PulseRing({ delay }: { delay: number }) {
  const pulse = useLoopValue(2200, { delay });
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.3],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <Animated.View style={[styles.ring, { opacity, transform: [{ scale }] }]} />
  );
}

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTilt = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleShift = useRef(new Animated.Value(18)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(logoTilt, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(titleShift, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]);

    sequence.start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });
    return () => sequence.stop();
  }, [
    onFinish,
    logoScale,
    logoTilt,
    logoOpacity,
    titleOpacity,
    titleShift,
    taglineOpacity,
    screenOpacity,
  ]);

  const rotate = logoTilt.interpolate({
    inputRange: [0, 1],
    outputRange: ['-25deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <View style={styles.center}>
        <Glow size={420} color={colors.primary} style={styles.halo} />
        <PulseRing delay={0} />
        <PulseRing delay={1100} />
        <Animated.Image
          source={require('../assets/logo.png')}
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { rotate }],
            },
          ]}
        />
      </View>

      <Animated.Text
        style={[
          styles.title,
          { opacity: titleOpacity, transform: [{ translateY: titleShift }] },
        ]}
      >
        FocusLock
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Take back your time
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE * 0.3,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE * 0.25,
  },
  title: {
    marginTop: 40,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.text,
  },
  tagline: {
    marginTop: 8,
    fontSize: 16,
    color: colors.textMuted,
  },
});
