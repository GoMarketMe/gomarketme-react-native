#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(GoMarketMeReactNative, NSObject)

RCT_EXTERN_METHOD(initialize:(NSString *)apiKey
                  sdkType:(NSString *)sdkType
                  sdkVersion:(NSString *)sdkVersion
                  isProduction:(BOOL)isProduction
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(syncAllTransactions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop)

@end
