import { NativeModules, Platform } from 'react-native';
import type { InstalledApp } from '../types';

const { InstalledApps } = NativeModules;

/** Listing installed apps is only implemented natively on Android. */
export const isInstalledAppsSupported =
  Platform.OS === 'android' && InstalledApps != null;

export async function getInstalledApps(): Promise<InstalledApp[]> {
  if (!isInstalledAppsSupported) {
    throw new Error('Listing installed apps is only supported on Android.');
  }
  return InstalledApps.getInstalledApps();
}
