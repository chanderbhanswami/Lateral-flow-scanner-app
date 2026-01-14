package com.lateralflowscanner.modules;

import android.os.Build;
import android.os.Environment;
import android.os.StatFs;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.io.File;
import java.io.RandomAccessFile;
import java.util.HashMap;
import java.util.Map;

public class NativeUtilsModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public NativeUtilsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "NativeUtilsModule";
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("DEVICE_BRAND", Build.BRAND);
        constants.put("DEVICE_MODEL", Build.MODEL);
        constants.put("DEVICE_MANUFACTURER", Build.MANUFACTURER);
        constants.put("ANDROID_VERSION", Build.VERSION.RELEASE);
        constants.put("SDK_INT", Build.VERSION.SDK_INT);
        return constants;
    }

    @ReactMethod
    public void getDeviceInfo(Promise promise) {
        try {
            WritableMap info = Arguments.createMap();
            info.putString("brand", Build.BRAND);
            info.putString("model", Build.MODEL);
            info.putString("manufacturer", Build.MANUFACTURER);
            info.putString("androidVersion", Build.VERSION.RELEASE);
            info.putInt("sdkInt", Build.VERSION.SDK_INT);
            info.putString("device", Build.DEVICE);
            info.putString("product", Build.PRODUCT);
            info.putString("hardware", Build.HARDWARE);

            promise.resolve(info);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getStorageInfo(Promise promise) {
        try {
            StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
            long bytesAvailable = stat.getBlockSizeLong() * stat.getAvailableBlocksLong();
            long bytesTotal = stat.getBlockSizeLong() * stat.getBlockCountLong();

            WritableMap info = Arguments.createMap();
            info.putDouble("availableSpace", bytesAvailable);
            info.putDouble("totalSpace", bytesTotal);
            info.putDouble("usedSpace", bytesTotal - bytesAvailable);

            promise.resolve(info);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getMemoryInfo(Promise promise) {
        try {
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();

            WritableMap info = Arguments.createMap();
            info.putDouble("maxMemory", maxMemory);
            info.putDouble("totalMemory", totalMemory);
            info.putDouble("freeMemory", freeMemory);
            info.putDouble("usedMemory", totalMemory - freeMemory);

            promise.resolve(info);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getBatteryLevel(Promise promise) {
        try {
            // This is simplified - full implementation would use BatteryManager
            promise.resolve(100.0);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getCPUInfo(Promise promise) {
        try {
            WritableMap info = Arguments.createMap();
            info.putInt("cores", Runtime.getRuntime().availableProcessors());
            info.putString("architecture", Build.SUPPORTED_ABIS[0]);

            promise.resolve(info);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}