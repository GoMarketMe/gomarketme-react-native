package co.gomarketme.reactnative

import android.util.Log
import co.gomarketme.core.GoMarketMeGoogleCore
import co.gomarketme.core.GoMarketMeGoogleCoreConfiguration
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class GoMarketMeReactNativeModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
    private var core: GoMarketMeGoogleCore? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun initialize(
        apiKey: String,
        sdkType: String,
        sdkVersion: String,
        isProduction: Boolean,
        promise: Promise
    ) {
        val trimmedApiKey = apiKey.trim()

        if (trimmedApiKey.isEmpty()) {
            promise.reject("invalid_arguments", "apiKey is required")
            return
        }

        val initialConfiguration = GoMarketMeGoogleCoreConfiguration(
            apiKey = trimmedApiKey,
            sdkType = sdkType.ifBlank { "ReactNative" },
            sdkVersion = sdkVersion.takeIf { it.isNotBlank() },
            isProduction = isProduction
        )

        val googleCore = core ?: GoMarketMeGoogleCore(reactContext.applicationContext)

        if (IS_DEBUG_LOGGING_ENABLED) {
            googleCore.onPurchase = { event ->
                Log.d(TAG, "purchase observed by core: ${event.toMap()}")
            }

            googleCore.onError = { throwable ->
                Log.e(TAG, "core error", throwable)
            }
        } else {
            googleCore.onPurchase = null
            googleCore.onError = null
        }

        scope.launch {
            try {
                val prepared = googleCore.prepareAttribution(initialConfiguration)
                val config = prepared.first
                val affiliateMarketingData = prepared.second

                googleCore.configure(config)
                googleCore.start()
                core = googleCore

                val response = Arguments.createMap().apply {
                    putBoolean("initialized", true)
                    putString("platform", "android")
                    putString("source", config.sourceName)
                    putMap("affiliateMarketingData", affiliateMarketingData.toWritableMap())
                }

                promise.resolve(response)
            } catch (throwable: Throwable) {
                promise.reject("initialize_failed", throwable.message, throwable)
            }
        }
    }

    @ReactMethod
    fun syncAllTransactions(promise: Promise) {
        val googleCore = core

        if (googleCore == null) {
            promise.reject("not_initialized", "GoMarketMe SDK must be initialized before syncing transactions")
            return
        }

        scope.launch {
            try {
                val result = googleCore.sendCurrentPurchasesWithResult()

                val response = Arguments.createMap().apply {
                    putInt("fetchedCount", result.fetchedCount)
                    putInt("sentCount", result.sentCount)
                    putInt("failedCount", result.failedCount)
                    putBoolean("success", result.success)
                }

                promise.resolve(response)
            } catch (throwable: Throwable) {
                promise.reject("sync_all_transactions_failed", throwable.message, throwable)
            }
        }
    }

    @ReactMethod
    fun stop() {
        core?.stop()
        core = null
    }

    override fun invalidate() {
        stop()
        super.invalidate()
    }

    private fun Map<String, Any?>.toWritableMap(): WritableMap {
        val writableMap = Arguments.createMap()

        forEach { (key, value) ->
            writableMap.putAny(key, value)
        }

        return writableMap
    }

    private fun WritableMap.putAny(key: String, value: Any?) {
        when (value) {
            null -> putNull(key)
            is Boolean -> putBoolean(key, value)
            is Int -> putInt(key, value)
            is Long -> putDouble(key, value.toDouble())
            is Float -> putDouble(key, value.toDouble())
            is Double -> putDouble(key, value)
            is Number -> putDouble(key, value.toDouble())
            is String -> putString(key, value)
            is Map<*, *> -> putMap(key, value.toStringKeyMap().toWritableMap())
            is Iterable<*> -> putArray(key, value.toWritableArray())
            is Array<*> -> putArray(key, value.asIterable().toWritableArray())
            else -> putString(key, value.toString())
        }
    }

    private fun Iterable<*>.toWritableArray(): WritableArray {
        val writableArray = Arguments.createArray()

        forEach { value ->
            when (value) {
                null -> writableArray.pushNull()
                is Boolean -> writableArray.pushBoolean(value)
                is Int -> writableArray.pushInt(value)
                is Long -> writableArray.pushDouble(value.toDouble())
                is Float -> writableArray.pushDouble(value.toDouble())
                is Double -> writableArray.pushDouble(value)
                is Number -> writableArray.pushDouble(value.toDouble())
                is String -> writableArray.pushString(value)
                is Map<*, *> -> writableArray.pushMap(value.toStringKeyMap().toWritableMap())
                is Iterable<*> -> writableArray.pushArray(value.toWritableArray())
                is Array<*> -> writableArray.pushArray(value.asIterable().toWritableArray())
                else -> writableArray.pushString(value.toString())
            }
        }

        return writableArray
    }

    private fun Map<*, *>.toStringKeyMap(): Map<String, Any?> = entries.associate { (key, value) ->
        key.toString() to value
    }

    private companion object {
        const val MODULE_NAME = "GoMarketMeReactNative"
        const val TAG = "GoMarketMeReactNative"
        const val IS_DEBUG_LOGGING_ENABLED = false
    }
}