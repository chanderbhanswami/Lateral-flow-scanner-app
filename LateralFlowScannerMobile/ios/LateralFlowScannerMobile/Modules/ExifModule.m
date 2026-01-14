#import "ExifModule.h"
#import <React/RCTLog.h>

@implementation ExifModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(extractExifData:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSURL *imageURL = [NSURL fileURLWithPath:imagePath];
        CGImageSourceRef imageSource = CGImageSourceCreateWithURL((CFURLRef)imageURL, NULL);
        
        if (imageSource == NULL) {
            reject(@"ERROR", @"Failed to create image source", nil);
            return;
        }
        
        NSDictionary *metadata = (__bridge_transfer NSDictionary *)CGImageSourceCopyPropertiesAtIndex(imageSource, 0, NULL);
        CFRelease(imageSource);
        
        NSMutableDictionary *exifData = [NSMutableDictionary dictionary];
        
        // Extract TIFF data
        NSDictionary *tiff = metadata[(NSString *)kCGImagePropertyTIFFDictionary];
        if (tiff) {
            [exifData setObject:tiff[(NSString *)kCGImagePropertyTIFFMake] ?: @"Unknown" forKey:@"make"];
            [exifData setObject:tiff[(NSString *)kCGImagePropertyTIFFModel] ?: @"Unknown" forKey:@"model"];
            [exifData setObject:tiff[(NSString *)kCGImagePropertyTIFFDateTime] ?: @"" forKey:@"dateTime"];
            [exifData setObject:tiff[(NSString *)kCGImagePropertyTIFFSoftware] ?: @"" forKey:@"software"];
            [exifData setObject:tiff[(NSString *)kCGImagePropertyTIFFOrientation] ?: @1 forKey:@"orientation"];
        }
        
        // Extract EXIF data
        NSDictionary *exif = metadata[(NSString *)kCGImagePropertyExifDictionary];
        if (exif) {
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifExposureTime] ?: @0 forKey:@"exposureTime"];
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifFNumber] ?: @0 forKey:@"fNumber"];
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifISOSpeedRatings] ?: @[@0] forKey:@"iso"];
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifFocalLength] ?: @0 forKey:@"focalLength"];
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifDateTimeOriginal] ?: @"" forKey:@"dateTimeOriginal"];
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifDateTimeDigitized] ?: @"" forKey:@"dateTimeDigitized"];
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifWhiteBalance] ?: @0 forKey:@"whiteBalance"];
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifFlash] ?: @0 forKey:@"flash"];
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifLensMake] ?: @"" forKey:@"lensMake"];
            [exifData setObject:exif[(NSString *)kCGImagePropertyExifLensModel] ?: @"" forKey:@"lensModel"];
        }
        
        // Extract GPS data
        NSDictionary *gps = metadata[(NSString *)kCGImagePropertyGPSDictionary];
        if (gps) {
            NSMutableDictionary *gpsData = [NSMutableDictionary dictionary];
            [gpsData setObject:gps[(NSString *)kCGImagePropertyGPSLatitude] ?: @0 forKey:@"latitude"];
            [gpsData setObject:gps[(NSString *)kCGImagePropertyGPSLongitude] ?: @0 forKey:@"longitude"];
            [gpsData setObject:gps[(NSString *)kCGImagePropertyGPSAltitude] ?: @0 forKey:@"altitude"];
            [exifData setObject:gpsData forKey:@"gps"];
        }
        
        // Image dimensions
        NSNumber *width = metadata[(NSString *)kCGImagePropertyPixelWidth];
        NSNumber *height = metadata[(NSString *)kCGImagePropertyPixelHeight];
        if (width && height) {
            [exifData setObject:width forKey:@"imageWidth"];
            [exifData setObject:height forKey:@"imageHeight"];
        }
        
        resolve(exifData);
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(writeExifData:(NSString *)imagePath
                  exifDict:(NSDictionary *)exifDict
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSURL *imageURL = [NSURL fileURLWithPath:imagePath];
        CGImageSourceRef imageSource = CGImageSourceCreateWithURL((CFURLRef)imageURL, NULL);
        
        if (imageSource == NULL) {
            reject(@"ERROR", @"Failed to create image source", nil);
            return;
        }
        
        // Create destination
        NSString *tempPath = [NSTemporaryDirectory() stringByAppendingPathComponent:@"temp_exif.jpg"];
        NSURL *tempURL = [NSURL fileURLWithPath:tempPath];
        CGImageDestinationRef destination = CGImageDestinationCreateWithURL((CFURLRef)tempURL, kUTTypeJPEG, 1, NULL);
        
        if (destination == NULL) {
            CFRelease(imageSource);
            reject(@"ERROR", @"Failed to create image destination", nil);
            return;
        }
        
        // Add image with new metadata
        CGImageDestinationAddImageFromSource(destination, imageSource, 0, (__bridge CFDictionaryRef)exifDict);
        
        if (!CGImageDestinationFinalize(destination)) {
            CFRelease(imageSource);
            CFRelease(destination);
            reject(@"ERROR", @"Failed to finalize image", nil);
            return;
        }
        
        CFRelease(imageSource);
        CFRelease(destination);
        
        // Replace original file
        NSError *error;
        [[NSFileManager defaultManager] removeItemAtURL:imageURL error:&error];
        [[NSFileManager defaultManager] moveItemAtURL:tempURL toURL:imageURL error:&error];
        
        if (error) {
            reject(@"ERROR", error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

@end