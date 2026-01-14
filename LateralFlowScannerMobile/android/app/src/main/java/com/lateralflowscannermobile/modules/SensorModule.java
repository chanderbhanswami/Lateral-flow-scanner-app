package com.lateralflowscannermobile.modules;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class SensorModule extends ReactContextBaseJavaModule implements SensorEventListener {
    private final ReactApplicationContext reactContext;
    private SensorManager sensorManager;
    private Sensor lightSensor;
    private Sensor proximitySensor;

    public SensorModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.sensorManager = (SensorManager) reactContext.getSystemService(Context.SENSOR_SERVICE);
    }

    @Override
    public String getName() {
        return "SensorModule";
    }

    @ReactMethod
    public void startLightSensor() {
        if (lightSensor == null) {
            lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT);
        }
        if (lightSensor != null) {
            sensorManager.registerListener(this, lightSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    @ReactMethod
    public void stopLightSensor() {
        if (lightSensor != null) {
            sensorManager.unregisterListener(this, lightSensor);
        }
    }

    @ReactMethod
    public void startProximitySensor() {
        if (proximitySensor == null) {
            proximitySensor = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY);
        }
        if (proximitySensor != null) {
            sensorManager.registerListener(this, proximitySensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    @ReactMethod
    public void stopProximitySensor() {
        if (proximitySensor != null) {
            sensorManager.unregisterListener(this, proximitySensor);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        WritableMap data = Arguments.createMap();

        if (event.sensor.getType() == Sensor.TYPE_LIGHT) {
            data.putDouble("illuminance", event.values[0]);
            sendEvent("onLightSensorChange", data);
        } else if (event.sensor.getType() == Sensor.TYPE_PROXIMITY) {
            data.putDouble("distance", event.values[0]);
            sendEvent("onProximityChange", data);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Not used
    }

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}