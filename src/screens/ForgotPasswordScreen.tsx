import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import AuthInput from '../components/auth/AuthInput';
import AuthLayout from '../components/auth/AuthLayout';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useStagger } from '../hooks/useStagger';
import { colors } from '../theme';

type Props = {
  loading: boolean;
  error: string | null;
  sent: boolean;
  onSubmit: (email: string) => void;
  onBack: () => void;
};

export default function ForgotPasswordScreen({
  loading,
  error,
  sent,
  onSubmit,
  onBack,
}: Props) {
  const [email, setEmail] = useState('');
  // header, email/confirmation, error, button, footer
  const stagger = useStagger(5, { delay: 120 });

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll email you a link to set a new one."
      stagger={stagger}
    >
      {sent ? (
        <Animated.View style={stagger[1]}>
          <Text style={styles.confirmation}>
            Check {email || 'your inbox'} for a link to reset your password.
          </Text>
        </Animated.View>
      ) : (
        <Animated.View style={stagger[1]}>
          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={() => onSubmit(email)}
          />
        </Animated.View>
      )}
      {error && (
        <Animated.View style={stagger[2]}>
          <Text style={styles.error}>{error}</Text>
        </Animated.View>
      )}
      {!sent && (
        <Animated.View style={stagger[3]}>
          <PrimaryButton
            label="Send reset link"
            onPress={() => onSubmit(email)}
            loading={loading}
          />
        </Animated.View>
      )}
      <Animated.View style={[styles.footer, stagger[4]]}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.footerLink}>Back to log in</Text>
        </Pressable>
      </Animated.View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  confirmation: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
  },
});
