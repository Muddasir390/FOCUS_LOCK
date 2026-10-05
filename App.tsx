import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AnimatedBackground from './src/components/AnimatedBackground';
import SplashScreen from './src/components/SplashScreen';
import { useOnboardingStatus } from './src/hooks/useOnboardingStatus';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import HomeScreen from './src/screens/HomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';

type Stage = 'splash' | 'onboarding' | 'subscription' | 'home';

function AppContent() {
  const { scheme } = useTheme();
  const [stage, setStage] = useState<Stage>('splash');
  const { complete, markComplete } = useOnboardingStatus();
  const splashDone = useRef(false);

  const advancePastSplash = useCallback(() => {
    splashDone.current = true;
    setStage(current =>
      current === 'splash' ? (complete ? 'home' : 'onboarding') : current,
    );
  }, [complete]);

  useEffect(() => {
    if (splashDone.current) {
      setStage(current =>
        current === 'splash' ? (complete ? 'home' : 'onboarding') : current,
      );
    }
  }, [complete]);

  const finishOnboarding = useCallback(() => setStage('subscription'), []);
  const confirmSubscription = useCallback(() => {
    markComplete();
    setStage('home');
  }, [markComplete]);

  return (
    <>
      <StatusBar barStyle={scheme === 'light' ? 'dark-content' : 'light-content'} />
      <View style={styles.container}>
        {/* Drifts during the splash, then holds still to save battery. */}
        <AnimatedBackground animated={stage === 'splash'} />
        {stage === 'splash' && <SplashScreen onFinish={advancePastSplash} />}
        {stage === 'onboarding' && (
          <OnboardingScreen onDone={finishOnboarding} />
        )}
        {stage === 'subscription' && (
          <SubscriptionScreen onConfirm={confirmSubscription} />
        )}
        {stage === 'home' && <HomeScreen />}
      </View>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
