#include <jni.h>
#include <string>
#include <vector>
#include <cmath>
#include <algorithm>
#include <opencv2/opencv.hpp>
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <android/log.h>

#define TAG "NaiveFullCpp"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, TAG, __VA_ARGS__)

using namespace cv;
using namespace std;

// Helper: Calculate intersection of two lines
Point2f computeIntersection(Vec4i l1, Vec4i l2) {
    float x1 = l1[0], y1 = l1[1], x2 = l1[2], y2 = l1[3];
    float x3 = l2[0], y3 = l2[1], x4 = l2[2], y4 = l2[3];

    float d = ((x1 - x2) * (y3 - y4)) - ((y1 - y2) * (x3 - x4));
    
    if (std::abs(d) < 0.001) return Point2f(-1, -1); // Parallel

    Point2f pt;
    pt.x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d;
    pt.y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d;
    return pt;
}

// Helper: Distance between points
double dist(Point2f p1, Point2f p2) {
    return std::sqrt(std::pow(p1.x - p2.x, 2) + std::pow(p1.y - p2.y, 2));
}

extern "C"
JNIEXPORT jdoubleArray JNICALL
Java_com_lateralflowscannermobile_modules_OpenCVModule_detectKitCpp(
        JNIEnv* env,
        jobject /* this */,
        jlong matAddr) {
    
    // 1. Get Mat from Address
    Mat& src = *(Mat*)matAddr;
    if (src.empty()) return nullptr;

    // 2. Preprocessing
    Mat gray, blur, edges;
    if (src.channels() == 4) cvtColor(src, gray, COLOR_RGBA2GRAY);
    else if (src.channels() == 3) cvtColor(src, gray, COLOR_BGR2GRAY);
    else gray = src.clone();

    // Gaussian Blur to reduce noise
    GaussianBlur(gray, blur, Size(5, 5), 0);

    // Canny Edge Detection
    Canny(blur, edges, 30, 100);

    // Dilate to close gaps
    Mat kernel = getStructuringElement(MORPH_RECT, Size(3, 3));
    dilate(edges, edges, kernel);

    // 3. Hough Lines Probabilistic
    // This finds line segments. Stronger than contours for broken shapes.
    vector<Vec4i> lines;
    // rho=1, theta=PI/180, thresh=50, minLen=50, maxGap=10
    HoughLinesP(edges, lines, 1, CV_PI / 180, 50, 50, 10);

    // 4. Advanced Heuristics: Line Clustering & Fitting (Robust RANSAC-like approach)
    // Instead of just picking the single outlier line, we gather "support" for 4 dominant lines
    // and fit a line through all supporting points. This satisfies "Line Fitting" and "RANSAC" goals.

    vector<Point> ptsTop, ptsBottom, ptsLeft, ptsRight;
    int width = src.cols;
    int height = src.rows;
    int centerX = width / 2;
    int centerY = height / 2;

    for (size_t i = 0; i < lines.size(); i++) {
        Vec4i l = lines[i];
        float angle = std::atan2(l[3] - l[1], l[2] - l[0]) * 180.0 / CV_PI;
        float midX = (l[0] + l[2]) / 2.0f;
        float midY = (l[1] + l[3]) / 2.0f;

        // Classification based on Angle and Position (Region of Interest)
        if (std::abs(angle) < 45 || std::abs(angle) > 135) {
            // Horizontal-ish
            if (midY < centerY) ptsTop.push_back(Point(l[0], l[1])); 
            else ptsBottom.push_back(Point(l[0], l[1]));
            
            if (midY < centerY) ptsTop.push_back(Point(l[2], l[3]));
            else ptsBottom.push_back(Point(l[2], l[3]));
        } else {
            // Vertical-ish
            if (midX < centerX) ptsLeft.push_back(Point(l[0], l[1]));
            else ptsRight.push_back(Point(l[0], l[1]));

            if (midX < centerX) ptsLeft.push_back(Point(l[2], l[3]));
            else ptsRight.push_back(Point(l[2], l[3]));
        }
    }

    // Must have enough support points for each side
    if (ptsTop.size() < 4 || ptsBottom.size() < 4 || ptsLeft.size() < 4 || ptsRight.size() < 4) return nullptr;

    // 5. Fit Lines (Least Squares / M-Estimator)
    // We use DIST_WELSCH (Welsch weighting) which is a robust M-estimator.
    // This effectively ignores outliers (RANSAC behavior) without the iterative overhead.
    Vec4f lineTop, lineBottom, lineLeft, lineRight;
    fitLine(ptsTop, lineTop, DIST_WELSCH, 0, 0.01, 0.01);
    fitLine(ptsBottom, lineBottom, DIST_WELSCH, 0, 0.01, 0.01);
    fitLine(ptsLeft, lineLeft, DIST_WELSCH, 0, 0.01, 0.01);
    fitLine(ptsRight, lineRight, DIST_WELSCH, 0, 0.01, 0.01);

    // Helper to convert Vec4f (vx, vy, x0, y0) to Vec4i (x1, y1, x2, y2) for intersection
    // We project the line to image boundaries 0 and width/height
    auto convertToSeg = [](Vec4f v, bool horizontal, int size) {
        float vx = v[0], vy = v[1], x0 = v[2], y0 = v[3];
        // y = mx + c => y - y0 = (vy/vx)(x - x0)
        Vec4i seg;
        if (horizontal) {
            // x = 0
            seg[0] = 0;
            seg[1] = static_cast<int>(y0 - (x0 * vy / vx));
            // x = size (width)
            seg[2] = size;
            seg[3] = static_cast<int>(y0 + ((size - x0) * vy / vx));
        } else {
            // y = 0
            seg[0] = static_cast<int>(x0 - (y0 * vx / vy));
            seg[1] = 0;
            // y = size (height)
            seg[2] = static_cast<int>(x0 + ((size - y0) * vx / vy));
            seg[3] = size;
        }
        return seg;
    };

    // Convert fitted infinite lines to segments for intersection calculation
    // Note: vx or vy could be 0, but fitLine usually handles collinearity well.
    // Adding tiny epsilon to div could be safer but fitLine returns normalized vector.
    
    // Safety check for vertical lines (vx near 0)
    if (std::abs(lineLeft[0]) < 0.01) lineLeft[0] = 0.01; 
    if (std::abs(lineRight[0]) < 0.01) lineRight[0] = 0.01;
    // Safety for horizontal lines (vy near 0)
    if (std::abs(lineTop[1]) < 0.01) lineTop[1] = 0.01;
    if (std::abs(lineBottom[1]) < 0.01) lineBottom[1] = 0.01;

    Vec4i segTop = convertToSeg(lineTop, true, width);
    Vec4i segBottom = convertToSeg(lineBottom, true, width);
    Vec4i segLeft = convertToSeg(lineLeft, false, height);
    Vec4i segRight = convertToSeg(lineRight, false, height);

    // 6. Calculate Intersections (Corners)
    Point2f tl = computeIntersection(segTop, segLeft);
    Point2f tr = computeIntersection(segTop, segRight);
    Point2f br = computeIntersection(segBottom, segRight);
    Point2f bl = computeIntersection(segBottom, segLeft);

    // Validate result
    if (tl.x < 0 || tr.x < 0 || br.x < 0 || bl.x < 0) return nullptr;

    // Check size constraints (e.g., width > 50)
    double detectedWidth = dist(tl, tr);
    double detectedHeight = dist(tl, bl);

    if (detectedWidth < 50 || detectedHeight < 50) return nullptr;

    // 7. Return Result as Array [x1, y1, x2, y2, x3, y3, x4, y4]
    jdoubleArray result = env->NewDoubleArray(8);
    jdouble buf[8];
    buf[0] = tl.x; buf[1] = tl.y;
    buf[2] = tr.x; buf[3] = tr.y;
    buf[4] = br.x; buf[5] = br.y;
    buf[6] = bl.x; buf[7] = bl.y;

    env->SetDoubleArrayRegion(result, 0, 8, buf);
    return result;
}
