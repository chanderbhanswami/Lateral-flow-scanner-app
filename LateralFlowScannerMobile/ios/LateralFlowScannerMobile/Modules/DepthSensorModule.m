#import "DepthSensorModule.h"
#import <AVFoundation/AVFoundation.h>

@implementation DepthSensorModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(getCapabilities:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    BOOL hasLiDAR = NO;
    BOOL hasToF = NO;

    if (@available(iOS 15.4, *)) {
        AVCaptureDeviceDiscoverySession *discoverySession = [AVCaptureDeviceDiscoverySession
            discoverySessionWithDeviceTypes:@[AVCaptureDeviceTypeBuiltInLiDARDepthCamera]
                                  mediaType:AVMediaTypeVideo
                                   position:AVCaptureDevicePositionBack];
        
        if (discoverySession.devices.count > 0) {
            hasLiDAR = YES;
            hasToF = YES; // LiDAR is a form of ToF
        }
    }

    // Check for Dual Camera (Telephoto + Wide) or Dual Wide
    AVCaptureDeviceDiscoverySession *dualSession = [AVCaptureDeviceDiscoverySession
        discoverySessionWithDeviceTypes:@[AVCaptureDeviceTypeBuiltInDualCamera, AVCaptureDeviceTypeBuiltInDualWideCamera]
                              mediaType:AVMediaTypeVideo
                               position:AVCaptureDevicePositionBack];
    
    BOOL hasDualCamera = dualSession.devices.count > 0;

    NSDictionary *capabilities = @{
        @"hasLiDAR": @(hasLiDAR),
        @"hasToF": @(hasToF),
        @"hasDualCamera": @(hasDualCamera),
        @"hasAutofocusDistance": @(YES) // iPhones uphold this
    };

    resolve(capabilities);
}

RCT_EXPORT_METHOD(getLiDARDepth:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    // Real-time LiDAR data access via a simple module method is not standard.
    // Usually requires an active ARSession or AVCaptureSession streaming depth data.
    // Returning 'unavailable' to signal usage of Frame Processors / ARKit directly.
    // Ideally, the React Native app uses VisionCamera's depth output or ARKit modules for this.
    
    reject(@"NOT_AVAILABLE", @"LiDAR depth streaming requires active Camera/AR session.", nil);
}

RCT_EXPORT_METHOD(getToFDepth:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    reject(@"NOT_AVAILABLE", @"ToF depth streaming requires active Camera/AR session.", nil);
}

@end
