import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppCard from '../components/AppCard';
import CategoryChips, { CategoryFilter } from '../components/CategoryChips';
import EmptyState from '../components/EmptyState';
import { AppFilter } from '../components/FilterChips';
import FilterSheet from '../components/FilterSheet';
import LimitSheet from '../components/LimitSheet';
import PausedBanner from '../components/PausedBanner';
import ProtectionSwitch from '../components/ProtectionSwitch';
import SearchBar from '../components/SearchBar';
import SetupBanner from '../components/SetupBanner';
import SkeletonList from '../components/SkeletonList';
import { getAppCategory } from '../data/appCategories';
import { useCategoryOverrides } from '../hooks/useCategoryOverrides';
import { useFocusLock } from '../hooks/useFocusLock';
import { useInstalledApps } from '../hooks/useInstalledApps';
import {
  isFocusLockSupported,
  openAppInfoSettings,
  openOverlaySettings,
  openUsageAccessSettings,
  Schedule,
} from '../native/FocusLock';
import { colors, radius } from '../theme';
import type { InstalledApp } from '../types';
import {
  EMPTY_SCHEDULE,
  effectiveMinutesFor,
  hasAnyLimit,
  isBlockedByTimeWindow,
} from '../utils/schedule';

type Permission = 'usage' | 'overlay';

const PERMISSION_PROMPTS: Record<
  Permission,
  { title: string; message: string; open: () => void }
> = {
  usage: {
    title: 'Allow usage access',
    message:
      'FocusLock needs this to count how long you use each app.\n\nOn the next screen, turn on "Permit usage access" for FocusLock.',
    open: openUsageAccessSettings,
  },
  overlay: {
    title: 'Allow display over other apps',
    message:
      'FocusLock needs this to show the lock screen when your time is up.\n\nOn the next screen, turn on "Allow display over other apps" for FocusLock.',
    open: openOverlaySettings,
  },
};

function promptForPermission(permission: Permission) {
  const { title, message, open } = PERMISSION_PROMPTS[permission];
  Alert.alert(title, message, [
    { text: 'Later', style: 'cancel' },
    { text: 'Open settings', onPress: open },
  ]);
}

