import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, DateData } from 'react-native-calendars';
import type { MarkedDates, Theme } from 'react-native-calendars/src/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { DateOverride, Schedule, WeekSchedule } from '../native/FocusLock';
import { radius, ThemeColors } from '../theme';
import type { InstalledApp } from '../types';
import { effectiveMinutesFor, hasAnyLimit, isBlockedByTimeWindow, toIsoDate } from '../utils/schedule';
import {
  dateToHHmm,
  formatDuration,
  formatMinutes,
  formatTimeLabel,
  hhmmToDate,
  stepLimit,
} from '../utils/time';

type Props = {
  /** The app being edited; null keeps the sheet closed. */
  app: InstalledApp | null;
  /** The app's saved schedule, or an empty one when it has no limit. */
  schedule: Schedule;
  /** Time spent in the app today, in milliseconds. */
  usedMs: number;
  onSave: (schedule: Schedule) => void;
  onRemove: () => void;
  onClose: () => void;
};

const DEFAULT_LIMIT = 30;
const PRESETS = [15, 30, 60, 120];

function createCalendarTheme(colors: ThemeColors): Theme {
  return {
    backgroundColor: colors.surface,
    calendarBackground: colors.surface,
    textSectionTitleColor: colors.textMuted,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: colors.accent,
    dayTextColor: colors.text,
    textDisabledColor: colors.textMuted,
    arrowColor: colors.primary,
    monthTextColor: colors.text,
    indicatorColor: colors.primary,
    textDayFontWeight: '600',
    textMonthFontWeight: '800',
    textDayHeaderFontWeight: '700',
  };
}

