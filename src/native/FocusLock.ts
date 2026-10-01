import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { FocusLock } = NativeModules;

export const isFocusLockSupported =
  Platform.OS === 'android' && FocusLock != null;

export type ProtectionStatus = {
  /** "Usage access" permission: lets us see how long each app is used. */
  usageAccess: boolean;
  /** "Display over other apps" permission: lets us show the lock screen. */
  overlay: boolean;
  /** The user's protection on/off switch. */
  enabled: boolean;
  /** Whether the background monitor is running right now. */
  running: boolean;
};

/** Per-day-of-week minute limits: index 0=Sunday..6=Saturday (matches JS Date.getDay()). 0 = no limit that day. */
export type WeekSchedule = [number, number, number, number, number, number, number];
/** A date-range override: inclusive ISO "YYYY-MM-DD" bounds (start === end for a single date). 0 minutes = fully blocked. */
export type DateOverride = {
  start: string;
  end: string;
  minutes: number;
  /** Optional "HH:mm" 24-hour bounds narrowing this override to part of the day. Always set together; absent = all day. */
  startTime?: string;
  endTime?: string;
};
/** A recurring daily clock-time block, independent of the minute budget. "HH:mm" 24-hour bounds. */
export type DailyWindow = { start: string; end: string };
/** One app's full schedule: a weekly default plus date overrides and an optional daily time block layered on top. */
export type Schedule = {
  byDay: WeekSchedule;
  overrides: DateOverride[];
  /** A recurring daily clock-time block, or null when none is configured. */
  dailyWindow: DailyWindow | null;
};
/** Per-app schedules, keyed by package name. */
export type Schedules = Record<string, Schedule>;
/** Time in the foreground today in milliseconds, keyed by package name. */
export type UsageToday = Record<string, number>;

export const EMPTY_STATUS: ProtectionStatus = {
  usageAccess: false,
  overlay: false,
  enabled: true,
  running: false,
};

export const getStatus = (): Promise<ProtectionStatus> =>
  isFocusLockSupported ? FocusLock.getStatus() : Promise.resolve(EMPTY_STATUS);

export const getSchedules = (): Promise<Schedules> =>
  isFocusLockSupported ? FocusLock.getSchedules() : Promise.resolve({});

export const getUsageToday = (): Promise<UsageToday> =>
  isFocusLockSupported ? FocusLock.getUsageToday() : Promise.resolve({});

/** Sets an app's full schedule. An empty/all-zero schedule removes the limit. */
export const setSchedule = (packageName: string, schedule: Schedule): Promise<void> =>
  isFocusLockSupported
    ? FocusLock.setSchedule(packageName, schedule)
    : Promise.resolve();

export const setProtectionEnabled = (enabled: boolean): Promise<void> =>
  isFocusLockSupported
    ? FocusLock.setProtectionEnabled(enabled)
    : Promise.resolve();

/** Starts or stops the background monitor to match the current settings. */
export const syncService = (): Promise<void> =>
  isFocusLockSupported ? FocusLock.syncService() : Promise.resolve();

export const openUsageAccessSettings = () =>
  isFocusLockSupported && FocusLock.openUsageAccessSettings();

export const openOverlaySettings = () =>
  isFocusLockSupported && FocusLock.openOverlaySettings();

export const openAppInfoSettings = () =>
  isFocusLockSupported && FocusLock.openAppInfoSettings();

/** Android 13+ needs a runtime permission before notifications show. */
export async function requestNotificationPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return;
  }
  await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
}
