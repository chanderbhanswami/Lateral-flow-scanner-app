# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
-keep class com.lateralflowscannermobile.BuildConfig { *; }

# ==============================================================================
# NUCLEAR OPTION: KEEP EVERYTHING
# User requested "nothing to be stripped out".
# These rules force R8 to keep every single class in common namespaces.
# This prevents code stripping but increases APK size.
# ==============================================================================
-keep class com.** { *; }
-keep interface com.** { *; }
-keep class org.** { *; }
-keep interface org.** { *; }
-keep class io.** { *; }
-keep interface io.** { *; }
-keep class net.** { *; }
-keep interface net.** { *; }
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-keep class kotlin.** { *; }
-keep interface kotlin.** { *; }
-keep class javax.** { *; }
-keep interface javax.** { *; }
-keep class javax.** { *; }
-keep interface javax.** { *; }
-keep class android.** { *; }
-keep interface android.** { *; }

# Fix for R8 missing class java.lang.invoke.MethodHandleProxies
-dontwarn org.apache.commons.lang3.**

# ==============================================================================

# Kotlin Metadata (Crucial for Reflection used by VisionCamera)
-keep class kotlin.Metadata { *; }

# Android Lifecycle (Critical for CameraX / VisionCamera)
-keep class androidx.lifecycle.** { *; }
-keep interface androidx.lifecycle.** { *; }

# === SAFETY NET: Coroutines & Futures ===
-keep class kotlinx.coroutines.** { *; }
-keep class androidx.concurrent.** { *; }

# === SAFETY NET: React Native Methods ===
# Ensures all methods exposed to JS are kept, regardless of upstream rules
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# VisionCamera Resize Plugin Compatibility
# Workaround for compileOnly dependency to avoid R8 errors
-dontwarn com.mrousavy.camera.**
-keep class com.mrousavy.camera.** { *; }
-keep interface com.mrousavy.camera.** { *; }
-keep class com.visioncameraresizeplugin.** { *; }

# Sentry
-dontwarn io.sentry.**
-keep class io.sentry.** { *; }
-keep interface io.sentry.** { *; }
-keep class io.sentry.android.sqlite.** { *; }

# CameraX extensions (VisionCamera dependency)
-dontwarn androidx.camera.extensions.**
-keep class androidx.camera.extensions.** { *; }

# General Safety
-dontwarn sun.misc.Unsafe
-dontwarn com.google.common.util.concurrent.ListenableFuture

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbo.** { *; }

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# React Native Image Crop Picker
-keep public class com.reactnative.ivpusic.imagepicker.** { *; }
-keep public interface com.reactnative.ivpusic.imagepicker.** { *; }
-dontwarn com.reactnative.ivpusic.imagepicker.**

# TurboModules and New Architecture support
-keep class com.facebook.react.turbomodule.** { *; }
-keep interface com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.common.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Image Crop Picker dependencies (uCrop, Glide)
-keep class com.yalantis.ucrop.** { *; }
-keep class com.yalantis.ucrop.view.** { *; }
-dontwarn com.yalantis.ucrop.**

# React Native Fast Image
-keep class com.dylanvann.fastimage.** { *; }
-keep class com.bumptech.glide.** { *; }

# React Native Device Info
-keep class com.learnium.RNDeviceInfo.** { *; }

# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# React Native MMKV
-keep class com.reactnativemmkv.** { *; }

# React Native Config
-keep class com.lateralflowscannermobile.BuildConfig { *; }

# === MLKit OCR (Prevent Stripping) ===
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_common.** { *; }
-dontwarn com.google.mlkit.**

# Reference: https://developers.google.com/ml-kit/android/text-recognition/v2
-keep class com.google.mlkit.vision.text.** { *; }

# === React Native Keep Awake ===
-keep class com.corbt.keepawake.** { *; }

# === React Native Haptic Feedback ===
-keep class com.mkuczera.** { *; }

# === React Native Fast OpenCV ===
-keep class com.fastopencv.** { *; }

# === React Native MLKit OCR ===
-keep class com.reactnativemlkitocr.** { *; }

# === OpenCV (Critical for Native Module) ===
-keep class org.opencv.** { *; }
-keep interface org.opencv.** { *; }
-dontwarn org.opencv.**

# === Other Native Modules (Prevent Stripping) ===
-keep class com.shopify.reactnative.skia.** { *; }
-keep class com.sensors.** { *; }
-keep class com.imagepicker.** { *; }
-keep class com.rnfs.** { *; }
-keep class com.ReactNativeBlobUtil.** { *; }
-keep class com.zoontek.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class com.notifee.** { *; }

# === Community Modules (AsyncStorage, NetInfo, Slider, etc.) ===
-keep class com.reactnativecommunity.** { *; }
-keep class com.reactnativegooglesignin.** { *; }
-keep class com.devialab.exif.** { *; }
-keep class com.facebook.reactnative.androidsdk.** { *; }
-keep class fr.bamlab.rnimageresizer.** { *; }
-keep class com.oblador.keychain.** { *; }
-keep class com.BV.LinearGradient.** { *; }
-keep class com.cubicphuse.RCTTorch.** { *; }
-keep class com.worklets.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.RNProximity.** { *; }
-keep class org.linusu.** { *; }

# === Nitro & Worklets ===
-keep class com.margelo.nitro.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.worklets.** { *; }

# === Firebase (Safety Net) ===
-keep class io.invertase.firebase.** { *; }

# === Crypto / RandomBytes ===
-keep class com.bitgo.randombytes.** { *; }

# === Aggressive Keep for TurboModules (New Arch) ===
-keep class com.facebook.react.viewmanagers.** { *; }
-keep class com.facebook.react.b.** { *; } # Bridge / JSI internals often obfuscated here
-keep class com.facebook.jni.** { *; }

# === Codegen Generated Specs (CRITICAL for New Architecture) ===
# This namespace contains ALL generated TurboModule specs
-keep class com.facebook.fbreact.specs.** { *; }
-keep interface com.facebook.fbreact.specs.** { *; }

# Keep all Native*Spec interfaces (pattern matching for codegen output)
-keep class **NativeRNBootSplashSpec { *; }
-keep class **Native*Spec { *; }
-keep interface **Native*Spec { *; }

# === RNBootSplash Specific (Fix for TurboModuleRegistry crash) ===
-keep class com.zoontek.rnbootsplash.** { *; }
-keep class com.zoontek.rnbootsplash.RNBootSplashModule { *; }
-keep class com.zoontek.rnbootsplash.RNBootSplashPackage { *; }
-keep class com.zoontek.rnbootsplash.NativeRNBootSplashSpec { *; }
-keep interface com.zoontek.rnbootsplash.NativeRNBootSplashSpec { *; }

# Keep module name registration (prevents getName() from being stripped)
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    public java.lang.String getName();
}
-keepclassmembers class * implements com.facebook.react.turbomodule.core.interfaces.TurboModule {
    *;
}
