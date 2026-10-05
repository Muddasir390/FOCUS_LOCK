import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoopValue } from '../hooks/useLoopValue';
import { useTheme } from '../hooks/useTheme';
import { ColorScheme, darkColors, lightColors, radius, ThemeColors } from '../theme';
import { Glow } from '../components/AnimatedBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GradientPair = [keyof ThemeColors, keyof ThemeColors];

type ContentSlideData = {
  kind: 'content';
  icon: string;
  title: string;
  body: string;
  gradient: GradientPair;
};
type ThemeSlideData = { kind: 'theme'; gradient: GradientPair };
type SlideData = ContentSlideData | ThemeSlideData;

const SLIDES: SlideData[] = [
  {
    kind: 'content',
    icon: '🔒',
    title: 'Welcome to FocusLock',
    body: 'Take back your time by setting real limits on the apps that steal it.',
    gradient: ['primary', 'accent'],
  },
  { kind: 'theme', gradient: ['primary', 'accent'] },
  {
    kind: 'content',
    icon: '⏱️',
    title: 'Set a limit for any app',
    body: "Give each app a daily time budget. Once it's used up, FocusLock steps in.",
    gradient: ['primary', 'blue'],
  },
  {
    kind: 'content',
    icon: '🗓️',
    title: 'Block on your schedule',
    body: 'Choose specific dates, or block an app every day between two times — like bedtime.',
    gradient: ['blue', 'accent'],
  },
  {
    kind: 'content',
    icon: '🔐',
    title: 'Stay accountable',
    body: "A PIN protects your limits, so you can't talk yourself out of them in the moment.",
    gradient: ['accent', 'primary'],
  },
];

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.95,
      friction: 6,
      tension: 250,
      useNativeDriver: true,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 250,
      useNativeDriver: true,
    }).start();
  return { scale, onPressIn, onPressOut };
}

function SlideGradient({ from, to }: { from: string; to: string }) {
  const id = useRef(`onboarding-gradient-${from}-${to}`).current;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={from} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={to} stopOpacity={0.25} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * One full-screen gradient per slide, cross-fading in/out by scroll position.
 * These stack behind EVERYTHING (header, carousel, footer) so the background is
 * one continuous surface instead of a gradient confined to just the slide body
 * with a flat, disconnected bar above/below it.
 */
function BackgroundLayer({
  index,
  scrollX,
  colors,
  gradient,
}: {
  index: number;
  scrollX: Animated.Value;
  colors: ThemeColors;
  gradient: GradientPair;
}) {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];
  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
      <SlideGradient from={colors[gradient[0]]} to={colors[gradient[1]]} />
    </Animated.View>
  );
}

/**
 * Transforms shared by every slide's content, all driven off the single shared
 * `scrollX` value relative to this slide's own index -- rather than a one-shot
 * entrance animation, this makes the carousel react live to the finger (incoming
 * content grows/fades in, outgoing shrinks/fades out as you drag).
 */
function useParallax(scrollX: Animated.Value, index: number) {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];
  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.75, 1, 0.75],
    extrapolate: 'clamp',
  });
  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [26, 0, 26],
    extrapolate: 'clamp',
  });
  return { opacity, scale, translateY };
}

/** A gentle, endless up/down bob so the icon never sits perfectly still. */
function useFloat() {
  const loop = useLoopValue(2400, { pingPong: true });
  return loop.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
}

