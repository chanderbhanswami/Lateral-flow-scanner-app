package com.lateralflowscannermobile.modules;

import android.media.ExifInterface;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class ExifModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public ExifModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "ExifModule";
    }

    @ReactMethod
    public void extractExifData(String imagePath, Promise promise) {
        try {
            ExifInterface exif = new ExifInterface(imagePath);

            WritableMap exifData = Arguments.createMap();

            // Basic info
            exifData.putString("make", exif.getAttribute(ExifInterface.TAG_MAKE));
            exifData.putString("model", exif.getAttribute(ExifInterface.TAG_MODEL));
            exifData.putString("dateTime", exif.getAttribute(ExifInterface.TAG_DATETIME));
            exifData.putString("dateTimeOriginal", exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL));
            exifData.putString("dateTimeDigitized", exif.getAttribute(ExifInterface.TAG_DATETIME_DIGITIZED));

            // Camera settings
            exifData.putInt("orientation", exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, 0));
            exifData.putString("software", exif.getAttribute(ExifInterface.TAG_SOFTWARE));

            // Exposure info
            String exposureTime = exif.getAttribute(ExifInterface.TAG_EXPOSURE_TIME);
            if (exposureTime != null) {
                exifData.putString("exposureTime", exposureTime);
            }

            String fNumber = exif.getAttribute(ExifInterface.TAG_F_NUMBER);
            if (fNumber != null) {
                exifData.putString("fNumber", fNumber);
            }

            String iso = exif.getAttribute(ExifInterface.TAG_ISO_SPEED_RATINGS);
            if (iso != null) {
                exifData.putString("iso", iso);
            }

            String focalLength = exif.getAttribute(ExifInterface.TAG_FOCAL_LENGTH);
            if (focalLength != null) {
                exifData.putString("focalLength", focalLength);
            }

            String subjectDistance = exif.getAttribute(ExifInterface.TAG_SUBJECT_DISTANCE);
            if (subjectDistance != null) {
                exifData.putString("subjectDistance", subjectDistance);
            }

            // Resolution
            int imageWidth = exif.getAttributeInt(ExifInterface.TAG_IMAGE_WIDTH, 0);
            int imageHeight = exif.getAttributeInt(ExifInterface.TAG_IMAGE_LENGTH, 0);
            exifData.putInt("imageWidth", imageWidth);
            exifData.putInt("imageHeight", imageHeight);

            // GPS
            float[] latLong = new float[2];
            if (exif.getLatLong(latLong)) {
                WritableMap gps = Arguments.createMap();
                gps.putDouble("latitude", latLong[0]);
                gps.putDouble("longitude", latLong[1]);

                double altitude = exif.getAltitude(0);
                gps.putDouble("altitude", altitude);

                exifData.putMap("gps", gps);
            }

            // Lens info
            exifData.putString("lensMake", exif.getAttribute("LensMake"));
            exifData.putString("lensModel", exif.getAttribute("LensModel"));

            // White balance
            int whiteBalance = exif.getAttributeInt(ExifInterface.TAG_WHITE_BALANCE, 0);
            exifData.putInt("whiteBalance", whiteBalance);

            // Flash
            int flash = exif.getAttributeInt(ExifInterface.TAG_FLASH, 0);
            exifData.putInt("flash", flash);

            promise.resolve(exifData);
        } catch (IOException e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void writeExifData(String imagePath, String exifDataJson, Promise promise) {
        try {
            ExifInterface exif = new ExifInterface(imagePath);

            // Parse JSON and write EXIF data
            // This is a placeholder - you'd parse the JSON and write appropriate tags

            exif.saveAttributes();
            promise.resolve(true);
        } catch (IOException e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void embedExifInImage(String imageBase64, String exifDataJson, Promise promise) {
        try {
            // Decode base64 image
            byte[] decodedString = Base64.decode(imageBase64, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            // Save to temporary file
            File tempFile = File.createTempFile("exif_temp", ".jpg", reactContext.getCacheDir());
            FileOutputStream out = new FileOutputStream(tempFile);
            bitmap.compress(Bitmap.CompressFormat.JPEG, 100, out);
            out.close();

            // Write EXIF data
            ExifInterface exif = new ExifInterface(tempFile.getAbsolutePath());

            // Parse and write EXIF tags from JSON
            // This is a placeholder

            exif.saveAttributes();

            promise.resolve(tempFile.getAbsolutePath());
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}