package com.lateralflowscannermobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.uimanager.ViewManager
import com.facebook.soloader.SoLoader
import com.facebook.react.soloader.OpenSourceMergedSoMapping

// Import custom modules
import com.lateralflowscannermobile.modules.CameraMetadataModule
import com.lateralflowscannermobile.modules.SensorModule
import com.lateralflowscannermobile.modules.ExifModule
import com.lateralflowscannermobile.modules.ImageProcessingModule
import com.lateralflowscannermobile.modules.OpenCVModule

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {

      override fun getUseDeveloperSupport(): Boolean {
        return BuildConfig.DEBUG
      }

      override fun getPackages(): List<ReactPackage> {
        val packages = PackageList(this).packages

        // Add custom packages
        packages.add(object : ReactPackage {

          override fun createNativeModules(
            reactContext: ReactApplicationContext
          ): List<NativeModule> {
            return listOf(
              CameraMetadataModule(reactContext),
              SensorModule(reactContext),
              ExifModule(reactContext),
              ImageProcessingModule(reactContext),
              OpenCVModule(reactContext)
            )
          }

          override fun createViewManagers(
            reactContext: ReactApplicationContext
          ): List<ViewManager<*, *>> {
            return emptyList()
          }
        })

        packages.add(com.lateralflowscannermobile.modules.DepthSensorModulePackage())

        return packages
      }

      override fun getJSMainModuleName(): String {
        return "index"
      }

      
      override val isNewArchEnabled: Boolean
        get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

      override val isHermesEnabled: Boolean
        get() = BuildConfig.IS_HERMES_ENABLED
      
    }


  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load()
    }
  }
}
