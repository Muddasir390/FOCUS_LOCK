import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AnimatedBackground from './src/components/AnimatedBackground';
import SplashScreen from './src/components/SplashScreen';
import { completeAuthRedirect, isPasswordRecovery } from './src/lib/oauth';
import { supabase } from './src/lib/supabase';
import AuthFlow from './src/screens/AuthFlow';
import HomeScreen from './src/screens/HomeScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

type Stage = 'splash' | 'auth' | 'reset-password' | 'home';

function App() {
  const [stage, setStage] = useState<Stage>('splash');
  const [hasSession, setHasSession] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const splashDone = useRef(false);

  const advancePastSplash = useCallback(() => {
    splashDone.current = true;
    setStage(current =>
      current === 'splash' ? (hasSession ? 'home' : 'auth') : current,
    );
  }, [hasSession]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      if (splashDone.current) {
        setStage(current =>
          current === 'splash' ? (data.session ? 'home' : 'auth') : current,
        );
      }
    });
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!isPasswordRecovery(url)) return;
      try {
        await completeAuthRedirect(url);
        setResetError(null);
        setStage('reset-password');
      } catch (err) {
        setResetError(
          err instanceof Error ? err.message : 'That reset link is invalid.',
        );
      }
    };

    Linking.getInitialURL().then(url => {
      if (url) handleUrl(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) =>
      handleUrl(url),
    );
    return () => subscription.remove();
  }, []);

  const finishSplash = useCallback(advancePastSplash, [advancePastSplash]);
  const finishAuth = useCallback(() => setStage('home'), []);
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setStage('auth');
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    setResetError(null);
    setResetLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setResetLoading(false);
    if (error) {
      setResetError(error.message);
      return;
    }
    setStage('home');
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Drifts during the splash, then holds still to save battery. */}
        <AnimatedBackground animated={stage === 'splash'} />
        {stage === 'splash' && <SplashScreen onFinish={finishSplash} />}
        {stage === 'auth' && <AuthFlow onAuthenticated={finishAuth} />}
        {stage === 'reset-password' && (
          <ResetPasswordScreen
            loading={resetLoading}
            error={resetError}
            onSubmit={updatePassword}
          />
        )}
        {stage === 'home' && <HomeScreen onLogout={logout} />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
