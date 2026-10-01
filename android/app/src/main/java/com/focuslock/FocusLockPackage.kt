package com.focuslock

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class FocusLockPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      when (name) {
        InstalledAppsModule.NAME -> InstalledAppsModule(reactContext)
        FocusLockModule.NAME -> FocusLockModule(reactContext)
        else -> null
      }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    listOf(
            InstalledAppsModule.NAME to InstalledAppsModule::class.java,
            FocusLockModule.NAME to FocusLockModule::class.java,
        )
        .associate { (name, type) ->
          name to
              ReactModuleInfo(
                  name,
                  type.name,
                  false, // canOverrideExistingModule
                  false, // needsEagerInit
                  false, // isCxxModule
                  false, // isTurboModule
              )
        }
  }
}
