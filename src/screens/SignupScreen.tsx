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
  onSubmit: (name: string, email: string, password: string) => void;
  onSwitch: () => void;
  onGoogle: () => void;
  onFacebook: () => void;
};

export default function SignupScreen({
  loading,
  error,
  onSubmit,
  onSwitch,
  onGoogle,
  onFacebook,
}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const submit = () => onSubmit(name, email, password);
  // header, name, email, password, error, button, social, footer
  const stagger = useStagger(8, { delay: 120 });

  return (
    <AuthLayout
      title="Create account"
      subtitle="Set daily limits and take back your time."
      stagger={stagger}
    >
      <Animated.View style={stagger[1]}>
        <AuthInput
          label="Full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
      </Animated.View>
      <Animated.View style={stagger[2]}>
        <AuthInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          inputRef={emailRef}
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
      {error && (
        <Animated.View style={stagger[4]}>
          <Text style={styles.error}>{error}</Text>
        </Animated.View>
      )}
      <Animated.View style={[styles.button, stagger[5]]}>
        <PrimaryButton
          label="Create account"
          onPress={submit}
          loading={loading}
        />
      </Animated.View>
      <Animated.View style={stagger[6]}>
        <SocialRow
          disabled={loading}
          onGoogle={onGoogle}
          onFacebook={onFacebook}
        />
      </Animated.View>
      <Animated.View style={[styles.footer, stagger[7]]}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Pressable onPress={onSwitch} hitSlop={8}>
          <Text style={styles.footerLink}>Log in</Text>
        </Pressable>
      </Animated.View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
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
