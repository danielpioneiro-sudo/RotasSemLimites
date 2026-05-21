#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LocalSearchModule, NSObject)

RCT_EXTERN_METHOD(
  search:(NSString *)query
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
