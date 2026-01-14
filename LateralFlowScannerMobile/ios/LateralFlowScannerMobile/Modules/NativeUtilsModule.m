#import "NativeUtilsModule.h"
#import <React/RCTLog.h>
#import <sys/utsname.h>

@implementation NativeUtilsModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (NSDictionary *)constantsToExport {
    return @{
        @"DEVICE_MODEL": [self deviceModel],
        @"SYSTEM_VERSION": [[UIDevice currentDevice] systemVersion],
        @"DEVICE_NAME": [[UIDevice currentDevice] name]
    };
}

RCT_EXPORT_METHOD(getDeviceInfo:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        resolve(@{
            @"model": [self deviceModel],
            @"systemVersion": [[UIDevice currentDevice] systemVersion],
            @"deviceName": [[UIDevice currentDevice] name],
            @"systemName": [[UIDevice currentDevice] systemName],
            @"identifierForVendor": [[[UIDevice currentDevice] identifierForVendor] UUIDString]
        });
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getStorageInfo:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSError *error = nil;
        NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
        NSDictionary *dictionary = [[NSFileManager defaultManager] attributesOfFileSystemForPath:[paths lastObject] error:&error];
        
        if (dictionary) {
            NSNumber *totalSpace = [dictionary objectForKey:NSFileSystemSize];
            NSNumber *freeSpace = [dictionary objectForKey:NSFileSystemFreeSize];
            
            resolve(@{
                @"totalSpace": totalSpace,
                @"freeSpace": freeSpace,
                @"usedSpace": @([totalSpace longLongValue] - [freeSpace longLongValue])
            });
        } else {
            reject(@"ERROR", error.localizedDescription, error);
        }
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getMemoryInfo:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        // Get memory info
        mach_port_t host_port = mach_host_self();
        mach_msg_type_number_t host_size = sizeof(vm_statistics_data_t) / sizeof(integer_t);
        vm_size_t pagesize;
        vm_statistics_data_t vm_stat;
        
        host_page_size(host_port, &pagesize);
        host_statistics(host_port, HOST_VM_INFO, (host_info_t)&vm_stat, &host_size);
        
        unsigned long long freeMemory = (vm_stat.free_count * pagesize);
        unsigned long long usedMemory = ((vm_stat.active_count + vm_stat.inactive_count + vm_stat.wire_count) * pagesize);
        
        resolve(@{
            @"freeMemory": @(freeMemory),
            @"usedMemory": @(usedMemory),
            @"totalMemory": @(freeMemory + usedMemory)
        });
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getBatteryLevel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        [[UIDevice currentDevice] setBatteryMonitoringEnabled:YES];
        float batteryLevel = [[UIDevice currentDevice] batteryLevel];
        resolve(@(batteryLevel * 100));
    } @catch (NSException *exception) {
        reject(@"ERROR", exception.reason, nil);
    }
}

- (NSString *)deviceModel {
    struct utsname systemInfo;
    uname(&systemInfo);
    return [NSString stringWithCString:systemInfo.machine encoding:NSUTF8StringEncoding];
}

@end