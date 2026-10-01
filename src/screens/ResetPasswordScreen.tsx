import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextInputInstance } from 'react-native';
import AuthInput from '../components/auth/AuthInput';
import AuthLayout from '../components/auth/AuthLayout';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useStagger } from '../hooks/useStagger';
import { validateNewPassword } from '../lib/validation';
import { colors } from '../theme';

type Props = {
  loading: boolean;
  error: string | null;
  onSubmit: (password: string) => void;
};

/** Shown when the app is opened from the "reset your password" email link. */
export default function ResetPasswordScreen({
  loading,
  error,
  onSubmit,
}: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [attempted, setAttempted] = useState(false);
  const confirmRef = useRef<TextInputInstance>(null);
  // header, password, confirm, error, button
  const stagger = useStagger(5, { delay: 120 });

  const localError =
    validateNewPassword(password) ??
    (password !== confirm ? "Passwords don't match." : null);

  const submit = () => {
    setAttempted(true);
    if (localError) return;
    onSubmit(password);
  };

  const displayError = attempted && localError ? localError : error;

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a new password for your account."
      stagger={stagger}
    >
      <Animated.View style={stagger[1]}>
        <AuthInput
          label="New password"
          value={password}
          onChangeText={setPassword}
          password
          autoCapitalize="none"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
      </Animated.View>
      <Animated.View style={stagger[2]}>
        <AuthInput
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          password
          inputRef={confirmRef}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </Animated.View>
      {displayError && (
        <Animated.View style={stagger[3]}>
          <Text style={styles.error}>{displayError}</Text>
        </Animated.View>
      )}
      <Animated.View style={stagger[4]}>
        <PrimaryButton
          label="Update password"
          onPress={submit}
          loading={loading}
        />
      </Animated.View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
    textAlign: 'center',
  },
});
