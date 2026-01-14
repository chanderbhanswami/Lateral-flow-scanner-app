#import "CameraMetadataModule.h"
#import <React/RCTLog.h>

@implementation CameraMetadataModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(getCameraCapabilities:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
    
    if (device == nil) {
        reject(@"ERROR", @"Camera device not found", nil);
        return;
    }
    
    NSMutableDictionary *capabilities = [NSMutableDictionary dictionary];
    
    // Focal length
    if (device.activeFormat) {
        [capabilities setObject:@(device.activeFormat.videoMaxZoomFactor) forKey:@"maxZoom"];
        [capabilities setObject:@(device.activeFormat.videoMinZoomFactor) forKey:@"minZoom"];
    }
    
    // Lens aperture
    if (device.lensAperture > 0) {
        [capabilities setObject:@(device.lensAperture) forKey:@"aperture"];
    }
    
    // ISO range
    if (device.activeFormat) {
        [capabilities setObject:@(device.activeFormat.minISO) forKey:@"minISO"];
        [capabilities setObject:@(device.activeFormat.maxISO) forKey:@"maxISO"];
    }
    
    // Exposure duration range
    if (device.activeFormat) {
        CMTime minExposure = device.activeFormat.minExposureDuration;
        CMTime maxExposure = device.activeFormat.maxExposureDuration;
        [capabilities setObject:@(CMTimeGetSeconds(minExposure)) forKey:@"minExposure"];
        [capabilities setObject:@(CMTimeGetSeconds(maxExposure)) forKey:@"maxExposure"];
    }
    
    // Device info
    [capabilities setObject:device.localizedName forKey:@"deviceName"];
    [capabilities setObject:@(device.position == AVCaptureDevicePositionBack ? 1 : 0) forKey:@"isBackCamera"];
    
    resolve(capabilities);
}

RCT_EXPORT_METHOD(getDeviceMake:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@"Apple");
}

RCT_EXPORT_METHOD(getDeviceModel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    struct utsname systemInfo;
    uname(&systemInfo);
    NSString *model = [NSString stringWithCString:systemInfo.machine encoding:NSUTF8StringEncoding];
    resolve(model);
}

@end