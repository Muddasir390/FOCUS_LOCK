package com.focuslock

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

object Notifier {
  const val MONITOR_ID = 1
  private const val CHANNEL_MONITOR = "monitor"
  private const val CHANNEL_ALERTS = "alerts"

  fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(
        NotificationChannel(CHANNEL_MONITOR, "Protection status", NotificationManager.IMPORTANCE_LOW)
            .apply { description = "Shown while FocusLock is watching your app limits" }
    )
    manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ALERTS, "Limit alerts", NotificationManager.IMPORTANCE_HIGH)
            .apply { description = "Warnings when an app is about to reach its limit" }
    )
  }

  fun monitorNotification(context: Context): Notification =
      builder(context, CHANNEL_MONITOR)
          .setContentTitle("FocusLock is on")
          .setContentText("Watching your app time limits")
          .setOngoing(true)
          .build()

  fun warn(context: Context, packageName: String, appName: String, minutesLeft: Int) {
    val left = if (minutesLeft <= 1) "1 minute" else "$minutesLeft minutes"
    notify(
        context,
        "warn:$packageName".hashCode(),
        builder(context, CHANNEL_ALERTS)
            .setContentTitle("$appName: $left left")
            .setContentText("Your daily limit for $appName is almost used up.")
            .setAutoCancel(true)
            .build(),
    )
  }

  fun limitReached(
      context: Context,
      packageName: String,
      appName: String,
      timeWindowEndLabel: String? = null,
  ) {
    val title = if (timeWindowEndLabel != null) "Blocked: $appName" else "Time's up for $appName"
    val body =
        if (timeWindowEndLabel != null) {
          "This app is blocked right now. It unlocks again at $timeWindowEndLabel."
        } else {
          "You reached your daily limit. It unlocks again at midnight."
        }
    notify(
        context,
        "limit:$packageName".hashCode(),
        builder(context, CHANNEL_ALERTS)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .build(),
    )
  }

  private fun notify(context: Context, id: Int, notification: Notification) {
    context.getSystemService(NotificationManager::class.java).notify(id, notification)
  }

  private fun builder(context: Context, channel: String): Notification.Builder {
    val builder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          Notification.Builder(context, channel)
        } else {
          @Suppress("DEPRECATION") Notification.Builder(context)
        }
    val openApp =
        PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    return builder.setSmallIcon(R.drawable.ic_stat_lock).setContentIntent(openApp)
  }
}
