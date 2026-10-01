package com.focuslock

import android.content.Context
import android.content.Intent

object SystemApps {
  const val SYSTEM_UI = "com.android.systemui"

  /** Home launcher packages. They are never limited, or the user could get stuck. */
  fun homePackages(context: Context): Set<String> {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    return context.packageManager
        .queryIntentActivities(intent, 0)
        .map { it.activityInfo.packageName }
        .toSet()
  }
}
