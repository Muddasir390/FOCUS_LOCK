import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInputInstance,
} from 'react-native';
import AuthInput from '../components/auth/AuthInput';
import AuthLayout from '../components/auth/AuthLayout';
import PrimaryButton from '../components/auth/PrimaryButton';
import SocialRow from '../components/auth/SocialRow';
import { useStagger } from '../hooks/useStagger';
import { colors } from '../theme';

type Props = {
  loading: boolean;
  error: string | null;
  notice?: string | null;
  onSubmit: (email: string, password: string) => void;
  onSwitch: () => void;
  onForgot: () => void;
  onGoogle: () => void;
  onFacebook: () => void;
};

export default function LoginScreen({
  loading,
  error,
  notice,
  onSubmit,
  onSwitch,
  onForgot,
  onGoogle,
  onFacebook,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInputInstance>(null);
  // header, notice, email, password, forgot, error, button, social, footer
  const stagger = useStagger(9, { delay: 120 });
  const submit = () => onSubmit(email, password);

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to keep your focus on track."
      stagger={stagger}
    >
      {notice && (
        <Animated.View style={stagger[1]}>
          <Text style={styles.notice}>{notice}</Text>
        </Animated.View>
      )}
      <Animated.View style={stagger[2]}>
        <AuthInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
      </Animated.View>
      <Animated.View style={stagger[3]}>
        <AuthInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          password
          inputRef={passwordRef}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </Animated.View>
      <Animated.View style={[styles.forgotRow, stagger[4]]}>
        <Pressable onPress={onForgot} hitSlop={8}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </Pressable>
      </Animated.View>
      {error && (
        <Animated.View style={stagger[5]}>
          <Text style={styles.error}>{error}</Text>
        </Animated.View>
      )}
      <Animated.View style={stagger[6]}>
        <PrimaryButton label="Log in" onPress={submit} loading={loading} />
      </Animated.View>
      <Animated.View style={stagger[7]}>
        <SocialRow
          disabled={loading}
          onGoogle={onGoogle}
          onFacebook={onFacebook}
        />
      </Animated.View>
      <Animated.View style={[styles.footer, stagger[8]]}>
        <Text style={styles.footerText}>New to FocusLock? </Text>
        <Pressable onPress={onSwitch} hitSlop={8}>
          <Text style={styles.footerLink}>Create an account</Text>
        </Pressable>
      </Animated.View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgot: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
    textAlign: 'center',
  },
  notice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
  },
});
