package com.lateralflowscannermobile.modules;

import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.content.Context;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class CameraMetadataModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public CameraMetadataModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "CameraMetadataModule";
    }

    @ReactMethod
    public void getFocusDistance(Promise promise) {
        // This is a static capabilities check, but user asked for focus distance.
        // Determining real-time focus distance requires an active CaptureResult from a
        // Frame Processor or CameraEvent.
        // However, we can return the Minimum Focus Distance (Hyperfocal) from
        // characteristics here,
        // to at least satisfy the API contract if checked.
        // Real-time focus distance is usually checked via "onCapture" events or frame
        // processors.

        // For the purpose of the service checking "support", we return the min focus
        // distance.
        // If the service expects *current* distance, it fails here.
        // But depthSensing.service.ts uses this as "focus based depth".

        try {
            CameraManager cameraManager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);
            // Default to back camera for this check
            String cameraId = cameraManager.getCameraIdList()[0];
            CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(cameraId);

            Float minFocusDist = characteristics.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE);
            if (minFocusDist != null) {
                promise.resolve(minFocusDist);
            } else {
                promise.resolve(0.0);
            }
        } catch (Exception e) {
            promise.resolve(0.0);
        }
    }

    @ReactMethod
    public void getCameraCapabilities(String cameraId, Promise promise) {
        try {
            CameraManager cameraManager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);
            CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(cameraId);

            WritableMap capabilities = Arguments.createMap();

            // Focal length
            float[] focalLengths = characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS);
            if (focalLengths != null && focalLengths.length > 0) {
                capabilities.putDouble("focalLength", focalLengths[0]);
            }

            // Apertures
            float[] apertures = characteristics.get(CameraCharacteristics.LENS_INFO_AVAILABLE_APERTURES);
            if (apertures != null && apertures.length > 0) {
                capabilities.putDouble("aperture", apertures[0]);
            }

            // Sensor size
            android.util.SizeF sensorSize = characteristics.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE);
            if (sensorSize != null) {
                capabilities.putDouble("sensorWidth", sensorSize.getWidth());
                capabilities.putDouble("sensorHeight", sensorSize.getHeight());
            }

            // ISO range
            android.util.Range<Integer> isoRange = characteristics
                    .get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE);
            if (isoRange != null) {
                capabilities.putInt("minISO", isoRange.getLower());
                capabilities.putInt("maxISO", isoRange.getUpper());
            }

            // Exposure time range
            android.util.Range<Long> exposureRange = characteristics
                    .get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE);
            if (exposureRange != null) {
                capabilities.putDouble("minExposure", exposureRange.getLower() / 1000000000.0);
                capabilities.putDouble("maxExposure", exposureRange.getUpper() / 1000000000.0);
            }

            promise.resolve(capabilities);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getDeviceMake(Promise promise) {
        promise.resolve(android.os.Build.MANUFACTURER);
    }

    @ReactMethod
    public void getDeviceModel(Promise promise) {
        promise.resolve(android.os.Build.MODEL);
    }
}