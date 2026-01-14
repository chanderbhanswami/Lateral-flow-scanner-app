#import "OpenCVModule.h"
#import <React/RCTLog.h>

@implementation OpenCVModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(detectBorders:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        // Decode base64
        NSData *imageData = [[NSData alloc] initWithBase64EncodedString:base64Image options:0];
        UIImage *image = [UIImage imageWithData:imageData];
        
        if (!image) {
            reject(@"ERROR", @"Failed to decode image", nil);
            return;
        }
        
        // Convert to cv::Mat
        cv::Mat mat;
        [self UIImageToMat:image mat:&mat];
        
        // Convert to grayscale
        cv::Mat gray;
        cv::cvtColor(mat, gray, cv::COLOR_BGR2GRAY);
        
        // Apply Gaussian blur
        cv::GaussianBlur(gray, gray, cv::Size(5, 5), 0);
        
        // Edge detection
        cv::Mat edges;
        cv::Canny(gray, edges, 50, 150);
        
        // Dilate
        cv::Mat kernel = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(3, 3));
        cv::dilate(edges, edges, kernel);
        
        // Find contours
        std::vector<std::vector<cv::Point>> contours;
        cv::findContours(edges, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);
        
        // Find largest contour
        double maxArea = 0;
        std::vector<cv::Point> largestContour;
        
        for (const auto& contour : contours) {
            double area = cv::contourArea(contour);
            if (area > maxArea) {
                maxArea = area;
                largestContour = contour;
            }
        }
        
        NSMutableDictionary *result = [NSMutableDictionary dictionary];
        
        if (maxArea > 1000) {
            // Approximate polygon
            std::vector<cv::Point> approx;
            double epsilon = 0.02 * cv::arcLength(largestContour, true);
            cv::approxPolyDP(largestContour, approx, epsilon, true);
            
            // Get corners
            NSMutableArray *corners = [NSMutableArray array];
            for (const auto& point : approx) {
                [corners addObject:@{
                    @"x": @(point.x),
                    @"y": @(point.y)
                }];
            }
            
            [result setObject:@YES forKey:@"detected"];
            [result setObject:@(std::min(maxArea / (mat.cols * mat.rows), 1.0)) forKey:@"confidence"];
            [result setObject:corners forKey:@"corners"];
            [result setObject:@(maxArea) forKey:@"area"];
        } else {
            [result setObject:@NO forKey:@"detected"];
            [result setObject:@0.0 forKey:@"confidence"];
        }
        
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(calculateLaplacianVariance:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSData *imageData = [[NSData alloc] initWithBase64EncodedString:base64Image options:0];
        UIImage *image = [UIImage imageWithData:imageData];
        
        cv::Mat mat;
        [self UIImageToMat:image mat:&mat];
        
        // Convert to grayscale
        cv::Mat gray;
        cv::cvtColor(mat, gray, cv::COLOR_BGR2GRAY);
        
        // Apply Laplacian
        cv::Mat laplacian;
        cv::Laplacian(gray, laplacian, CV_64F);
        
        // Calculate variance
        cv::Scalar mean, stddev;
        cv::meanStdDev(laplacian, mean, stddev);
        double variance = stddev[0] * stddev[0];
        
        resolve(@(variance));
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(detectShadows:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSData *imageData = [[NSData alloc] initWithBase64EncodedString:base64Image options:0];
        UIImage *image = [UIImage imageWithData:imageData];
        
        cv::Mat mat;
        [self UIImageToMat:image mat:&mat];
        
        // Convert to HSV
        cv::Mat hsv;
        cv::cvtColor(mat, hsv, cv::COLOR_BGR2HSV);
        
        // Extract V channel
        std::vector<cv::Mat> channels;
        cv::split(hsv, channels);
        cv::Mat vChannel = channels[2];
        
        // Threshold for shadows
        cv::Mat shadowMask;
        cv::threshold(vChannel, shadowMask, 60, 255, cv::THRESH_BINARY_INV);
        
        // Calculate coverage
        int totalPixels = shadowMask.rows * shadowMask.cols;
        int shadowPixels = cv::countNonZero(shadowMask);
        double shadowCoverage = (double)shadowPixels / totalPixels;
        
        // Calculate intensity
        cv::Scalar meanIntensity = cv::mean(vChannel, shadowMask);
        double shadowIntensity = 1.0 - (meanIntensity[0] / 255.0);
        
        resolve(@{
            @"hasShadow": @(shadowCoverage > 0.1),
            @"shadowCoverage": @(shadowCoverage),
            @"shadowIntensity": @(shadowIntensity)
        });
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(calculateHistogram:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSData *imageData = [[NSData alloc] initWithBase64EncodedString:base64Image options:0];
        UIImage *image = [UIImage imageWithData:imageData];
        
        cv::Mat mat;
        [self UIImageToMat:image mat:&mat];
        
        // Split channels
        std::vector<cv::Mat> channels;
        cv::split(mat, channels);
        
        // Calculate histograms
        int histSize = 256;
        float range[] = {0, 256};
        const float* histRange = {range};
        
        cv::Mat histR, histG, histB;
        cv::calcHist(&channels[2], 1, 0, cv::Mat(), histR, 1, &histSize, &histRange);
        cv::calcHist(&channels[1], 1, 0, cv::Mat(), histG, 1, &histSize, &histRange);
        cv::calcHist(&channels[0], 1, 0, cv::Mat(), histB, 1, &histSize, &histRange);
        
        // Convert to arrays
        NSMutableArray *redArray = [NSMutableArray array];
        NSMutableArray *greenArray = [NSMutableArray array];
        NSMutableArray *blueArray = [NSMutableArray array];
        
        for (int i = 0; i < 256; i++) {
            [redArray addObject:@(histR.at<float>(i))];
            [greenArray addObject:@(histG.at<float>(i))];
            [blueArray addObject:@(histB.at<float>(i))];
        }
        
        // Calculate mean
        cv::Scalar meanScalar = cv::mean(mat);
        double mean = (meanScalar[0] + meanScalar[1] + meanScalar[2]) / 3;
        
        resolve(@{
            @"red": redArray,
            @"green": greenArray,
            @"blue": blueArray,
            @"mean": @(mean),
            @"std": @0.0,
            @"contrast": @0.5
        });
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

- (void)UIImageToMat:(UIImage *)image mat:(cv::Mat *)mat {
    CGColorSpaceRef colorSpace = CGImageGetColorSpace(image.CGImage);
    CGFloat cols = image.size.width;
    CGFloat rows = image.size.height;
    
    mat->create(rows, cols, CV_8UC4);
    
    CGContextRef contextRef = CGBitmapContextCreate(
        mat->data,
        cols,
        rows,
        8,
        mat->step[0],
        colorSpace,
        kCGImageAlphaNoneSkipLast | kCGBitmapByteOrderDefault
    );
    
    CGContextDrawImage(contextRef, CGRectMake(0, 0, cols, rows), image.CGImage);
    CGContextRelease(contextRef);
}

@end