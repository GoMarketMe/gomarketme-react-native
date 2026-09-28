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

    @objc(showReferralCodeSheet:resolver:rejecter:)
    func showReferralCodeSheet(showTrigger: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 15.0, *), let appleCore = core as? GoMarketMeAppleCore else {
            reject("not_initialized", "Initialize GoMarketMe first.", nil)
            return
        }
        Task { @MainActor in
            do { try await appleCore.showReferralCodeSheet(showTrigger: showTrigger) { resolve($0) } }
            catch { reject("referral_failed", error.localizedDescription, error) }
        }
    }

    @objc(getReferralCodeSettings:rejecter:)
    func getReferralCodeSettings(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 15.0, *), let appleCore = core as? GoMarketMeAppleCore else {
            reject("not_initialized", "Initialize GoMarketMe first.", nil)
            return
        }
        Task {
            do { resolve(try await appleCore.referralCodeSettings()) }
            catch { reject("referral_settings_failed", error.localizedDescription, error) }
        }
    }

    @objc(redeemReferralCode:resolver:rejecter:)
    func redeemReferralCode(
        code: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 15.0, *), let appleCore = core as? GoMarketMeAppleCore else {
            reject("not_initialized", "Initialize GoMarketMe first.", nil)
            return
        }
        Task {
            do { resolve(try await appleCore.redeemReferralCode(code)) }
            catch {
                let details = Self.referralErrorDetails(error)
                reject("referral_code_error", error.localizedDescription, details)
            }
        }
    }

    private static func referralErrorDetails(_ error: Error) -> NSError {
        let rawCode: String
        let statusCode: Int?
        if let referralError = error as? GoMarketMeReferralError {
            rawCode = referralError.code
            statusCode = referralError.statusCode > 0 ? referralError.statusCode : nil
        } else if let urlError = error as? URLError {
            rawCode = urlError.code == .timedOut ? "timeout" : "network_error"
            statusCode = nil
        } else {
            rawCode = "request_failed"
            statusCode = nil
        }
        let isRetryable = rawCode == "network_error" || rawCode == "timeout" ||
            statusCode == 408 || statusCode == 425 || statusCode == 429 ||
            (statusCode.map { $0 >= 500 } ?? false)
        var userInfo: [String: Any] = [
            NSLocalizedDescriptionKey: error.localizedDescription,
            "code": rawCode,
            "isRetryable": isRetryable
        ]
        if let statusCode { userInfo["statusCode"] = statusCode }
        return NSError(domain: "GoMarketMeReferralCode", code: statusCode ?? 0, userInfo: userInfo)
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
