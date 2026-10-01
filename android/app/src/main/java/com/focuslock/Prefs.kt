package com.focuslock

import android.content.Context
import java.util.Calendar
import org.json.JSONArray
import org.json.JSONObject

/** Persistent settings shared by the React Native module and the background service. */
object Prefs {
  private const val FILE = "focuslock"
  private const val SCHEDULE_PREFIX = "schedule:"
  private const val LIMIT_PREFIX = "limit:" // legacy; migrated lazily, see schedule()
  private const val KEY_ENABLED = "protection_enabled"

  private fun prefs(context: Context) =
      context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  /** Every app with an active schedule (a weekday limit or a date override), keyed by package name. */
  fun schedules(context: Context): Map<String, Schedule> {
    val p = prefs(context)
    val packageNames =
        p.all.keys
            .mapNotNull {
              when {
                it.startsWith(SCHEDULE_PREFIX) -> it.removePrefix(SCHEDULE_PREFIX)
                it.startsWith(LIMIT_PREFIX) -> it.removePrefix(LIMIT_PREFIX)
                else -> null
              }
            }
            .toSet()
    return packageNames.associateWith { schedule(context, it) }.filterValues { hasAnyLimit(it) }
  }

  /** This app's schedule, or Schedule.EMPTY. Migrates a legacy flat "limit:" Int on first read. */
  fun schedule(context: Context, packageName: String): Schedule {
    val p = prefs(context)
    p.getString(SCHEDULE_PREFIX + packageName, null)?.let { return parseSchedule(it) }

    val legacyMinutes = p.getInt(LIMIT_PREFIX + packageName, 0)
    if (legacyMinutes > 0) {
      // Preserve whatever the user already configured: the same number, every day.
      val migrated = Schedule(IntArray(7) { legacyMinutes }, emptyList())
      setSchedule(context, packageName, migrated)
      return migrated
    }
    return Schedule.EMPTY
  }

  fun setSchedule(context: Context, packageName: String, schedule: Schedule) {
    prefs(context)
        .edit()
        .putString(SCHEDULE_PREFIX + packageName, serializeSchedule(schedule))
        .remove(LIMIT_PREFIX + packageName) // completes the migration for this app
        .apply()
  }

  /** Effective limit right now, or 0. */
  fun effectiveMinutes(
      context: Context,
      packageName: String,
      now: Long = System.currentTimeMillis(),
  ): Int =
      effectiveMinutesFor(
          schedule(context, packageName),
          Calendar.getInstance().apply { timeInMillis = now },
      )

  fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, true)

  fun setEnabled(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
  }

  private fun serializeSchedule(s: Schedule): String =
      JSONObject()
          .apply {
            put("byDay", JSONArray(s.byDay.toList()))
            put(
                "overrides",
                JSONArray(
                    s.overrides.map { o ->
                      JSONObject().apply {
                        put("start", o.start)
                        put("end", o.end)
                        put("minutes", o.minutes)
                        o.startTime?.let { put("startTime", it) }
                        o.endTime?.let { put("endTime", it) }
                      }
                    }
                ),
            )
            s.dailyWindow?.let { dw ->
              put("dailyWindow", JSONObject().put("start", dw.start).put("end", dw.end))
            }
          }
          .toString()

  private fun parseSchedule(json: String): Schedule =
      try {
        val root = JSONObject(json)
        val byDayArr = root.getJSONArray("byDay")
        val byDay = IntArray(7) { i -> if (i < byDayArr.length()) byDayArr.getInt(i) else 0 }
        val overridesArr = root.getJSONArray("overrides")
        val overrides =
            (0 until overridesArr.length()).map {
              val o = overridesArr.getJSONObject(it)
              DateOverride(
                  o.getString("start"),
                  o.getString("end"),
                  o.getInt("minutes"),
                  o.optString("startTime", null),
                  o.optString("endTime", null),
              )
            }
        val dailyWindow =
            if (root.has("dailyWindow") && !root.isNull("dailyWindow")) {
              val dw = root.getJSONObject("dailyWindow")
              DailyWindow(dw.getString("start"), dw.getString("end"))
            } else {
              null
            }
        Schedule(byDay, overrides, dailyWindow)
      } catch (e: Exception) {
        Schedule.EMPTY
      }
}
