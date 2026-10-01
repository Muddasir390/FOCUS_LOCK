import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, StyleSheet } from 'react-native';
import { AUTH_REDIRECT_URL } from '../config/supabase';
import { signInWithProvider } from '../lib/oauth';
import { supabase } from '../lib/supabase';
import {
  validateEmail,
  validateName,
  validateNewPassword,
  validateRequiredPassword,
} from '../lib/validation';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';

type Mode = 'login' | 'signup' | 'forgot';

function messageFor(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export default function AuthFlow({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const exit = useRef(new Animated.Value(1)).current;
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setResetSent(false);
  }, []);

  const finish = useCallback(() => {
    Animated.timing(exit, {
      toValue: 0,
      duration: 320,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onAuthenticated();
    });
  }, [exit, onAuthenticated]);

  const login = useCallback(
    async (email: string, password: string) => {
      Keyboard.dismiss();
      const validationError =
        validateEmail(email) ?? validateRequiredPassword(password);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!mounted.current) return;
      setLoading(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      finish();
    },
    [finish],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      Keyboard.dismiss();
      const validationError =
        validateName(name) ??
        validateEmail(email) ??
        validateNewPassword(password);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setLoading(true);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: AUTH_REDIRECT_URL,
        },
      });
      if (!mounted.current) return;
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        finish();
        return;
      }
      // Email confirmation is on for this project: no session until the link is clicked.
      switchMode('login');
      setNotice('Check your email to confirm your account, then log in.');
    },
    [finish, switchMode],
  );

  const requestReset = useCallback(async (email: string) => {
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: AUTH_REDIRECT_URL },
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
  }, []);

  const oauth = useCallback(
    async (provider: 'google' | 'facebook') => {
      setError(null);
      setLoading(true);
      try {
        await signInWithProvider(provider);
        finish();
      } catch (err) {
        if (mounted.current) setError(messageFor(err));
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [finish],
  );

  const scale = exit.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <Animated.View
      style={[styles.root, { opacity: exit, transform: [{ scale }] }]}
    >
      {mode === 'login' && (
        <LoginScreen
          key="login"
          loading={loading}
          error={error}
          notice={notice}
          onSubmit={login}
          onSwitch={() => switchMode('signup')}
          onForgot={() => switchMode('forgot')}
          onGoogle={() => oauth('google')}
          onFacebook={() => oauth('facebook')}
        />
      )}
      {mode === 'signup' && (
        <SignupScreen
          key="signup"
          loading={loading}
          error={error}
          onSubmit={signup}
          onSwitch={() => switchMode('login')}
          onGoogle={() => oauth('google')}
          onFacebook={() => oauth('facebook')}
        />
      )}
      {mode === 'forgot' && (
        <ForgotPasswordScreen
          key="forgot"
          loading={loading}
          error={error}
          sent={resetSent}
          onSubmit={requestReset}
          onBack={() => switchMode('login')}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
