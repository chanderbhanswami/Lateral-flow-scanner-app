package com.lateralflowscannermobile.modules;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;

import org.opencv.android.OpenCVLoader;
import org.opencv.android.Utils;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfDouble;
import org.opencv.core.MatOfPoint;
import org.opencv.core.MatOfPoint2f;
import org.opencv.core.Point;
import org.opencv.core.Rect;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.imgproc.Imgproc;

import com.facebook.react.bridge.ReadableMap;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

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
                Point[] corners = approx.toArray();
                WritableArray cornersArray = Arguments.createArray();

                for (Point corner : corners) {
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

            // Calculate histograms for each channel
            Mat histR = new Mat();
            Mat histG = new Mat();
            Mat histB = new Mat();

            Imgproc.calcHist(
                    channels.subList(2, 3),
                    new org.opencv.core.MatOfInt(0),
                    new Mat(),
                    histR,
                    new org.opencv.core.MatOfInt(256),
                    new org.opencv.core.MatOfFloat(0f, 256f));

            Imgproc.calcHist(
                    channels.subList(1, 2),
                    new org.opencv.core.MatOfInt(0),
                    new Mat(),
                    histG,
                    new org.opencv.core.MatOfInt(256),
                    new org.opencv.core.MatOfFloat(0f, 256f));

            Imgproc.calcHist(
                    channels.subList(0, 1),
                    new org.opencv.core.MatOfInt(0),
                    new Mat(),
                    histB,
                    new org.opencv.core.MatOfInt(256),
                    new org.opencv.core.MatOfFloat(0f, 256f));

            // Convert histograms to arrays
            WritableArray redArray = Arguments.createArray();
            WritableArray greenArray = Arguments.createArray();
            WritableArray blueArray = Arguments.createArray();

            for (int i = 0; i < 256; i++) {
                redArray.pushDouble(histR.get(i, 0)[0]);
                greenArray.pushDouble(histG.get(i, 0)[0]);
                blueArray.pushDouble(histB.get(i, 0)[0]);
            }

            // Calculate mean brightness
            Scalar meanScalar = Core.mean(mat);
            double mean = (meanScalar.val[0] + meanScalar.val[1] + meanScalar.val[2]) / 3;

            WritableMap result = Arguments.createMap();
            result.putArray("red", redArray);
            result.putArray("green", greenArray);
            result.putArray("blue", blueArray);
            result.putDouble("mean", mean);
            result.putDouble("std", 0.0); // Simplified
            result.putDouble("contrast", 0.5); // Simplified

            // Cleanup
            mat.release();
            for (Mat channel : channels) {
                channel.release();
            }
            histR.release();
            histG.release();
            histB.release();

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
    public void cropImage(String imagePath, WritableArray corners, Promise promise) {
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

    private double distance(Point p1, Point p2) {
        double dx = p1.x - p2.x;
        double dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}