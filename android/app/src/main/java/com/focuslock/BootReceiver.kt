package com.focuslock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restarts protection after a reboot or an app update. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (
        intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == Intent.ACTION_MY_PACKAGE_REPLACED
    ) {
      MonitorService.sync(context)
    }
  }
}
