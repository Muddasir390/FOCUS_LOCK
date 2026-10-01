package com.focuslock

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar

/**
 * Works out how long each app has been in the foreground today from the system's usage events.
 *
 * Call [sync] regularly. It only reads the events since the previous call, so it is cheap enough
 * to run every half second, and it rolls over by itself at midnight.
 */
class UsageTracker(context: Context) {
  private val usageStats =
      context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

  private val usedMs = HashMap<String, Long>()
  private val resumedActivities = HashSet<String>()
  private var current: String? = null
  private var currentSince = 0L
  private var dayStart = 0L
  private var lastQuery = 0L

  /** The app that is in the foreground as of the last [sync]. */
  val foregroundPackage: String?
    get() = current

  fun sync(now: Long = System.currentTimeMillis()) {
    val today = startOfDay(now)
    if (today != dayStart) startNewDay(today)
    readEvents(lastQuery, now)
    lastQuery = now
  }

  fun usageMs(packageName: String, now: Long = System.currentTimeMillis()): Long {
    val open = if (current == packageName) maxOf(0L, now - currentSince) else 0L
    return (usedMs[packageName] ?: 0L) + open
  }

  fun snapshot(now: Long = System.currentTimeMillis()): Map<String, Long> {
    val result = HashMap(usedMs)
    current?.let { result[it] = usageMs(it, now) }
    return result
  }

  private fun startNewDay(today: Long) {
    usedMs.clear()
    // An app that stays open across midnight starts counting again from midnight.
    if (current != null) currentSince = today
    dayStart = today
    lastQuery = today
  }

  private fun readEvents(from: Long, to: Long) {
    val events = usageStats.queryEvents(from, to) ?: return
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val packageName = event.packageName ?: continue
      when (event.eventType) {
        EVENT_RESUMED -> onResumed(packageName, event.className ?: "", event.timeStamp)
        EVENT_PAUSED -> onPaused(packageName, event.className ?: "", event.timeStamp)
        EVENT_SCREEN_OFF -> closeCurrent(event.timeStamp)
      }
    }
  }

  private fun onResumed(packageName: String, activity: String, time: Long) {
    if (current != packageName) {
      closeCurrent(time)
      current = packageName
      currentSince = time
    }
    resumedActivities.add(activity)
  }

  private fun onPaused(packageName: String, activity: String, time: Long) {
    if (current != packageName) return
    resumedActivities.remove(activity)
    if (resumedActivities.isEmpty()) closeCurrent(time)
  }

  private fun closeCurrent(time: Long) {
    val packageName = current ?: return
    usedMs[packageName] = (usedMs[packageName] ?: 0L) + maxOf(0L, time - currentSince)
    current = null
    resumedActivities.clear()
  }

  private fun startOfDay(time: Long): Long =
      Calendar.getInstance()
          .apply {
            timeInMillis = time
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
          }
          .timeInMillis

  private companion object {
    // ACTIVITY_RESUMED / ACTIVITY_PAUSED (API 29) share values with the older MOVE_TO_* events.
    const val EVENT_RESUMED = 1
    const val EVENT_PAUSED = 2
    const val EVENT_SCREEN_OFF = 16 // SCREEN_NON_INTERACTIVE
  }
}
