import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { radius, ThemeColors } from '../theme';

type PlanId = 'monthly' | 'yearly' | 'lifetime';

type Plan = {
  id: PlanId;
  label: string;
  price: string;
  period: string;
  badge?: string;
  subtext?: string;
};

const PLANS: Plan[] = [
  { id: 'monthly', label: 'Monthly', price: '$4.99', period: '/ month' },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$29.99',
    period: '/ year',
    badge: 'Best value',
    subtext: '≈ $2.49 / month',
  },
  { id: 'lifetime', label: 'Lifetime', price: '$59.99', period: 'one-time' },
];

const FEATURES = [
  'A daily time limit for any app',
  'Date-specific & recurring schedules',
  'PIN-protected limits',
  'Light & dark themes',
];

/**
 * The recommended plan gets a real gradient fill, not just a tinted background.
 * `planInner`'s height comes from its text content, not a fixed/screen-filling
 * size, so a plain `StyleSheet.absoluteFill` SVG races that layout pass and can
 * size itself to a stale (too-short) measurement -- measuring via onLayout and
 * passing explicit pixel dimensions to the SVG avoids that.
 */
function PlanCard({
  plan,
  active,
  colors,
  styles,
  onPress,
}: {
  plan: Plan;
  active: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <Pressable onPress={onPress} style={[styles.planWrap, active && styles.planWrapActive]}>
      <View
        style={[styles.planInner, active && styles.planInnerActive]}
        onLayout={e => setSize(e.nativeEvent.layout)}
      >
        {active && size.width > 0 && size.height > 0 && (
          <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id={`planGradient-${plan.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={1} />
                <Stop offset="100%" stopColor={colors.accent} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect
              x={1}
              y={1}
              width={size.width - 2}
              height={size.height - 2}
              rx={radius.lg - 1}
              fill={`url(#planGradient-${plan.id})`}
              stroke={`url(#planGradient-${plan.id})`}
              strokeWidth={2}
            />
          </Svg>
        )}
        <View style={styles.planRow}>
          <View style={[styles.radio, active && styles.radioActive]}>
            {active && <View style={styles.radioDot} />}
          </View>
          <View style={styles.planMeta}>
            <Text style={[styles.planLabel, active && styles.textOnGradient]}>{plan.label}</Text>
            {plan.subtext && (
              <Text style={[styles.planSubtext, active && styles.subtextOnGradient]}>
                {plan.subtext}
              </Text>
            )}
          </View>
          <View style={styles.priceWrap}>
            <Text style={[styles.price, active && styles.textOnGradient]}>{plan.price}</Text>
            <Text style={[styles.period, active && styles.subtextOnGradient]}>{plan.period}</Text>
          </View>
        </View>
      </View>
      {plan.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{plan.badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function SubscriptionScreen({ onConfirm }: { onConfirm: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<PlanId>('yearly');

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="subGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.5} />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity={0.18} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#subGradient)" />
        </Svg>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 28, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Text style={styles.heroIcon}>🔓</Text>
          </View>
          <Text style={styles.title}>Choose your plan</Text>
          <Text style={styles.subtitle}>Unlock full access to FocusLock</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map(feature => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.checkIcon}>
                <Text style={styles.checkIconText}>✓</Text>
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              active={plan.id === selected}
              colors={colors}
              styles={styles}
              onPress={() => setSelected(plan.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { zIndex: 10, elevation: 10 }]}>
        <Pressable style={styles.confirm} onPress={onConfirm}>
          <Text style={styles.confirmText}>Confirm</Text>
        </Pressable>
        <Text style={[styles.note, { marginBottom: insets.bottom + 16 }]}>
          Cancel anytime.
        </Text>
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
    hero: {
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    iconBadge: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
      marginBottom: 18,
    },
    heroIcon: {
      fontSize: 40,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 6,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    features: {
      marginTop: 28,
      marginHorizontal: 32,
      gap: 12,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    checkIconText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    featureText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    plans: {
      marginTop: 28,
      paddingHorizontal: 20,
      gap: 14,
    },
    planWrap: {
      borderRadius: radius.lg,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 5,
    },
    planWrapActive: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    planInner: {
      padding: 18,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    planInnerActive: {
      borderWidth: 0,
    },
    badge: {
      position: 'absolute',
      top: -10,
      right: 16,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: '#FFFFFF',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },
    planRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: {
      borderColor: '#FFFFFF',
    },
    radioDot: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: '#FFFFFF',
    },
    planMeta: {
      flex: 1,
      marginLeft: 14,
    },
    planLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    planSubtext: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textMuted,
    },
    priceWrap: {
      alignItems: 'flex-end',
    },
    price: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    period: {
      fontSize: 12,
      color: colors.textMuted,
    },
    textOnGradient: {
      color: '#FFFFFF',
    },
    subtextOnGradient: {
      color: 'rgba(255,255,255,0.85)',
    },
    footer: {
      backgroundColor: 'transparent',
    },
    confirm: {
      marginTop: 8,
      marginHorizontal: 24,
      height: 56,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    confirmText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    note: {
      marginTop: 10,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
