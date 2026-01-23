package com.lateralflowscannermobile.modules;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.net.Uri;
import java.io.IOException;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;

import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.common.InputImage;

import org.opencv.android.OpenCVLoader;
import org.opencv.android.Utils;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfDouble;
import org.opencv.core.MatOfPoint;
import org.opencv.core.MatOfPoint2f;
import org.opencv.core.MatOfInt;
import org.opencv.core.MatOfFloat;
import org.opencv.core.Point;
import org.opencv.core.Rect;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.imgproc.Imgproc;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import android.media.ExifInterface; // Native Android EXIF interface

public class OpenCVModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private boolean openCVInitialized = false;

    public OpenCVModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        initializeOpenCV();
    }

    @Override
    public String getName() {
        return "OpenCVModule";
    }

    private void initializeOpenCV() {
        if (!openCVInitialized) {
            openCVInitialized = OpenCVLoader.initDebug();
            if (openCVInitialized) {
                try {
                    System.loadLibrary("appmodules");
                } catch (UnsatisfiedLinkError e) {
                    // Log error but don't crash, fallback to Java OpenCV
                    System.err.println("Failed to load native library: " + e.getMessage());
                }
            }
        }
    }

    // Native Method Declaration
    private native double[] detectKitCpp(long matAddr);

    @ReactMethod
    public void scanCodes(String imagePath, Promise promise) {
        try {
            InputImage image;
            if (imagePath.startsWith("file://")) {
                image = InputImage.fromFilePath(reactContext, Uri.parse(imagePath));
            } else {
                // Handle absolute path or other URI schemes
                // For now assume absolute path if not file scheme
                image = InputImage.fromFilePath(reactContext, Uri.parse("file://" + imagePath));
            }

            BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                    .setBarcodeFormats(
                            Barcode.FORMAT_QR_CODE,
                            Barcode.FORMAT_EAN_13,
                            Barcode.FORMAT_EAN_8,
                            Barcode.FORMAT_DATA_MATRIX)
                    .build();

            BarcodeScanner scanner = BarcodeScanning.getClient(options);

            scanner.process(image)
                    .addOnSuccessListener(barcodes -> {
                        WritableArray result = Arguments.createArray();
                        for (Barcode barcode : barcodes) {
                            WritableMap map = Arguments.createMap();
                            map.putString("rawValue", barcode.getRawValue());
                            map.putString("displayValue", barcode.getDisplayValue());
                            map.putInt("format", barcode.getFormat());
                            result.pushMap(map);
                        }
                        promise.resolve(result);
                    })
                    .addOnFailureListener(e -> {
                        promise.reject("BARCODE_ERROR", e.getMessage());
                    });

        } catch (IOException e) {
            promise.reject("IO_ERROR", "Failed to load image for barcode scanning: " + e.getMessage());
        } catch (Exception e) {
            promise.reject("UNKNOWN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void detectBorders(String base64Image, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            // Decode base64 to bitmap
            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            // Convert to Mat
            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            // Attempt Native C++ Detection First (Robust Hough+RANSAC)
            try {
                double[] cppResult = detectKitCpp(mat.getNativeObjAddr());
                if (cppResult != null && cppResult.length == 8) {
                    // Success from C++!
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("detected", true);
                    result.putDouble("confidence", 0.95);
                    result.putDouble("area",
                            distance(new Point(cppResult[0], cppResult[1]), new Point(cppResult[2], cppResult[3]))
                                    * distance(
                                            new Point(cppResult[0], cppResult[1]),
                                            new Point(cppResult[6], cppResult[7])));

                    WritableArray corners = Arguments.createArray();
                    for (int i = 0; i < 8; i += 2) {
                        WritableMap p = Arguments.createMap();
                        p.putDouble("x", cppResult[i]);
                        p.putDouble("y", cppResult[i + 1]);
                        corners.pushMap(p);
                    }
                    result.putArray("corners", corners);

                    mat.release();
                    promise.resolve(result);
                    return;
                }
            } catch (UnsatisfiedLinkError e) {
                // Determine if we should log or silently fail back to Java
                // System.err.println("Native method not found, falling back to Java.");
            }

            // Fallback to Java implementation (Original Logic)
            // Convert to grayscale
            Mat gray = new Mat();
            Imgproc.cvtColor(mat, gray, Imgproc.COLOR_BGR2GRAY);

            // Apply Gaussian blur
            Imgproc.GaussianBlur(gray, gray, new Size(5, 5), 0);

            // Edge detection
            Mat edges = new Mat();
            Imgproc.Canny(gray, edges, 50, 150);

            // Dilate to close gaps
            Mat kernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(3, 3));
            Imgproc.dilate(edges, edges, kernel);

            // Find contours
            List<MatOfPoint> contours = new ArrayList<>();
            Mat hierarchy = new Mat();
            Imgproc.findContours(edges, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE);

            // Find largest contour
            double maxArea = 0;
            MatOfPoint largestContour = null;

            for (MatOfPoint contour : contours) {
                double area = Imgproc.contourArea(contour);
                if (area > maxArea) {
                    maxArea = area;
                    largestContour = contour;
                }
            }

            WritableMap result = Arguments.createMap();

            if (largestContour != null && maxArea > 1000) {
                // Approximate polygon
                MatOfPoint2f contour2f = new MatOfPoint2f(largestContour.toArray());
                MatOfPoint2f approx = new MatOfPoint2f();
                double epsilon = 0.02 * Imgproc.arcLength(contour2f, true);
                Imgproc.approxPolyDP(contour2f, approx, epsilon, true);

                // Get corners
                Point[] cornersPoints = approx.toArray();
                WritableArray cornersArray = Arguments.createArray();

                for (Point corner : cornersPoints) {
                    WritableMap point = Arguments.createMap();
                    point.putDouble("x", corner.x);
                    point.putDouble("y", corner.y);
                    cornersArray.pushMap(point);
                }

                result.putBoolean("detected", true);
                result.putDouble("confidence", Math.min(maxArea / (mat.width() * mat.height()), 1.0));
                result.putArray("corners", cornersArray);
                result.putDouble("area", maxArea);
            } else {
                result.putBoolean("detected", false);
                result.putDouble("confidence", 0.0);
            }

            // Cleanup
            mat.release();
            gray.release();
            edges.release();
            kernel.release();
            hierarchy.release();

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void calculateLaplacianVariance(String base64Image, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            // Convert to grayscale
            Mat gray = new Mat();
            Imgproc.cvtColor(mat, gray, Imgproc.COLOR_BGR2GRAY);

            // Apply Laplacian
            Mat laplacian = new Mat();
            Imgproc.Laplacian(gray, laplacian, CvType.CV_64F);

            // Calculate variance
            // Calculate variance
            MatOfDouble mean = new MatOfDouble();
            MatOfDouble stddev = new MatOfDouble();
            Core.meanStdDev(laplacian, mean, stddev);

            double variance = Math.pow(stddev.toArray()[0], 2);

            // Cleanup
            mat.release();
            gray.release();
            laplacian.release();
            mean.release();
            stddev.release();

            promise.resolve(variance);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void detectShadows(String base64Image, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            // Convert to HSV
            Mat hsv = new Mat();
            Imgproc.cvtColor(mat, hsv, Imgproc.COLOR_BGR2HSV);

            // Extract V channel
            List<Mat> channels = new ArrayList<>();
            Core.split(hsv, channels);
            Mat vChannel = channels.get(2);

            // Threshold for shadows (low V values)
            Mat shadowMask = new Mat();
            Imgproc.threshold(vChannel, shadowMask, 60, 255, Imgproc.THRESH_BINARY_INV);

            // Calculate shadow coverage
            int totalPixels = shadowMask.rows() * shadowMask.cols();
            int shadowPixels = Core.countNonZero(shadowMask);
            double shadowCoverage = (double) shadowPixels / totalPixels;

            // Calculate shadow intensity
            Scalar meanIntensity = Core.mean(vChannel, shadowMask);
            double shadowIntensity = 1.0 - (meanIntensity.val[0] / 255.0);

            WritableMap result = Arguments.createMap();
            result.putBoolean("hasShadow", shadowCoverage > 0.1);
            result.putDouble("shadowCoverage", shadowCoverage);
            result.putDouble("shadowIntensity", shadowIntensity);

            // Cleanup
            mat.release();
            hsv.release();
            vChannel.release();
            shadowMask.release();
            for (Mat channel : channels) {
                channel.release();
            }

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void detectReflections(String base64Image, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            // Convert to grayscale
            Mat gray = new Mat();
            Imgproc.cvtColor(mat, gray, Imgproc.COLOR_BGR2GRAY);

            // Threshold for very bright pixels (potential reflections)
            Mat reflectionMask = new Mat();
            Imgproc.threshold(gray, reflectionMask, 240, 255, Imgproc.THRESH_BINARY);

            // Calculate reflection area
            int totalPixels = reflectionMask.rows() * reflectionMask.cols();
            int reflectionPixels = Core.countNonZero(reflectionMask);
            double affectedArea = (double) reflectionPixels / totalPixels;

            // Calculate reflection intensity
            Scalar meanBrightness = Core.mean(gray, reflectionMask);
            double reflectionIntensity = meanBrightness.val[0] / 255.0;

            WritableMap result = Arguments.createMap();
            result.putBoolean("hasReflection", affectedArea > 0.05);
            result.putDouble("reflectionIntensity", reflectionIntensity);
            result.putBoolean("glareDetected", affectedArea > 0.01);
            result.putDouble("affectedArea", affectedArea);

            // Cleanup
            mat.release();
            gray.release();
            reflectionMask.release();

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void calculateHistogram(String base64Image, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            // Split into channels
            List<Mat> channels = new ArrayList<>();
            Core.split(mat, channels);

            // Calculate RGB histograms
            Mat histR = new Mat();
            Mat histG = new Mat();
            Mat histB = new Mat();

            MatOfInt channelsInt = new MatOfInt(0);
            MatOfInt histSize = new MatOfInt(256);
            MatOfFloat ranges = new MatOfFloat(0f, 256f);

            Imgproc.calcHist(channels.subList(2, 3), channelsInt, new Mat(), histR, histSize, ranges);
            Imgproc.calcHist(channels.subList(1, 2), channelsInt, new Mat(), histG, histSize, ranges);
            Imgproc.calcHist(channels.subList(0, 1), channelsInt, new Mat(), histB, histSize, ranges);

            // Calculate Luminance Histogram
            Mat gray = new Mat();
            Imgproc.cvtColor(mat, gray, Imgproc.COLOR_BGR2GRAY);
            Mat histLum = new Mat();
            Imgproc.calcHist(java.util.Collections.singletonList(gray), channelsInt, new Mat(), histLum, histSize,
                    ranges);

            // Convert histograms to arrays
            WritableArray redArray = Arguments.createArray();
            WritableArray greenArray = Arguments.createArray();
            WritableArray blueArray = Arguments.createArray();
            WritableArray lumArray = Arguments.createArray();

            float[] lumData = new float[256];

            for (int i = 0; i < 256; i++) {
                redArray.pushDouble(histR.get(i, 0)[0]);
                greenArray.pushDouble(histG.get(i, 0)[0]);
                blueArray.pushDouble(histB.get(i, 0)[0]);

                float val = (float) histLum.get(i, 0)[0];
                lumArray.pushDouble(val);
                lumData[i] = val; // Cache for peak detection
            }

            // Simple Bimodal Detection on Luminance
            // Find peaks (local maxima)
            int peaks = 0;
            // Smooth slightly to remove noise (simple moving average)
            float[] smoothed = new float[256];
            for (int i = 2; i < 254; i++) {
                smoothed[i] = (lumData[i - 2] + lumData[i - 1] + lumData[i] + lumData[i + 1] + lumData[i + 2]) / 5;
            }

            // Find peaks
            double maxVal = 0;
            for (float v : smoothed)
                maxVal = Math.max(maxVal, v);
            double peakThreshold = maxVal * 0.1; // Peak must be at least 10% of max height

            for (int i = 1; i < 255; i++) {
                if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1]) {
                    if (smoothed[i] > peakThreshold) {
                        peaks++;
                    }
                }
            }

            // Refine bimodality logic: Often involves valley depth, but "peaks >= 2" is a
            // good start.
            boolean isBimodal = (peaks >= 2);

            // Calculate mean brightness
            Scalar meanScalar = Core.mean(mat);
            double mean = (meanScalar.val[0] + meanScalar.val[1] + meanScalar.val[2]) / 3;

            WritableMap result = Arguments.createMap();
            result.putArray("red", redArray);
            result.putArray("green", greenArray);
            result.putArray("blue", blueArray);
            result.putArray("luminance", lumArray);
            result.putDouble("mean", mean);
            result.putDouble("std", 0.0); // Simplified
            result.putDouble("contrast", 0.5); // Simplified
            result.putBoolean("isBimodal", isBimodal);
            result.putInt("peakCount", peaks);

            // Cleanup
            mat.release();
            gray.release();
            for (Mat channel : channels)
                channel.release();
            histR.release();
            histG.release();
            histB.release();
            histLum.release();
            channelsInt.release();
            histSize.release();
            ranges.release();

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void enhanceImage(String base64Image, double brightness, double contrast, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            // Apply brightness and contrast
            Mat enhanced = new Mat();
            mat.convertTo(enhanced, -1, contrast, brightness);

            // Convert back to bitmap
            Bitmap enhancedBitmap = Bitmap.createBitmap(
                    enhanced.cols(),
                    enhanced.rows(),
                    Bitmap.Config.ARGB_8888);
            Utils.matToBitmap(enhanced, enhancedBitmap);

            // Convert to base64
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            enhancedBitmap.compress(Bitmap.CompressFormat.JPEG, 95, byteArrayOutputStream);
            byte[] byteArray = byteArrayOutputStream.toByteArray();
            String encoded = Base64.encodeToString(byteArray, Base64.DEFAULT);

            // Cleanup
            mat.release();
            enhanced.release();

            promise.resolve(encoded);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void perspectiveCorrection(String base64Image, ReadableArray corners, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            if (corners.size() != 4) {
                promise.reject("ERROR", "Need exactly 4 corners");
                return;
            }

            // Decode base64
            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            if (bitmap == null) {
                promise.reject("ERROR", "Could not decode base64 image");
                return;
            }

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            // Extract source points
            Point[] srcPoints = new Point[4];
            for (int i = 0; i < 4; i++) {
                ReadableMap corner = corners.getMap(i);
                srcPoints[i] = new Point(corner.getDouble("x"), corner.getDouble("y"));
            }

            // Calculate target dimensions
            double width = Math.max(
                    distance(srcPoints[0], srcPoints[1]),
                    distance(srcPoints[2], srcPoints[3]));
            double height = Math.max(
                    distance(srcPoints[0], srcPoints[3]),
                    distance(srcPoints[1], srcPoints[2]));

            // Define destination points (Rectangular)
            Point[] dstPoints = new Point[] {
                    new Point(0, 0),
                    new Point(width - 1, 0),
                    new Point(width - 1, height - 1),
                    new Point(0, height - 1)
            };

            Mat srcMat = new MatOfPoint2f(srcPoints);
            Mat dstMat = new MatOfPoint2f(dstPoints);
            Mat transform = Imgproc.getPerspectiveTransform(srcMat, dstMat);

            Mat corrected = new Mat();
            Imgproc.warpPerspective(mat, corrected, transform, new Size(width, height));

            // Convert back to base64
            Bitmap correctedBitmap = Bitmap.createBitmap(
                    corrected.cols(),
                    corrected.rows(),
                    Bitmap.Config.ARGB_8888);
            Utils.matToBitmap(corrected, correctedBitmap);

            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            correctedBitmap.compress(Bitmap.CompressFormat.JPEG, 90, byteArrayOutputStream);
            byte[] byteArray = byteArrayOutputStream.toByteArray();
            String encoded = Base64.encodeToString(byteArray, Base64.DEFAULT);

            // Cleanup
            mat.release();
            corrected.release();
            srcMat.release();
            dstMat.release();
            transform.release();

            promise.resolve(encoded);

        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    // Helper for distance
    private double distance(Point p1, Point p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    @ReactMethod
    public void cropImage(String imagePath, ReadableArray corners, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            if (corners.size() != 4) {
                promise.reject("ERROR", "Need exactly 4 corners");
                return;
            }

            // Read directly from file path
            Bitmap bitmap = BitmapFactory.decodeFile(imagePath);
            if (bitmap == null) {
                promise.reject("ERROR", "Could not decode file: " + imagePath);
                return;
            }

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            // Extract corner points
            Point[] srcPoints = new Point[4];
            for (int i = 0; i < 4; i++) {
                ReadableMap corner = corners.getMap(i);
                srcPoints[i] = new Point(corner.getDouble("x"), corner.getDouble("y"));
            }

            // Calculate target dimensions
            double width = Math.max(
                    distance(srcPoints[0], srcPoints[1]),
                    distance(srcPoints[2], srcPoints[3]));
            double height = Math.max(
                    distance(srcPoints[0], srcPoints[3]),
                    distance(srcPoints[1], srcPoints[2]));

            // Define destination points
            Point[] dstPoints = new Point[] {
                    new Point(0, 0),
                    new Point(width - 1, 0),
                    new Point(width - 1, height - 1),
                    new Point(0, height - 1)
            };

            // Get perspective transform matrix
            Mat srcMat = new MatOfPoint2f(srcPoints);
            Mat dstMat = new MatOfPoint2f(dstPoints);
            Mat transform = Imgproc.getPerspectiveTransform(srcMat, dstMat);

            // Apply transform
            Mat corrected = new Mat();
            Imgproc.warpPerspective(mat, corrected, transform, new Size(width, height));

            // Convert to bitmap
            Bitmap correctedBitmap = Bitmap.createBitmap(
                    corrected.cols(),
                    corrected.rows(),
                    Bitmap.Config.ARGB_8888);
            Utils.matToBitmap(corrected, correctedBitmap);

            // Save to new file path
            String outputPath = imagePath.replace(".jpg", "_cropped.jpg");
            // Handle if extension wasn't .jpg
            if (outputPath.equals(imagePath)) {
                outputPath = imagePath + "_cropped.jpg";
            }

            java.io.File file = new java.io.File(outputPath);
            java.io.FileOutputStream fOut = new java.io.FileOutputStream(file);

            correctedBitmap.compress(Bitmap.CompressFormat.JPEG, 95, fOut);
            fOut.flush();
            fOut.close();

            // Cleanup
            mat.release();
            corrected.release();
            srcMat.release();
            dstMat.release();
            transform.release();

            // Return the new file path
            promise.resolve(outputPath);

        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void calculateHSVHistogram(String base64Image, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            // Convert to HSV
            Mat hsv = new Mat();
            Imgproc.cvtColor(mat, hsv, Imgproc.COLOR_BGR2HSV);

            List<Mat> channels = new ArrayList<>();
            Core.split(hsv, channels);

            // Calculate HSV Histograms
            // H: 0-179 (180 bins)
            // S: 0-255 (256 bins)
            // V: 0-255 (256 bins)

            Mat histH = new Mat();
            Mat histS = new Mat();
            Mat histV = new Mat();

            // Hue
            Imgproc.calcHist(
                    channels.subList(0, 1),
                    new org.opencv.core.MatOfInt(0),
                    new Mat(),
                    histH,
                    new org.opencv.core.MatOfInt(180),
                    new org.opencv.core.MatOfFloat(0f, 180f));

            // Saturation
            Imgproc.calcHist(
                    channels.subList(1, 2),
                    new org.opencv.core.MatOfInt(0),
                    new Mat(),
                    histS,
                    new org.opencv.core.MatOfInt(256),
                    new org.opencv.core.MatOfFloat(0f, 256f));

            // Value
            Imgproc.calcHist(
                    channels.subList(2, 3),
                    new org.opencv.core.MatOfInt(0),
                    new Mat(),
                    histV,
                    new org.opencv.core.MatOfInt(256),
                    new org.opencv.core.MatOfFloat(0f, 256f));

            // Convert to arrays
            WritableArray hArray = Arguments.createArray();
            WritableArray sArray = Arguments.createArray();
            WritableArray vArray = Arguments.createArray();

            for (int i = 0; i < 180; i++) {
                hArray.pushDouble(histH.get(i, 0)[0]);
            }
            for (int i = 0; i < 256; i++) {
                sArray.pushDouble(histS.get(i, 0)[0]);
                vArray.pushDouble(histV.get(i, 0)[0]);
            }

            // Calculate means
            Scalar meanScalar = Core.mean(hsv);
            double meanHue = meanScalar.val[0];
            double meanSat = meanScalar.val[1];
            double meanVal = meanScalar.val[2];

            WritableMap result = Arguments.createMap();
            result.putArray("hue", hArray);
            result.putArray("saturation", sArray);
            result.putArray("value", vArray);
            result.putDouble("meanHue", meanHue);
            result.putDouble("meanSaturation", meanSat);
            result.putDouble("meanValue", meanVal);

            // Cleanup
            mat.release();
            hsv.release();
            for (Mat channel : channels) {
                channel.release();
            }
            histH.release();
            histS.release();
            histV.release();

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void calculateWaveform(String base64Image, Promise promise) {
        try {
            if (!openCVInitialized) {
                promise.reject("OPENCV_ERROR", "OpenCV not initialized");
                return;
            }

            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            Mat gray = new Mat();
            Imgproc.cvtColor(mat, gray, Imgproc.COLOR_BGR2GRAY);

            // Column Avg (Waveform X) - Reduce to 1 row
            Mat colReduce = new Mat();
            Core.reduce(gray, colReduce, 0, Core.REDUCE_AVG, CvType.CV_64F);

            // Row Avg (Waveform Y) - Reduce to 1 col
            Mat rowReduce = new Mat();
            Core.reduce(gray, rowReduce, 1, Core.REDUCE_AVG, CvType.CV_64F);

            WritableArray xArray = Arguments.createArray();
            WritableArray yArray = Arguments.createArray();

            for (int i = 0; i < colReduce.cols(); i++) {
                xArray.pushDouble(colReduce.get(0, i)[0]);
            }
            for (int i = 0; i < rowReduce.rows(); i++) {
                yArray.pushDouble(rowReduce.get(i, 0)[0]);
            }

            WritableMap result = Arguments.createMap();
            result.putArray("waveformX", xArray); // Intensity across width
            result.putArray("waveformY", yArray); // Intensity across height

            mat.release();
            gray.release();
            colReduce.release();
            rowReduce.release();

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getExifData(String filePath, Promise promise) {
        try {
            ExifInterface exif = new ExifInterface(filePath);
            WritableMap map = Arguments.createMap();

            // Read standard tags
            String iso = exif.getAttribute(ExifInterface.TAG_ISO_SPEED_RATINGS);
            String aperture = exif.getAttribute(ExifInterface.TAG_F_NUMBER);
            String exposureTime = exif.getAttribute(ExifInterface.TAG_EXPOSURE_TIME);
            String flash = exif.getAttribute(ExifInterface.TAG_FLASH);
            String focalLength = exif.getAttribute(ExifInterface.TAG_FOCAL_LENGTH);
            String make = exif.getAttribute(ExifInterface.TAG_MAKE);
            String model = exif.getAttribute(ExifInterface.TAG_MODEL);
            String whiteBalance = exif.getAttribute(ExifInterface.TAG_WHITE_BALANCE);
            String datetime = exif.getAttribute(ExifInterface.TAG_DATETIME);

            // Parse numeric values where possible for better JSON structure, or keep as
            // strings
            // For shared types consistency, some might need parsing.
            // However, returning raw strings is safer, let JS parse.

            if (iso != null)
                map.putString("iso", iso);
            if (aperture != null)
                map.putString("aperture", aperture);
            if (exposureTime != null)
                map.putString("exposureTime", exposureTime);
            if (flash != null)
                map.putString("flash", flash);
            if (focalLength != null)
                map.putString("focalLength", focalLength);
            if (make != null)
                map.putString("make", make);
            if (model != null)
                map.putString("model", model);
            if (whiteBalance != null)
                map.putString("whiteBalance", whiteBalance);
            if (datetime != null)
                map.putString("datetime", datetime);

            promise.resolve(map);
        } catch (Exception e) {
            promise.reject("EXIF_ERROR", e.getMessage());
        }
    }

    private double distance(Point p1, Point p2) {
        double dx = p1.x - p2.x;
        double dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}