export default function HomeScreen({ onLogout }: { onLogout: () => void }) {
  const insets = useSafeAreaInsets();
  const { apps, loading, refreshing, error, refresh } = useInstalledApps();
  const { schedules, usage, status, ready, saveSchedule, setEnabled } =
    useFocusLock();
  const scheduleFor = useCallback(
    (packageName: string) => schedules[packageName] ?? EMPTY_SCHEDULE,
    [schedules],
  );
  const {
    overrides: categoryOverrides,
    setOverride: setCategoryOverride,
    clearOverride: clearCategoryOverride,
  } = useCategoryOverrides();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AppFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [editing, setEditing] = useState<InstalledApp | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [enter]);
  const headerShift = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 0],
  });

  const counts = useMemo(() => {
    const system = apps.filter(app => app.isSystem).length;
    const limited = apps.filter(app => hasAnyLimit(scheduleFor(app.packageName))).length;
    return { all: apps.length, limited, user: apps.length - system, system };
  }, [apps, scheduleFor]);

  const categoryCounts = useMemo(() => {
    const counted: Record<CategoryFilter, number> = {
      all: apps.length,
      social: 0,
      banking: 0,
      games: 0,
      productivity: 0,
      entertainment: 0,
      communication: 0,
      shopping: 0,
      other: 0,
    };
    for (const app of apps) {
      counted[getAppCategory(app, categoryOverrides)]++;
    }
    return counted;
  }, [apps, categoryOverrides]);

  const visibleApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = apps.filter(app => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'limited' && hasAnyLimit(scheduleFor(app.packageName))) ||
        (filter === 'user' && !app.isSystem) ||
        (filter === 'system' && app.isSystem);
      const matchesCategory =
        category === 'all' ||
        getAppCategory(app, categoryOverrides) === category;
      const matchesQuery =
        q === '' ||
        app.appName.toLowerCase().includes(q) ||
        app.packageName.toLowerCase().includes(q);
      return matchesFilter && matchesCategory && matchesQuery;
    });
    // Apps with a limit come first; the rest keep their alphabetical order.
    return [
      ...matches.filter(app => hasAnyLimit(scheduleFor(app.packageName))),
      ...matches.filter(app => !hasAnyLimit(scheduleFor(app.packageName))),
    ];
  }, [apps, filter, category, query, scheduleFor, categoryOverrides]);

  const setupDone = status.usageAccess && status.overlay;
  const nextPermission: Permission | null = !status.usageAccess
    ? 'usage'
    : !status.overlay
    ? 'overlay'
    : null;
  const paused = setupDone && !status.enabled && counts.limited > 0;

  // Pop up once for each permission that is still missing (again after granting the first).
  const prompted = useRef(new Set<Permission>());
  useEffect(() => {
    if (
      !isFocusLockSupported ||
      !ready ||
      !nextPermission ||
      prompted.current.has(nextPermission)
    ) {
      return;
    }
    prompted.current.add(nextPermission);
    promptForPermission(nextPermission);
  }, [ready, nextPermission]);
  const protecting = setupDone && status.enabled && counts.limited > 0;

  const subtitle = loading
    ? 'Scanning your apps…'
    : `${counts.all} apps · ${counts.limited} limited`;

  const switchLabel = !setupDone
    ? 'Setup needed'
    : status.enabled
    ? protecting
      ? 'Protected'
      : 'On'
    : 'Paused';

  const handleSave = (schedule: Schedule) => {
    if (editing) {
      saveSchedule(editing.packageName, schedule);
      if (nextPermission) {
        // A limit does nothing until both permissions are granted, so ask again.
        promptForPermission(nextPermission);
      } else if (!status.enabled) {
        // The user clearly wants this limit enforced, so turn protection back on.
        setEnabled(true);
      }
    }
    setEditing(null);
  };

  const handleRemove = () => {
    if (editing) {
      saveSchedule(editing.packageName, EMPTY_SCHEDULE);
    }
    setEditing(null);
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <Animated.View style={[styles.root, { opacity: enter }]}>
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 14,
            transform: [{ translateY: headerShift }],
          },
        ]}
      >
        <View style={styles.brandRow}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.brandLogo}
          />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>FocusLock</Text>
            <Text style={styles.brandSubtitle}>{subtitle}</Text>
          </View>
          {isFocusLockSupported && (
            <ProtectionSwitch
              value={status.enabled && setupDone}
              disabled={!setupDone}
              label={switchLabel}
              onValueChange={setEnabled}
            />
          )}
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBarWrap}>
            <SearchBar value={query} onChangeText={setQuery} />
          </View>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={styles.filterButton}
            accessibilityLabel="Filters"
          >
            <View style={styles.filterIcon}>
              <View style={[styles.filterIconLine, styles.filterIconLineLong]} />
              <View style={[styles.filterIconLine, styles.filterIconLineMid]} />
              <View style={[styles.filterIconLine, styles.filterIconLineShort]} />
            </View>
            {filter !== 'all' && <View style={styles.filterDot} />}
          </Pressable>
        </View>

        {apps.length > 0 && (
          <CategoryChips
            value={category}
            counts={categoryCounts}
            onChange={setCategory}
          />
        )}
      </Animated.View>

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={visibleApps}
          keyExtractor={app => app.packageName}
          renderItem={({ item, index }) => (
            <AppCard
              app={item}
              index={index}
              limitMinutes={effectiveMinutesFor(scheduleFor(item.packageName), new Date())}
              usedMs={usage[item.packageName] ?? 0}
              timeBlocked={isBlockedByTimeWindow(scheduleFor(item.packageName), new Date())}
              onPress={setEditing}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={10}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListHeaderComponent={
            isFocusLockSupported && !setupDone ? (
              <SetupBanner
                usageAccess={status.usageAccess}
                overlay={status.overlay}
                onAllowUsageAccess={openUsageAccessSettings}
                onAllowOverlay={openOverlaySettings}
                onOpenAppInfo={openAppInfoSettings}
              />
            ) : paused ? (
              <PausedBanner onResume={() => setEnabled(true)} />
            ) : undefined
          }
          ListEmptyComponent={
            apps.length === 0 && error ? (
              <EmptyState
                icon="⚠️"
                title="Couldn't load your apps"
                message={error}
                actionLabel="Try again"
                onAction={refresh}
              />
            ) : (
              <EmptyState
                icon="🔍"
                title="No apps found"
                message={
                  filter === 'limited' && query === ''
                    ? 'Tap any app to give it a daily time limit.'
                    : 'Try a different name or filter.'
                }
              />
            )
          }
          ListFooterComponent={
            <Pressable
              onPress={confirmLogout}
              hitSlop={8}
              style={styles.logoutRow}
            >
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          }
        />
      )}

      <LimitSheet
        app={editing}
        schedule={editing ? scheduleFor(editing.packageName) : EMPTY_SCHEDULE}
        usedMs={editing ? usage[editing.packageName] ?? 0 : 0}
        category={editing ? getAppCategory(editing, categoryOverrides) : 'other'}
        categoryIsOverridden={
          editing ? editing.packageName in categoryOverrides : false
        }
        onSave={handleSave}
        onRemove={handleRemove}
        onSelectCategory={cat => {
          if (editing) setCategoryOverride(editing.packageName, cat);
        }}
        onResetCategory={() => {
          if (editing) clearCategoryOverride(editing.packageName);
        }}
        onClose={() => setEditing(null)}
      />

      <FilterSheet
        visible={filtersOpen}
        filter={filter}
        filterCounts={counts}
        onChangeFilter={setFilter}
        onClose={() => setFiltersOpen(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandText: {
    flex: 1,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  brandSubtitle: {
    marginTop: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarWrap: {
    flex: 1,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterIcon: {
    gap: 4,
    alignItems: 'flex-start',
  },
  filterIconLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textMuted,
  },
  filterIconLineLong: {
    width: 16,
  },
  filterIconLineMid: {
    width: 11,
  },
  filterIconLineShort: {
    width: 6,
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  logoutRow: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
