package com.focuslock

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Point
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.util.DisplayMetrics
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

/** Full-screen "time's up" screen drawn over the blocked app. */
class BlockOverlay(private val context: Context, private val onGoHome: () -> Unit) {
  private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private var view: View? = null

  /** Package the overlay is currently covering, or null when hidden. */
  var shownFor: String? = null
    private set

  fun show(
      packageName: String,
      appName: String,
      icon: Drawable?,
      limitMinutes: Int,
      timeWindowEndLabel: String? = null,
  ) {
    if (shownFor == packageName) return
    hide()

    val overlayType =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
          @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        }
    // MATCH_PARENT stops short of the navigation bar, so use the full physical display size.
    val screen = screenSize()
    val params =
        WindowManager.LayoutParams(
            screen.x,
            screen.y,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.OPAQUE,
        )
    params.gravity = Gravity.TOP or Gravity.START
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      params.layoutInDisplayCutoutMode =
          WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
    }

    val overlay = buildView(appName, icon, limitMinutes, timeWindowEndLabel)
    try {
      windowManager.addView(overlay, params)
      overlay.alpha = 0f
      overlay.animate().alpha(1f).setDuration(220).start()
      view = overlay
      shownFor = packageName
    } catch (e: Exception) {
      Log.w(TAG, "Could not show block overlay", e)
    }
  }

  fun hide() {
    view?.let {
      try {
        windowManager.removeView(it)
      } catch (e: Exception) {
        Log.w(TAG, "Could not remove block overlay", e)
      }
    }
    view = null
    shownFor = null
  }

  private fun screenSize(): Point =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val bounds = windowManager.maximumWindowMetrics.bounds
        Point(bounds.width(), bounds.height())
      } else {
        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION") windowManager.defaultDisplay.getRealMetrics(metrics)
        Point(metrics.widthPixels, metrics.heightPixels)
      }

  private fun buildView(
      appName: String,
      icon: Drawable?,
      limitMinutes: Int,
      timeWindowEndLabel: String?,
  ): View {
    val root =
        LinearLayout(context).apply {
          orientation = LinearLayout.VERTICAL
          gravity = Gravity.CENTER
          setPadding(dp(32), dp(32), dp(32), dp(32))
          background =
              GradientDrawable(
                  GradientDrawable.Orientation.TOP_BOTTOM,
                  intArrayOf(Color.parseColor("#0A0B1E"), Color.parseColor("#2A1F6B")),
              )
        }

    val halo =
        FrameLayout(context).apply {
          background =
              GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#22FFFFFF"))
              }
        }
    halo.addView(
        ImageView(context).apply {
          setImageDrawable(icon)
          clipToOutline = true
          outlineProvider =
              object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: android.graphics.Outline) {
                  outline.setRoundRect(0, 0, view.width, view.height, dp(20).toFloat())
                }
              }
        },
        FrameLayout.LayoutParams(dp(84), dp(84), Gravity.CENTER),
    )
    root.addView(halo, LinearLayout.LayoutParams(dp(140), dp(140)))

    root.addView(
        text(
            if (timeWindowEndLabel != null) "Blocked right now" else "Time's up",
            30f,
            Color.WHITE,
            bold = true,
        ),
        LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            )
            .apply { topMargin = dp(28) },
    )
    root.addView(
        text(
            if (timeWindowEndLabel != null) {
              "$appName is blocked during this time window.\nIt unlocks again at $timeWindowEndLabel."
            } else {
              "You've used your ${formatMinutes(limitMinutes)} daily limit for $appName.\n" +
                  "It unlocks again at midnight."
            },
            16f,
            Color.parseColor("#B4B8DC"),
        ),
        LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            )
            .apply { topMargin = dp(12) },
    )

    val button =
        text("Go to Home", 16f, Color.WHITE, bold = true).apply {
          setPadding(dp(36), dp(14), dp(36), dp(14))
          background =
              GradientDrawable().apply {
                cornerRadius = dp(30).toFloat()
                setColor(Color.parseColor("#7C5CFF"))
              }
          setOnClickListener { onGoHome() }
        }
    root.addView(
        button,
        LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            )
            .apply { topMargin = dp(36) },
    )
    return root
  }

  private fun text(value: String, sizeSp: Float, color: Int, bold: Boolean = false) =
      TextView(context).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        setTextColor(color)
        gravity = Gravity.CENTER
        if (bold) typeface = Typeface.DEFAULT_BOLD
      }

  private fun dp(value: Int): Int =
      TypedValue.applyDimension(
              TypedValue.COMPLEX_UNIT_DIP,
              value.toFloat(),
              context.resources.displayMetrics,
          )
          .toInt()

  private fun formatMinutes(total: Int): String {
    val hours = total / 60
    val minutes = total % 60
    return when {
      hours == 0 -> "${minutes}m"
      minutes == 0 -> "${hours}h"
      else -> "${hours}h ${minutes}m"
    }
  }

  private companion object {
    const val TAG = "FocusLock"
  }
}
