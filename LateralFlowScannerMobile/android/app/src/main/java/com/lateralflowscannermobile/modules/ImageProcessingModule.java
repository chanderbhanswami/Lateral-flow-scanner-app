package com.lateralflowscannermobile.modules;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import org.opencv.android.Utils;
import org.opencv.core.Mat;
import org.opencv.core.MatOfPoint;
import org.opencv.core.Scalar;
import org.opencv.imgproc.Imgproc;

import java.util.ArrayList;
import java.util.List;

public class ImageProcessingModule extends ReactContextBaseJavaModule {
    public ImageProcessingModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ImageProcessingModule";
    }

    @ReactMethod
    public void calculateLaplacianVariance(String base64Image, Promise promise) {
        try {
            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            Mat gray = new Mat();
            Imgproc.cvtColor(mat, gray, Imgproc.COLOR_BGR2GRAY);

            Mat laplacian = new Mat();
            Imgproc.Laplacian(gray, laplacian, -1);

            // Calculate variance
            double variance = calculateVariance(laplacian);

            promise.resolve(variance);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void detectBordersFromImage(String base64Image, Promise promise) {
        try {
            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            Mat mat = new Mat();
            Utils.bitmapToMat(bitmap, mat);

            Mat gray = new Mat();
            Imgproc.cvtColor(mat, gray, Imgproc.COLOR_BGR2GRAY);

            Mat edges = new Mat();
            Imgproc.Canny(gray, edges, 50, 150);

            List contours = new ArrayList<>();
            Mat hierarchy = new Mat();
            Imgproc.findContours(edges, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE);

            WritableMap result = Arguments.createMap();
            result.putBoolean("detected", contours.size() > 0);
            result.putDouble("confidence", contours.size() > 0 ? 0.8 : 0.0);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    private double calculateVariance(Mat mat) {
        // Calculate mean and variance
        double sum = 0, sq_sum = 0;
        int count = mat.rows() * mat.cols();

        for (int i = 0; i < mat.rows(); i++) {
            for (int j = 0; j < mat.cols(); j++) {
                double val = mat.get(i, j)[0];
                sum += val;
                sq_sum += val * val;
            }
        }

        double mean = sum / count;
        double variance = (sq_sum / count) - (mean * mean);

        return variance;
    }
}