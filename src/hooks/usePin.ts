import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256 } from 'js-sha256';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '@focuslock/pinAuth';

type PinRecord = { salt: string; hash: string };

function randomSalt(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}

function hashPin(pin: string, salt: string): string {
  return sha256(`${salt}:${pin}`);
}

/**
 * The single app-wide PIN that guards changing or removing limits. The PIN itself is
 * never stored — only a salted hash — so it can't be read back, only verified.
 */
export function usePin() {
  const [record, setRecord] = useState<PinRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setRecord(JSON.parse(raw));
      setReady(true);
    });
  }, []);

  const hasPin = record != null;

  const setPin = useCallback(async (pin: string) => {
    const salt = randomSalt();
    const next: PinRecord = { salt, hash: hashPin(pin, salt) };
    setRecord(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const verifyPin = useCallback(
    (pin: string) => record != null && hashPin(pin, record.salt) === record.hash,
    [record],
  );

  return { ready, hasPin, setPin, verifyPin };
}
