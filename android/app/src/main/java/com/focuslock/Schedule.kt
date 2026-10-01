package com.focuslock

import java.util.Calendar

data class DateOverride(
    val start: String,
    val end: String,
    val minutes: Int,
    val startTime: String? = null,
    val endTime: String? = null,
)

data class DailyWindow(val start: String, val end: String)

data class Schedule(
    val byDay: IntArray,
    val overrides: List<DateOverride>,
    val dailyWindow: DailyWindow? = null,
) {
  companion object {
    val EMPTY = Schedule(IntArray(7), emptyList(), null)
  }
}

/** "2026-10-01" in the device's local time zone (matches UsageTracker's "today"). */
fun isoDate(date: Calendar): String =
    "%04d-%02d-%02d".format(
        date.get(Calendar.YEAR),
        date.get(Calendar.MONTH) + 1,
        date.get(Calendar.DAY_OF_MONTH),
    )

/**
 * Resolves the effective daily minute limit for `date`.
 *
 * KEPT IN SYNC WITH: src/utils/schedule.ts -> effectiveMinutesFor(). Same rule, same variable
 * names (isoDate, overrides, byDay) -- if you change the logic here, change it there too.
 *
 * Rule: find overrides whose inclusive [start, end] contains `date`. If more than one matches
 * (the UI prevents overlaps, but don't trust that), the LOWEST minutes wins -- i.e. the most
 * restrictive override applies, so a 0 ("fully blocked") override always beats a partial-limit
 * one on the same day. Otherwise fall back to byDay[Sun=0..Sat=6].
 */
fun effectiveMinutesFor(schedule: Schedule, date: Calendar): Int {
  val today = isoDate(date)
  val matching = schedule.overrides.filter { it.start <= today && today <= it.end }
  if (matching.isNotEmpty()) return matching.minOf { it.minutes }
  return schedule.byDay[date.get(Calendar.DAY_OF_WEEK) - 1] // Calendar: 1=Sun..7=Sat
}

/** Whether this schedule restricts the app at all (a day limit, a date override, or a daily time window). */
fun hasAnyLimit(schedule: Schedule): Boolean =
    schedule.byDay.any { it > 0 } || schedule.overrides.isNotEmpty() || schedule.dailyWindow != null

/** Parses "HH:mm" into minutes since midnight, e.g. "07:30" -> 450. */
private fun minutesOfDay(time: String): Int {
  val (h, m) = time.split(":").map { it.toInt() }
  return h * 60 + m
}

/**
 * Whether `now`'s clock time falls inside `startTime`..`endTime` ("HH:mm", inclusive), handling
 * windows that cross midnight (e.g. "22:00".."07:00") where start > end in minutes-since-midnight.
 *
 * KEPT IN SYNC WITH: src/utils/schedule.ts -> isWithinTimeWindow(). Same rule, same variable names
 * (start, end, current) -- if you change the logic here, change it there too.
 */
fun isWithinTimeWindow(startTime: String, endTime: String, now: Calendar): Boolean {
  val start = minutesOfDay(startTime)
  val end = minutesOfDay(endTime)
  val current = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
  return if (start <= end) current in start..end else current >= start || current <= end
}

/**
 * Whether `schedule` blocks the app right now purely due to clock time, independent of any
 * minute budget. A true result means "block regardless of usage" -- OR this with the existing
 * minutes-based check in MonitorService.tick().
 *
 * KEPT IN SYNC WITH: src/utils/schedule.ts -> isBlockedByTimeWindow(). Same rule, same variable
 * names (today, dateOverrides, dailyWindow) -- if you change the logic here, change it there too.
 *
 * Rule: any date override covering `now` with both startTime and endTime set takes over this
 * date's time-of-day rule completely (exactly like it takes over the date's minute budget in
 * effectiveMinutesFor) -- schedule.dailyWindow is not consulted on such a date even if none of
 * the matching overrides is currently active. Otherwise, schedule.dailyWindow (if any) applies.
 */
fun isBlockedByTimeWindow(schedule: Schedule, now: Calendar): Boolean {
  val today = isoDate(now)
  val dateOverrides =
      schedule.overrides.filter {
        it.start <= today && today <= it.end && it.startTime != null && it.endTime != null
      }
  if (dateOverrides.isNotEmpty()) {
    return dateOverrides.any { isWithinTimeWindow(it.startTime!!, it.endTime!!, now) }
  }
  val dailyWindow = schedule.dailyWindow ?: return false
  return isWithinTimeWindow(dailyWindow.start, dailyWindow.end, now)
}

/**
 * The end time ("HH:mm") of whichever time-window rule is blocking right now, or null if none is.
 * Android-only presentation helper for the overlay/notification message; the authoritative
 * resolver is isBlockedByTimeWindow() above. Not mirrored in TS -- JS has no overlay to label.
 */
fun activeTimeWindowEnd(schedule: Schedule, now: Calendar): String? {
  val today = isoDate(now)
  val activeOverride =
      schedule.overrides.firstOrNull {
        it.start <= today &&
            today <= it.end &&
            it.startTime != null &&
            it.endTime != null &&
            isWithinTimeWindow(it.startTime, it.endTime, now)
      }
  if (activeOverride != null) return activeOverride.endTime
  val dailyWindow = schedule.dailyWindow ?: return null
  return if (isWithinTimeWindow(dailyWindow.start, dailyWindow.end, now)) dailyWindow.end else null
}

/** "HH:mm" as a 12-hour label, e.g. "07:00" -> "7:00 AM", "14:30" -> "2:30 PM". Android-only. */
fun formatClockLabel(time: String): String {
  val (h, m) = time.split(":").map { it.toInt() }
  val period = if (h < 12) "AM" else "PM"
  val hour12 = if (h % 12 == 0) 12 else h % 12
  return if (m == 0) "$hour12 $period" else "$hour12:${m.toString().padStart(2, '0')} $period"
}
