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
