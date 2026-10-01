package com.focuslock

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import java.io.ByteArrayOutputStream

@ReactModule(name = InstalledAppsModule.NAME)
class InstalledAppsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  /**
   * Resolves with every launchable app (except FocusLock itself) as
   * `{ packageName, appName, icon (base64 PNG), isSystem }`, sorted by name.
   */
  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    // Loading labels and icons is slow, so keep it off the native modules thread.
    Thread {
          try {
            val context = reactApplicationContext
            val pm = context.packageManager
            val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            // Home launchers are left out: limiting one would trap the user on the lock screen.
            val homePackages = SystemApps.homePackages(context)

            val apps =
                pm.queryIntentActivities(launcherIntent, 0)
                    .distinctBy { it.activityInfo.packageName }
                    .filter { it.activityInfo.packageName != context.packageName }
                    .filter { it.activityInfo.packageName !in homePackages }
                    .map { info ->
                      Triple(
                          info.activityInfo.packageName,
                          info.loadLabel(pm).toString(),
                          info,
                      )
                    }
                    .sortedBy { it.second.lowercase() }

            val result = Arguments.createArray()
            for ((packageName, label, info) in apps) {
              val flags = info.activityInfo.applicationInfo.flags
              val isSystem =
                  flags and ApplicationInfo.FLAG_SYSTEM != 0 &&
                      flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP == 0

              result.pushMap(
                  Arguments.createMap().apply {
                    putString("packageName", packageName)
                    putString("appName", label)
                    putString("icon", drawableToBase64(info.loadIcon(pm), ICON_SIZE_PX))
                    putBoolean("isSystem", isSystem)
                    putString("osCategory", osCategory(info.activityInfo.applicationInfo))
                  }
              )
            }
            promise.resolve(result)
          } catch (e: Exception) {
            promise.reject("E_LIST_APPS", "Could not read installed apps", e)
          }
        }
        .start()
  }

  /** Maps the OS-declared app category (API 26+) to a short string, or null if unset/unavailable. */
  private fun osCategory(appInfo: ApplicationInfo): String? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
    return when (appInfo.category) {
      ApplicationInfo.CATEGORY_GAME -> "GAME"
      ApplicationInfo.CATEGORY_AUDIO -> "AUDIO"
      ApplicationInfo.CATEGORY_VIDEO -> "VIDEO"
      ApplicationInfo.CATEGORY_IMAGE -> "IMAGE"
      ApplicationInfo.CATEGORY_SOCIAL -> "SOCIAL"
      ApplicationInfo.CATEGORY_NEWS -> "NEWS"
      ApplicationInfo.CATEGORY_MAPS -> "MAPS"
      ApplicationInfo.CATEGORY_PRODUCTIVITY -> "PRODUCTIVITY"
      else -> null
    }
  }

  private fun drawableToBase64(drawable: Drawable, size: Int): String {
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    drawable.setBounds(0, 0, size, size)
    drawable.draw(Canvas(bitmap))
    val out = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    bitmap.recycle()
    return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  }

  companion object {
    const val NAME = "InstalledApps"
    private const val ICON_SIZE_PX = 96
  }
}
