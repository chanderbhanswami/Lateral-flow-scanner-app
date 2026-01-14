#import "SensorModule.h"
#import <React/RCTLog.h>

@implementation SensorModule {
    CMMotionManager *motionManager;
    BOOL hasListeners;
}

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onLightSensorChange", @"onProximityChange", @"onAccelerometerChange", @"onGyroscopeChange"];
}

- (instancetype)init {
    self = [super init];
    if (self) {
        motionManager = [[CMMotionManager alloc] init];
    }
    return self;
}

- (void)startObserving {
    hasListeners = YES;
}

- (void)stopObserving {
    hasListeners = NO;
}

RCT_EXPORT_METHOD(startLightSensor) {
    // iOS doesn't provide direct light sensor access
    RCTLogInfo(@"Light sensor not available on iOS");
}

RCT_EXPORT_METHOD(stopLightSensor) {
    RCTLogInfo(@"Light sensor stop called");
}

RCT_EXPORT_METHOD(startProximitySensor) {
    [[UIDevice currentDevice] setProximityMonitoringEnabled:YES];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(proximityStateChanged:)
                                                 name:UIDeviceProximityStateDidChangeNotification
                                               object:nil];
}

RCT_EXPORT_METHOD(stopProximitySensor) {
    [[UIDevice currentDevice] setProximityMonitoringEnabled:NO];
    [[NSNotificationCenter defaultCenter] removeObserver:self
                                                     name:UIDeviceProximityStateDidChangeNotification
                                                   object:nil];
}

RCT_EXPORT_METHOD(startAccelerometer:(double)interval) {
    if (motionManager.accelerometerAvailable) {
        motionManager.accelerometerUpdateInterval = interval / 1000.0;
        [motionManager startAccelerometerUpdatesToQueue:[NSOperationQueue mainQueue]
                                            withHandler:^(CMAccelerometerData *data, NSError *error) {
            if (hasListeners && data) {
                [self sendEventWithName:@"onAccelerometerChange" body:@{
                    @"x": @(data.acceleration.x),
                    @"y": @(data.acceleration.y),
                    @"z": @(data.acceleration.z),
                    @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
                }];
            }
        }];
    }
}

RCT_EXPORT_METHOD(stopAccelerometer) {
    [motionManager stopAccelerometerUpdates];
}

RCT_EXPORT_METHOD(startGyroscope:(double)interval) {
    if (motionManager.gyroAvailable) {
        motionManager.gyroUpdateInterval = interval / 1000.0;
        [motionManager startGyroUpdatesToQueue:[NSOperationQueue mainQueue]
                                    withHandler:^(CMGyroData *data, NSError *error) {
            if (hasListeners && data) {
                [self sendEventWithName:@"onGyroscopeChange" body:@{
                    @"x": @(data.rotationRate.x),
                    @"y": @(data.rotationRate.y),
                    @"z": @(data.rotationRate.z),
                    @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
                }];
            }
        }];
    }
}

RCT_EXPORT_METHOD(stopGyroscope) {
    [motionManager stopGyroUpdates];
}

- (void)proximityStateChanged:(NSNotification *)notification {
    BOOL state = [[UIDevice currentDevice] proximityState];
    if (hasListeners) {
        [self sendEventWithName:@"onProximityChange" body:@{
            @"isNear": @(state),
            @"distance": @(state ? 0 : 5)
        }];
    }
}

@end