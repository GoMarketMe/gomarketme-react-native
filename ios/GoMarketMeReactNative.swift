import Foundation
import React
import GoMarketMeAppleCoreKit

@objc(GoMarketMeReactNative)
class GoMarketMeReactNative: NSObject {
    private var core: Any?
    private let isDebugLoggingEnabled = false

    @objc
    static func requiresMainQueueSetup() -> Bool {
        false
    }

    @objc(initialize:sdkType:sdkVersion:isProduction:resolver:rejecter:)
    func initialize(
        apiKey: String,
        sdkType: String,
        sdkVersion: String,
        isProduction: Bool,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if isDebugLoggingEnabled {
            NSLog("[GoMarketMe React Native iOS] initialize called")
        }

        guard #available(iOS 15.0, *) else {
            reject("unsupported_ios", "GoMarketMe core requires iOS 15.0+", nil)
            return
        }

        let trimmedApiKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedApiKey.isEmpty else {
            reject("invalid_arguments", "apiKey is required", nil)
            return
        }

        let initialConfiguration = GoMarketMeAppleCoreConfiguration(
            apiKey: trimmedApiKey,
            sdkType: sdkType.isEmpty ? "ReactNative" : sdkType,
            sdkVersion: sdkVersion.isEmpty ? nil : sdkVersion,
            isProduction: isProduction
        )

        let appleCore = (core as? GoMarketMeAppleCore) ?? GoMarketMeAppleCore()

        if isDebugLoggingEnabled {
            appleCore.onPurchase = { event in
                NSLog(
                    "[GoMarketMe React Native iOS] purchase observed by core: %@",
                    String(describing: event.toDictionary())
                )
            }

            appleCore.onError = { error in
                NSLog("[GoMarketMe React Native iOS] core error: %@", error.localizedDescription)
            }
        } else {
            appleCore.onPurchase = nil
            appleCore.onError = nil
        }

        Task {
            let prepared = await appleCore.prepareAttribution(configuration: initialConfiguration)

            appleCore.configure(prepared.configuration)

            if isDebugLoggingEnabled {
                NSLog("[GoMarketMe React Native iOS] starting Apple core")
            }

            appleCore.start()
            self.core = appleCore

            let response: [String: Any] = [
                "initialized": true,
                "platform": "ios",
                "source": prepared.configuration.sourceName,
                "affiliateMarketingData": prepared.affiliateMarketingData ?? [:]
            ]

            DispatchQueue.main.async {
                resolve(response)
            }
        }
    }

    @objc(syncAllTransactions:rejecter:)
    func syncAllTransactions(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 15.0, *) else {
            reject("unsupported_ios", "GoMarketMe transaction sync requires iOS 15.0+", nil)
            return
        }

        guard let appleCore = core as? GoMarketMeAppleCore else {
            reject("not_initialized", "GoMarketMe SDK must be initialized before syncing transactions", nil)
            return
        }

        if isDebugLoggingEnabled {
            NSLog("[GoMarketMe React Native iOS] syncAllTransactions called")
        }

        Task {
            let result = await appleCore.syncAllTransactions()

            let response: [String: Any] = [
                "fetchedCount": result.fetchedCount,
                "sentCount": result.sentCount,
                "failedCount": result.failedCount,
                "success": result.success
            ]

            DispatchQueue.main.async {
                resolve(response)
            }
        }
    }

    @objc
    func stop() {
        if #available(iOS 15.0, *), let appleCore = core as? GoMarketMeAppleCore {
            appleCore.stop()
        }

        core = nil
    }
}