import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  EMPTY_STATUS,
  ProtectionStatus,
  Schedule,
  Schedules,
  UsageToday,
  getSchedules,
  getStatus,
  getUsageToday,
  requestNotificationPermission,
  setSchedule as setScheduleNative,
  setProtectionEnabled,
  syncService,
} from '../native/FocusLock';
import { hasAnyLimit } from '../utils/schedule';

const POLL_MS = 5000;

const sameRecord = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(key => a[key] === b[key])
  );
};

// Schedule values are nested objects, so a fresh poll result is never === the
// previous one even when unchanged; compare by value instead to avoid a
// re-render every 5s.
const sameSchedules = (a: Schedules, b: Schedules) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(key => JSON.stringify(a[key]) === JSON.stringify(b[key]))
  );
};

/**
 * Limits, today's usage and protection status, kept fresh while the app is open.
 * State only changes when a value did, so the list is not re-rendered for nothing.
 */
export function useFocusLock() {
  const [schedules, setSchedules] = useState<Schedules>({});
  const [usage, setUsage] = useState<UsageToday>({});
  const [status, setStatus] = useState<ProtectionStatus>(EMPTY_STATUS);
  // False until the real status has been read once, so we never act on the placeholder.
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextStatus, nextSchedules, nextUsage] = await Promise.all([
        getStatus(),
        getSchedules(),
        getUsageToday(),
      ]);
      setStatus(prev => (sameRecord(prev, nextStatus) ? prev : nextStatus));
      setSchedules(prev => (sameSchedules(prev, nextSchedules) ? prev : nextSchedules));
      setUsage(prev => (sameRecord(prev, nextUsage) ? prev : nextUsage));
      setReady(true);
    } catch {
      // Keep showing the last known values; the next poll will try again.
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => timer && clearInterval(timer);
    const start = () => {
      stop();
      timer = setInterval(refresh, POLL_MS);
    };

    // Also covers coming back from the Settings screens after granting a permission.
    const onActive = () => {
      syncService().finally(refresh);
      start();
    };
    onActive();

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        onActive();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [refresh]);

  const saveSchedule = useCallback(
    async (packageName: string, schedule: Schedule) => {
      setSchedules(prev => {
        const next = { ...prev };
        if (hasAnyLimit(schedule)) {
          next[packageName] = schedule;
        } else {
          delete next[packageName];
        }
        return next;
      });
      await setScheduleNative(packageName, schedule);
      if (hasAnyLimit(schedule)) {
        requestNotificationPermission();
      }
      refresh();
    },
    [refresh],
  );

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      setStatus(prev => ({ ...prev, enabled }));
      await setProtectionEnabled(enabled);
      refresh();
    },
    [refresh],
  );

  return { schedules, usage, status, ready, saveSchedule, setEnabled };
}
