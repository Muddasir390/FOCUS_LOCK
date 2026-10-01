package com.focuslock

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = FocusLockModule.NAME)
class FocusLockModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  private val context
    get() = reactApplicationContext

  @ReactMethod
  fun getStatus(promise: Promise) {
    promise.resolve(
        Arguments.createMap().apply {
          putBoolean("usageAccess", Permissions.hasUsageAccess(context))
          putBoolean("overlay", Permissions.hasOverlay(context))
          putBoolean("enabled", Prefs.isEnabled(context))
          putBoolean("running", MonitorService.running)
        }
    )
  }

  /** `{ [packageName]: { byDay: number[7], overrides: {start,end,minutes,startTime?,endTime?}[], dailyWindow: {start,end} | null } }` */
  @ReactMethod
  fun getSchedules(promise: Promise) {
    val result = Arguments.createMap()
    Prefs.schedules(context).forEach { (packageName, schedule) ->
      result.putMap(packageName, scheduleToMap(schedule))
    }
    promise.resolve(result)
  }

  /** Sets an app's full schedule. An empty/all-zero schedule removes the limit. */
  @ReactMethod
  fun setSchedule(packageName: String, scheduleMap: ReadableMap, promise: Promise) {
    Prefs.setSchedule(context, packageName, scheduleFromMap(scheduleMap))
    MonitorService.sync(context)
    promise.resolve(null)
  }

  private fun scheduleToMap(schedule: Schedule): WritableMap =
      Arguments.createMap().apply {
        putArray("byDay", Arguments.createArray().apply { schedule.byDay.forEach { pushInt(it) } })
        putArray(
            "overrides",
            Arguments.createArray().apply {
              schedule.overrides.forEach { o ->
                pushMap(
                    Arguments.createMap().apply {
                      putString("start", o.start)
                      putString("end", o.end)
                      putInt("minutes", o.minutes)
                      o.startTime?.let { putString("startTime", it) }
                      o.endTime?.let { putString("endTime", it) }
                    }
                )
              }
            },
        )
        val dw = schedule.dailyWindow
        if (dw != null) {
          putMap(
              "dailyWindow",
              Arguments.createMap().apply {
                putString("start", dw.start)
                putString("end", dw.end)
              },
          )
        } else {
          putNull("dailyWindow")
        }
      }

  private fun scheduleFromMap(map: ReadableMap): Schedule {
    val byDayArr = map.getArray("byDay")
    val byDay = IntArray(7) { i -> byDayArr?.takeIf { i < it.size() }?.getInt(i) ?: 0 }
    val overridesArr = map.getArray("overrides")
    val overrides =
        (0 until (overridesArr?.size() ?: 0)).map { i ->
          val o = overridesArr!!.getMap(i)!!
          DateOverride(
              o.getString("start") ?: "",
              o.getString("end") ?: "",
              o.getInt("minutes"),
              if (o.hasKey("startTime")) o.getString("startTime") else null,
              if (o.hasKey("endTime")) o.getString("endTime") else null,
          )
        }
    val dailyWindowMap = if (map.hasKey("dailyWindow")) map.getMap("dailyWindow") else null
    val dailyWindow =
        dailyWindowMap?.let { DailyWindow(it.getString("start") ?: "", it.getString("end") ?: "") }
    return Schedule(byDay, overrides, dailyWindow)
  }

  /** `{ [packageName]: milliseconds in the foreground today }` */
  @ReactMethod
  fun getUsageToday(promise: Promise) {
    Thread {
          try {
            val result = Arguments.createMap()
            if (Permissions.hasUsageAccess(context)) {
              val tracker = UsageTracker(context).apply { sync() }
              tracker.snapshot().forEach { (packageName, ms) ->
                result.putDouble(packageName, ms.toDouble())
              }
            }
            promise.resolve(result)
          } catch (e: Exception) {
            promise.reject("E_USAGE", "Could not read app usage", e)
          }
        }
        .start()
  }

  @ReactMethod
  fun setProtectionEnabled(enabled: Boolean, promise: Promise) {
    Prefs.setEnabled(context, enabled)
    MonitorService.sync(context)
    promise.resolve(null)
  }

  /** Re-checks permissions and settings and starts or stops the monitor service to match. */
  @ReactMethod
  fun syncService(promise: Promise) {
    MonitorService.sync(context)
    promise.resolve(null)
  }

  @ReactMethod
  fun openUsageAccessSettings() {
    openSettings(Settings.ACTION_USAGE_ACCESS_SETTINGS)
  }

  @ReactMethod
  fun openOverlaySettings() {
    openSettings(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
  }

  /** FocusLock's App info page, where "Allow restricted settings" lives for sideloaded installs. */
  @ReactMethod
  fun openAppInfoSettings() {
    launch(
        Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:${context.packageName}"),
        )
    )
  }

  private fun openSettings(action: String) {
    val packageUri = Uri.parse("package:${context.packageName}")
    try {
      // Jumps straight to FocusLock's own entry where the device supports it.
      launch(Intent(action, packageUri))
    } catch (e: Exception) {
      launch(Intent(action))
    }
  }

  private fun launch(intent: Intent) {
    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  companion object {
    const val NAME = "FocusLock"
  }
}
