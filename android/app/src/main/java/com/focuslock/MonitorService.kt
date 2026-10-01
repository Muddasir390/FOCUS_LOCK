package com.focuslock

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import java.util.Calendar

/**
 * Foreground service that watches which app is open and blocks it once its daily limit is used up.
 */
class MonitorService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var tracker: UsageTracker
  private lateinit var overlay: BlockOverlay
  private lateinit var powerManager: PowerManager
  private var homePackages: Set<String> = emptySet()

  private val warned = HashSet<String>()
  private val alerted = HashSet<String>()
  private var flagsDay = -1
  private var lastHomeAt = 0L

  private val goHome = Runnable { sendHome() }
  private val ticker =
      object : Runnable {
        override fun run() {
          try {
            tick()
          } catch (e: Exception) {
            Log.e(TAG, "Monitor tick failed", e)
          }
          handler.postDelayed(this, if (powerManager.isInteractive) FAST_MS else IDLE_MS)
        }
      }

  override fun onCreate() {
    super.onCreate()
    tracker = UsageTracker(this)
    overlay = BlockOverlay(this) { sendHome() }
    powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    running = true
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Notifier.ensureChannels(this)
    val notification = Notifier.monitorNotification(this)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
          Notifier.MONITOR_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
      )
    } else {
      startForeground(Notifier.MONITOR_ID, notification)
    }

    homePackages = SystemApps.homePackages(this)
    handler.removeCallbacks(ticker)
    handler.post(ticker)
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    overlay.hide()
    running = false
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun tick() {
    if (!Permissions.hasUsageAccess(this)) {
      stopSelf()
      return
    }

    val now = System.currentTimeMillis()
    resetDailyFlags(now)
    tracker.sync(now)

    val packageName = tracker.foregroundPackage
    if (
        packageName == null ||
            packageName == this.packageName ||
            packageName == SystemApps.SYSTEM_UI ||
            packageName in homePackages
    ) {
      overlay.hide()
      return
    }

    val schedule = Prefs.schedule(this, packageName)
    val nowCal = Calendar.getInstance().apply { timeInMillis = now }
    val limitMinutes = effectiveMinutesFor(schedule, nowCal)
    val timeBlocked = isBlockedByTimeWindow(schedule, nowCal)
    if (limitMinutes <= 0 && !timeBlocked) {
      overlay.hide()
      return
    }

    val limitMs = limitMinutes * 60_000L
    val usedMs = tracker.usageMs(packageName, now)
    if (timeBlocked || usedMs >= limitMs) {
      val windowEndLabel =
          if (timeBlocked) activeTimeWindowEnd(schedule, nowCal)?.let(::formatClockLabel) else null
      block(packageName, limitMinutes, windowEndLabel)
    } else {
      overlay.hide()
      warnIfClose(packageName, limitMinutes, limitMs - usedMs)
    }
  }

  private fun block(packageName: String, limitMinutes: Int, windowEndLabel: String? = null) {
    val name = appName(packageName)
    if (alerted.add(packageName)) Notifier.limitReached(this, packageName, name, windowEndLabel)

    if (!Permissions.hasOverlay(this)) {
      // No permission to draw the lock screen, so the best we can do is send the user home.
      goHomeThrottled()
      return
    }
    if (overlay.shownFor == packageName) return

    overlay.show(packageName, name, appIcon(packageName), limitMinutes, windowEndLabel)
    handler.removeCallbacks(goHome)
    handler.postDelayed(goHome, GO_HOME_DELAY_MS)
  }

  private fun warnIfClose(packageName: String, limitMinutes: Int, remainingMs: Long) {
    val thresholdMinutes = if (limitMinutes >= 10) 5 else 1
    if (limitMinutes <= thresholdMinutes) return
    if (remainingMs <= thresholdMinutes * 60_000L && warned.add(packageName)) {
      Notifier.warn(this, packageName, appName(packageName), thresholdMinutes)
    }
  }

  private fun resetDailyFlags(now: Long) {
    val day = Calendar.getInstance().apply { timeInMillis = now }.get(Calendar.DAY_OF_YEAR)
    if (day != flagsDay) {
      warned.clear()
      alerted.clear()
      flagsDay = day
    }
  }

  private fun goHomeThrottled() {
    val now = System.currentTimeMillis()
    if (now - lastHomeAt > GO_HOME_DELAY_MS) sendHome()
  }

  private fun sendHome() {
    lastHomeAt = System.currentTimeMillis()
    val intent =
        Intent(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_HOME)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      startActivity(intent)
    } catch (e: Exception) {
      Log.w(TAG, "Could not go to the home screen", e)
    }
  }

  private fun appName(packageName: String): String =
      try {
        packageManager.getApplicationLabel(packageManager.getApplicationInfo(packageName, 0)).toString()
      } catch (e: Exception) {
        packageName
      }

  private fun appIcon(packageName: String) =
      try {
        packageManager.getApplicationIcon(packageName)
      } catch (e: Exception) {
        null
      }

  companion object {
    private const val TAG = "FocusLock"
    private const val FAST_MS = 500L
    private const val IDLE_MS = 3_000L
    private const val GO_HOME_DELAY_MS = 2_500L

    @Volatile var running = false
      private set

    /**
     * Starts or stops the service to match the current settings: it should run only while
     * protection is on, at least one limit exists and both permissions are granted.
     */
    fun sync(context: Context) {
      val app = context.applicationContext
      val shouldRun =
          Prefs.isEnabled(app) &&
              Prefs.schedules(app).isNotEmpty() &&
              Permissions.hasUsageAccess(app) &&
              Permissions.hasOverlay(app)
      val intent = Intent(app, MonitorService::class.java)
      try {
        if (shouldRun) {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) app.startForegroundService(intent)
          else app.startService(intent)
        } else {
          app.stopService(intent)
        }
      } catch (e: Exception) {
        Log.w(TAG, "Could not update the monitor service", e)
      }
    }
  }
}