/** Every ISO date from `start` to `end`, inclusive. */
function datesBetween(start: string, end: string): string[] {
  const result: string[] = [];
  let cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last) {
    result.push(toIsoDate(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return result;
}

function markRange(
  start: string | null,
  end: string | null,
  colors: ThemeColors,
): MarkedDates {
  if (!start) return {};
  const days = datesBetween(start, end ?? start);
  const marks: MarkedDates = {};
  days.forEach((day, i) => {
    const isEdge = i === 0 || i === days.length - 1;
    marks[day] = {
      color: isEdge ? colors.primary : colors.primarySoft,
      textColor: isEdge ? '#FFFFFF' : colors.text,
      startingDay: i === 0,
      endingDay: i === days.length - 1,
    };
  });
  return marks;
}

function formatDateLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function createRoundButtonStyles(colors: ThemeColors) {
  return StyleSheet.create({
    round: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    roundText: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '600',
      color: colors.text,
    },
  });
}

function RoundButton({
  label,
  colors,
  onPress,
}: {
  label: string;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const styles = useMemo(() => createRoundButtonStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      friction: 6,
      tension: 250,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springTo(0.85)}
      onPressOut={() => springTo(1)}
      accessibilityLabel={label === '+' ? 'Increase limit' : 'Decrease limit'}
    >
      <Animated.View style={[styles.round, { transform: [{ scale }] }]}>
        <Text style={styles.roundText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Bottom sheet for choosing an app's daily limit plus date-specific overrides. */
export default function LimitSheet({
  app,
  schedule,
  usedMs,
  onSave,
  onRemove,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const calendarTheme = useMemo(() => createCalendarTheme(colors), [colors]);
  const [shown, setShown] = useState<InstalledApp | null>(app);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'edit' | 'addDate'>('edit');

  const [byDay, setByDay] = useState<WeekSchedule>([
    DEFAULT_LIMIT,
    DEFAULT_LIMIT,
    DEFAULT_LIMIT,
    DEFAULT_LIMIT,
    DEFAULT_LIMIT,
    DEFAULT_LIMIT,
    DEFAULT_LIMIT,
  ]);
  const [overrides, setOverrides] = useState<DateOverride[]>([]);

  // Draft for the date-override being added.
  const [pickStart, setPickStart] = useState<string | null>(null);
  const [pickEnd, setPickEnd] = useState<string | null>(null);
  const [overrideMinutes, setOverrideMinutes] = useState(DEFAULT_LIMIT);
  const [overrideAllDay, setOverrideAllDay] = useState(true);
  const [overrideStartTime, setOverrideStartTime] = useState('09:00');
  const [overrideEndTime, setOverrideEndTime] = useState('17:00');

  // Standalone recurring daily time block.
  const [dailyWindowEnabled, setDailyWindowEnabled] = useState(false);
  const [dailyWindowStart, setDailyWindowStart] = useState('22:00');
  const [dailyWindowEnd, setDailyWindowEnd] = useState('07:00');

  const open = useRef(new Animated.Value(0)).current;
  const bump = useRef(new Animated.Value(1)).current;

  // Slide in when an app is picked, slide out when it is cleared.
  useEffect(() => {
    if (app) {
      setShown(app);
      setMode('edit');
      if (hasAnyLimit(schedule)) {
        setByDay(schedule.byDay);
        setOverrides(schedule.overrides);
      } else {
        setByDay([
          DEFAULT_LIMIT,
          DEFAULT_LIMIT,
          DEFAULT_LIMIT,
          DEFAULT_LIMIT,
          DEFAULT_LIMIT,
          DEFAULT_LIMIT,
          DEFAULT_LIMIT,
        ]);
        setOverrides([]);
      }
      setDailyWindowEnabled(schedule.dailyWindow != null);
      setDailyWindowStart(schedule.dailyWindow?.start ?? '22:00');
      setDailyWindowEnd(schedule.dailyWindow?.end ?? '07:00');
      setMounted(true);
      Animated.spring(open, {
        toValue: 1,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(open, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
    }
    // Only re-run when a different app is opened, not when the saved schedule changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, open]);

  // The stepper edits the daily limit (every day alike) in edit mode, or the
  // in-progress override's minutes while adding a date.
  const stepperValue = mode === 'addDate' ? overrideMinutes : byDay[0];

  const setStepperValue = (next: number) => {
    if (mode === 'addDate') {
      setOverrideMinutes(next);
      return;
    }
    setByDay([next, next, next, next, next, next, next]);
  };

  // Pop the big number whenever the value changes.
  useEffect(() => {
    bump.setValue(0.88);
    Animated.spring(bump, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [stepperValue, bump]);

  const translateY = open.interpolate({
    inputRange: [0, 1],
    outputRange: [520, 0],
  });
  const backdropOpacity = open.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.65],
  });

  const draftSchedule: Schedule = {
    byDay,
    overrides,
    dailyWindow: dailyWindowEnabled ? { start: dailyWindowStart, end: dailyWindowEnd } : null,
  };
  const draftEffectiveMinutes = effectiveMinutesFor(draftSchedule, new Date());
  const alreadyOverMinutes = usedMs >= draftEffectiveMinutes * 60_000;
  const draftTimeBlocked = isBlockedByTimeWindow(draftSchedule, new Date());

  const pickTime = (initial: string, onPick: (hhmm: string) => void) => {
    DateTimePickerAndroid.open({
      value: hhmmToDate(initial),
      mode: 'time',
      is24Hour: false,
      onValueChange: (_event, date) => onPick(dateToHHmm(date)),
    });
  };

  const handleDayPress = (day: DateData) => {
    const dateString = day.dateString;
    if (!pickStart || pickEnd) {
      setPickStart(dateString);
      setPickEnd(null);
    } else if (dateString < pickStart) {
      setPickStart(dateString);
    } else if (dateString !== pickStart) {
      setPickEnd(dateString);
    }
  };

  const enterAddDateMode = () => {
    setPickStart(null);
    setPickEnd(null);
    setOverrideMinutes(DEFAULT_LIMIT);
    setOverrideAllDay(true);
    setOverrideStartTime('09:00');
    setOverrideEndTime('17:00');
    setMode('addDate');
  };

  const confirmAddOverride = () => {
    if (!pickStart) return;
    setOverrides(prev => [
      ...prev,
      {
        start: pickStart,
        end: pickEnd ?? pickStart,
        minutes: overrideMinutes,
        ...(overrideAllDay ? {} : { startTime: overrideStartTime, endTime: overrideEndTime }),
      },
    ]);
    setMode('edit');
  };

  const removeOverride = (index: number) => {
    setOverrides(prev => prev.filter((_, i) => i !== index));
  };

  const stepperBlock = (
    <>
      <View style={styles.stepper}>
        <RoundButton
          label="−"
          colors={colors}
          onPress={() => setStepperValue(stepLimit(stepperValue, -1))}
        />
        <Animated.Text
          style={[styles.value, { transform: [{ scale: bump }] }]}
        >
          {formatMinutes(stepperValue)}
        </Animated.Text>
        <RoundButton
          label="+"
          colors={colors}
          onPress={() => setStepperValue(stepLimit(stepperValue, 1))}
        />
      </View>

      <View style={styles.presets}>
        {PRESETS.map(preset => (
          <Pressable
            key={preset}
            onPress={() => setStepperValue(preset)}
            style={[
              styles.preset,
              stepperValue === preset && styles.presetActive,
            ]}
          >
            <Text
              style={[
                styles.presetText,
                stepperValue === preset && styles.presetTextActive,
              ]}
            >
              {formatMinutes(preset)}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'addDate' && (
        <Pressable onPress={() => setStepperValue(0)} hitSlop={8}>
          <Text style={styles.zeroLink}>Block completely</Text>
        </Pressable>
      )}
    </>
  );

  // One label + short explainer above each card, so the three limit types read
  // as distinct rules at a glance instead of one continuous list of settings.
  const sectionHeader = (icon: string, title: string, desc: string) => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionDesc}>{desc}</Text>
    </>
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <Pressable style={styles.dismiss} onPress={onClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {shown && (
              <View style={styles.appRow}>
                <View style={styles.iconWrap}>
                  <Image
                    source={{ uri: `data:image/png;base64,${shown.icon}` }}
                    style={styles.icon}
                  />
                </View>
                <View style={styles.appMeta}>
                  <Text style={styles.appName} numberOfLines={1}>
                    {shown.appName}
                  </Text>
                  <Text style={styles.used}>
                    Used today: {formatDuration(usedMs)}
                  </Text>
                </View>
              </View>
            )}

            {mode === 'edit' ? (
              <>
                <View style={styles.sectionCard}>
                  {sectionHeader('⏱️', 'Daily limit', 'How much time this app gets, every day.')}
                  {stepperBlock}
                </View>

                <View style={styles.sectionCard}>
                  {sectionHeader(
                    '🌙',
                    'Daily time block',
                    'Blocks the app during these hours every day, no matter how much time is left.',
                  )}
                  <View style={styles.segmented}>
                    <Pressable
                      style={[styles.segment, !dailyWindowEnabled && styles.segmentActive]}
                      onPress={() => setDailyWindowEnabled(false)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          !dailyWindowEnabled && styles.segmentTextActive,
                        ]}
                      >
                        Off
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.segment, dailyWindowEnabled && styles.segmentActive]}
                      onPress={() => setDailyWindowEnabled(true)}
                    >
                      <Text
                        style={[styles.segmentText, dailyWindowEnabled && styles.segmentTextActive]}
                      >
                        On
                      </Text>
                    </Pressable>
                  </View>
                  {dailyWindowEnabled && (
                    <View style={styles.timeRow}>
                      <Pressable
                        style={styles.timeButton}
                        onPress={() => pickTime(dailyWindowStart, setDailyWindowStart)}
                      >
                        <Text style={styles.timeButtonLabel}>From</Text>
                        <Text style={styles.timeButtonValue}>
                          {formatTimeLabel(dailyWindowStart)}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.timeButton}
                        onPress={() => pickTime(dailyWindowEnd, setDailyWindowEnd)}
                      >
                        <Text style={styles.timeButtonLabel}>To</Text>
                        <Text style={styles.timeButtonValue}>
                          {formatTimeLabel(dailyWindowEnd)}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <View style={styles.sectionCard}>
                  {sectionHeader(
                    '📅',
                    'Date limits',
                    'Override the daily limit for a specific day or range.',
                  )}
                  {overrides.length === 0 ? (
                    <Text style={styles.emptyDates}>
                      No date limits yet — add one for a specific day or range.
                    </Text>
                  ) : (
                    <View style={styles.datesList}>
                      {overrides.map((o, index) => (
                        <View key={`${o.start}-${o.end}-${index}`} style={styles.dateRow}>
                          <View style={styles.dateRowMeta}>
                            <Text style={styles.dateRowRange}>
                              {o.start === o.end
                                ? formatDateLabel(o.start)
                                : `${formatDateLabel(o.start)} – ${formatDateLabel(o.end)}`}
                            </Text>
                            {o.startTime && o.endTime && (
                              <Text style={styles.dateRowTimeRange}>
                                {formatTimeLabel(o.startTime)} – {formatTimeLabel(o.endTime)}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.dateRowMinutes}>
                            {o.minutes > 0 ? formatMinutes(o.minutes) : 'Blocked'}
                          </Text>
                          <Pressable
                            onPress={() => removeOverride(index)}
                            hitSlop={8}
                          >
                            <Text style={styles.removeDate}>✕</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                  <Pressable style={styles.addDateButton} onPress={enterAddDateMode}>
                    <Text style={styles.addDateButtonText}>+ Add date limit</Text>
                  </Pressable>
                </View>

                <Text
                  style={[
                    styles.note,
                    (alreadyOverMinutes || draftTimeBlocked) && styles.noteWarning,
                  ]}
                >
                  {draftTimeBlocked
                    ? 'This schedule blocks the app right now (inside a time window), regardless of minutes used.'
                    : alreadyOverMinutes
                    ? 'You have already used this much today, so the app will be blocked right away.'
                    : 'Resets every day at midnight.'}
                </Text>

                <Pressable style={styles.save} onPress={() => onSave(draftSchedule)}>
                  <Text style={styles.saveText}>
                    {hasAnyLimit(schedule) ? 'Update limit' : 'Set limit'}
                  </Text>
                </Pressable>
                {hasAnyLimit(schedule) && (
                  <Pressable style={styles.remove} onPress={onRemove}>
                    <Text style={styles.removeText}>Remove limit</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <View style={styles.sectionCard}>
                  {sectionHeader(
                    '📅',
                    'Pick a date or range',
                    'Choose which day — or range of days — this override applies to.',
                  )}
                  <View style={styles.calendarWrap}>
                    <Calendar
                      markingType="period"
                      markedDates={markRange(pickStart, pickEnd, colors)}
                      onDayPress={handleDayPress}
                      theme={calendarTheme}
                    />
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  {sectionHeader(
                    '⏱️',
                    'Limit for these dates',
                    'How much time the app gets on the dates you picked.',
                  )}
                  {stepperBlock}
                </View>

                <View style={styles.sectionCard}>
                  {sectionHeader(
                    '🕐',
                    'Time of day',
                    'Apply this limit all day, or only during specific hours.',
                  )}
                  <View style={styles.segmented}>
                    <Pressable
                      style={[styles.segment, overrideAllDay && styles.segmentActive]}
                      onPress={() => setOverrideAllDay(true)}
                    >
                      <Text
                        style={[styles.segmentText, overrideAllDay && styles.segmentTextActive]}
                      >
                        All day
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.segment, !overrideAllDay && styles.segmentActive]}
                      onPress={() => setOverrideAllDay(false)}
                    >
                      <Text
                        style={[styles.segmentText, !overrideAllDay && styles.segmentTextActive]}
                      >
                        Specific hours
                      </Text>
                    </Pressable>
                  </View>
                  {!overrideAllDay && (
                    <View style={styles.timeRow}>
                      <Pressable
                        style={styles.timeButton}
                        onPress={() => pickTime(overrideStartTime, setOverrideStartTime)}
                      >
                        <Text style={styles.timeButtonLabel}>From</Text>
                        <Text style={styles.timeButtonValue}>
                          {formatTimeLabel(overrideStartTime)}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.timeButton}
                        onPress={() => pickTime(overrideEndTime, setOverrideEndTime)}
                      >
                        <Text style={styles.timeButtonLabel}>To</Text>
                        <Text style={styles.timeButtonValue}>
                          {formatTimeLabel(overrideEndTime)}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <View style={styles.pickerButtonsRow}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setMode('edit')}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.confirmButton,
                      !pickStart && styles.confirmButtonDisabled,
                    ]}
                    disabled={!pickStart}
                    onPress={confirmAddOverride}
                  >
                    <Text style={styles.confirmButtonText}>Add</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  dismiss: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 20,
    backgroundColor: colors.surfaceAlt,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  icon: {
    width: 44,
    height: 44,
  },
  appMeta: {
    flex: 1,
    gap: 3,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  used: {
    fontSize: 13,
    color: colors.textMuted,
  },
  sectionCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.text,
  },
  sectionDesc: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.text,
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  preset: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  zeroLink: {
    alignSelf: 'center',
    marginTop: 12,
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  emptyDates: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  datesList: {
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateRowMeta: {
    flex: 1,
    gap: 2,
  },
  dateRowRange: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  dateRowTimeRange: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dateRowMinutes: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  removeDate: {
    fontSize: 14,
    color: colors.textMuted,
  },
  addDateButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addDateButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  calendarWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  timeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  timeButtonValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  note: {
    marginTop: 18,
    minHeight: 34,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  noteWarning: {
    color: colors.warning,
  },
  save: {
    marginTop: 12,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  remove: {
    marginTop: 6,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  });
}