function ContentSlideView({
  slide,
  colors,
  index,
  scrollX,
}: {
  slide: ContentSlideData;
  colors: ThemeColors;
  index: number;
  scrollX: Animated.Value;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { opacity, scale, translateY } = useParallax(scrollX, index);
  const floatY = useFloat();
  const glowPulse = useLoopValue(2800, { pingPong: true });
  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
  const fromColor = colors[slide.gradient[0]];

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      {/* Separate nodes: the scroll-driven opacity/scale is JS-driven (it shares
          scrollX with width/color interpolations elsewhere), the idle float and
          glow pulse are native-driven -- none of these can share a transform/opacity
          node with a JS-driven one. */}
      <Animated.View style={[styles.iconWrap, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.iconBadge, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
          <Animated.View style={{ transform: [{ translateY: floatY }] }}>
            <Animated.View style={{ opacity: glowOpacity }}>
              <Glow size={190} color={fromColor} style={styles.glow} />
            </Animated.View>
            <Text style={styles.icon}>{slide.icon}</Text>
          </Animated.View>
        </View>
      </Animated.View>
      <Animated.Text style={[styles.title, { opacity, transform: [{ translateY }] }]}>
        {slide.title}
      </Animated.Text>
      <Animated.Text style={[styles.body, { opacity, transform: [{ translateY }] }]}>
        {slide.body}
      </Animated.Text>
    </View>
  );
}

function ThemePreviewCard({
  label,
  colors,
  previewColors,
  active,
  accentColor,
  onPress,
}: {
  label: string;
  colors: ThemeColors;
  previewColors: ThemeColors;
  active: boolean;
  accentColor: string;
  onPress: () => void;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.themeCard,
          {
            backgroundColor: previewColors.bg,
            borderColor: active ? accentColor : previewColors.border,
            transform: [{ scale }],
          },
        ]}
      >
        {active && (
          <View style={[styles.checkBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}
        <View style={[styles.previewHeader, { backgroundColor: previewColors.surface }]}>
          <View style={[styles.previewDot, { backgroundColor: previewColors.primary }]} />
          <View style={[styles.previewLine, { backgroundColor: previewColors.textMuted }]} />
        </View>
        <View
          style={[
            styles.previewCard,
            { backgroundColor: previewColors.surface, borderColor: previewColors.border },
          ]}
        >
          <View style={[styles.previewLineShort, { backgroundColor: previewColors.text }]} />
          <View
            style={[
              styles.previewLineShort,
              styles.previewLineMuted,
              { backgroundColor: previewColors.textMuted },
            ]}
          />
        </View>
        <Text style={[styles.themeCardLabel, { color: previewColors.text }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function ThemeSlideView({
  colors,
  scheme,
  setScheme,
  index,
  scrollX,
}: {
  colors: ThemeColors;
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
  index: number;
  scrollX: Animated.Value;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { opacity, scale, translateY } = useParallax(scrollX, index);

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <Animated.Text style={[styles.icon, styles.iconNoBadge, { opacity, transform: [{ scale }] }]}>
        🎨
      </Animated.Text>
      <Animated.Text style={[styles.title, { opacity, transform: [{ translateY }] }]}>
        Make it yours
      </Animated.Text>
      <Animated.Text style={[styles.body, { opacity, transform: [{ translateY }] }]}>
        Choose how FocusLock looks. You can always change this later.
      </Animated.Text>
      <Animated.View style={[styles.themeRow, { opacity, transform: [{ translateY }] }]}>
        <ThemePreviewCard
          label="Light"
          colors={colors}
          previewColors={lightColors}
          active={scheme === 'light'}
          accentColor={colors.primary}
          onPress={() => setScheme('light')}
        />
        <ThemePreviewCard
          label="Dark"
          colors={colors}
          previewColors={darkColors}
          active={scheme === 'dark'}
          accentColor={colors.primary}
          onPress={() => setScheme('dark')}
        />
      </Animated.View>
    </View>
  );
}

function Dot({
  colors,
  index,
  scrollX,
}: {
  colors: ThemeColors;
  index: number;
  scrollX: Animated.Value;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];
  const width = scrollX.interpolate({
    inputRange,
    outputRange: [8, 20, 8],
    extrapolate: 'clamp',
  });
  const backgroundColor = scrollX.interpolate({
    inputRange,
    outputRange: [colors.surfaceAlt, colors.primary, colors.surfaceAlt],
    extrapolate: 'clamp',
  });
  return <Animated.View style={[styles.dot, { width, backgroundColor }]} />;
}

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors, scheme, setScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }, // also drives width/color interpolations, which can't be native
  );

  const goToIndex = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setIndex(next);
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  };

  const handleNext = () => {
    if (isLast) {
      onDone();
    } else {
      goToIndex(index + 1);
    }
  };

  const progressWidth = scrollX.interpolate({
    inputRange: [0, (SLIDES.length - 1) * SCREEN_WIDTH],
    outputRange: [`${(1 / SLIDES.length) * 100}%`, '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {SLIDES.map((slide, i) => (
          <BackgroundLayer
            key={i}
            index={i}
            scrollX={scrollX}
            colors={colors}
            gradient={slide.gradient}
          />
        ))}
      </View>

      <View style={[styles.topRow, { paddingTop: insets.top + 10 }]}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth, backgroundColor: colors.primary },
            ]}
          />
        </View>
        <Pressable onPress={onDone} hitSlop={10}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {SLIDES.map((slide, i) =>
          slide.kind === 'theme' ? (
            <ThemeSlideView
              key={i}
              colors={colors}
              scheme={scheme}
              setScheme={setScheme}
              index={i}
              scrollX={scrollX}
            />
          ) : (
            <ContentSlideView
              key={i}
              slide={slide}
              colors={colors}
              index={i}
              scrollX={scrollX}
            />
          ),
        )}
      </ScrollView>

      {/* zIndex/elevation: forces this above the ScrollView for touch priority,
          not just paint order -- a plain sibling-after-in-JSX order wasn't enough
          on Android for the button underneath to reliably receive taps. */}
      <View style={[styles.footer, { zIndex: 10, elevation: 10 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} colors={colors} index={i} scrollX={scrollX} />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </Pressable>
        <View style={{ height: insets.bottom + 20 }} />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
    },
    scrollView: {
      flex: 1,
    },
    progressTrack: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(128,128,150,0.25)',
      overflow: 'hidden',
    },
    progressFill: {
      height: 4,
      borderRadius: 2,
    },
    skipText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 36,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 28,
    },
    iconBadge: {
      width: 160,
      height: 160,
      borderRadius: 80,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
    },
    glow: {
      position: 'absolute',
    },
    icon: {
      fontSize: 64,
    },
    iconNoBadge: {
      marginBottom: 28,
    },
    title: {
      fontSize: 25,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    body: {
      marginTop: 12,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      textAlign: 'center',
      maxWidth: 300,
    },
    footer: {
      backgroundColor: 'transparent',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginBottom: 20,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    button: {
      marginHorizontal: 24,
      height: 56,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    themeRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 28,
    },
    themeCard: {
      width: 132,
      padding: 14,
      borderRadius: 20,
      borderWidth: 2,
      alignItems: 'center',
      gap: 10,
    },
    previewHeader: {
      width: '100%',
      height: 22,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      gap: 6,
    },
    previewDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    previewLine: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      opacity: 0.6,
    },
    previewCard: {
      width: '100%',
      borderRadius: 10,
      borderWidth: 1,
      padding: 8,
      gap: 6,
    },
    previewLineShort: {
      height: 6,
      borderRadius: 3,
      width: '70%',
    },
    previewLineMuted: {
      width: '45%',
      opacity: 0.6,
    },
    themeCardLabel: {
      fontSize: 14,
      fontWeight: '700',
      marginTop: 2,
    },
    checkBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    checkText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
  });
}
