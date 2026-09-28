import React, { useEffect, useState } from 'react';
import {
  NativeModules,
  Pressable,
  Text,
  View,
  type TextStyle,
} from 'react-native';

declare const __DEV__: boolean;

const LINKING_ERROR =
  "The native GoMarketMe module is not linked. Make sure you rebuilt your app after installing gomarketme-react-native.";

type NativeGoMarketMeModule = {
  initialize(apiKey: string, sdkType: string, sdkVersion: string, isProduction: boolean): Promise<InitializeResponse>;
  getReferralCodeSettings(): Promise<Record<string, unknown>>;
  showReferralCodeSheet(showTrigger: boolean): Promise<Record<string, unknown> | null>;
  redeemReferralCode(code: string): Promise<Record<string, unknown>>;
  syncAllTransactions?(): Promise<SyncAllTransactionsResponse>;
  stop?(): void;
};

export type GoMarketMeMetadata = Record<string, unknown>;

export enum GoMarketMeReferralCodeErrorCode {
  InvalidCode = 'invalid_code',
  ExpiredCode = 'expired_code',
  InactiveCode = 'inactive_code',
  InvalidResponse = 'invalid_response',
  RequestFailed = 'request_failed',
  NetworkError = 'network_error',
  Timeout = 'timeout',
  NotInitialized = 'not_initialized',
  Unknown = 'unknown',
}

export class GoMarketMeReferralCodeError extends Error {
  readonly code: GoMarketMeReferralCodeErrorCode;
  readonly rawCode: string;
  readonly statusCode?: number;
  readonly isRetryable: boolean;

  constructor(
    code: GoMarketMeReferralCodeErrorCode,
    rawCode: string,
    message: string,
    statusCode?: number,
    isRetryable = false
  ) {
    super(message);
    this.name = 'GoMarketMeReferralCodeError';
    this.code = code;
    this.rawCode = rawCode;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

export type InitializeResponse = {
  initialized: boolean;
  platform: 'ios' | 'android';
  source: 'app_store' | 'google_play' | string;
  affiliateMarketingData?: Record<string, unknown> | null;
};

export type SyncAllTransactionsResponse = {
  fetchedCount: number;
  sentCount: number;
  failedCount: number;
  success: boolean;
};

export class GoMarketMeAffiliateMarketingData {
  campaign: Campaign;
  affiliate: Affiliate;
  affiliateCampaign: AffiliateCampaign;
  saleDistribution: SaleDistribution;
  affiliateCampaignCode: string;
  deviceId: string;
  offerCode?: string;
  referralCode?: string;

  constructor(
    campaign: Campaign,
    affiliate: Affiliate,
    saleDistribution: SaleDistribution,
    affiliateCampaignCode: string,
    deviceId: string,
    offerCode?: string,
    referralCode?: string,
    affiliateCampaign: AffiliateCampaign = new AffiliateCampaign()
  ) {
    this.campaign = campaign;
    this.affiliate = affiliate;
    this.saleDistribution = saleDistribution;
    this.affiliateCampaignCode = affiliateCampaignCode;
    this.deviceId = deviceId;
    this.offerCode = offerCode;
    this.referralCode = referralCode;
    this.affiliateCampaign = affiliateCampaign;
  }

  static fromJson(json?: Record<string, unknown> | null): GoMarketMeAffiliateMarketingData | null {
    if (!json || Object.keys(json).length === 0) {
      return null;
    }

    return new GoMarketMeAffiliateMarketingData(
      Campaign.fromJson(asRecord(json.campaign)),
      Affiliate.fromJson(asRecord(json.affiliate)),
      SaleDistribution.fromJson(asRecord(json.sale_distribution)),
      asString(json.affiliate_campaign_code),
      asString(json.device_id),
      json.offer_code == null ? undefined : String(json.offer_code),
      json.referral_code == null ? undefined : String(json.referral_code),
      AffiliateCampaign.fromJson(asRecord(json.affiliate_campaign))
    );
  }

  toJson(): Record<string, unknown> {
    return {
      campaign: this.campaign.toJson(),
      affiliate: this.affiliate.toJson(),
      affiliate_campaign: this.affiliateCampaign.toJson(),
      sale_distribution: this.saleDistribution.toJson(),
      affiliate_campaign_code: this.affiliateCampaignCode,
      device_id: this.deviceId,
      offer_code: this.offerCode,
      referral_code: this.referralCode,
    };
  }
}

export class Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  publicLinkUrl?: string;
  metadata: GoMarketMeMetadata;

  constructor(id: string, name: string, status: string, type: string, publicLinkUrl?: string, metadata: GoMarketMeMetadata = {}) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.type = type;
    this.publicLinkUrl = publicLinkUrl;
    this.metadata = metadata;
  }

  static fromJson(json: Record<string, unknown>): Campaign {
    return new Campaign(
      asString(json.id),
      asString(json.name),
      asString(json.status),
      asString(json.type),
      json.public_link_url == null ? undefined : String(json.public_link_url),
      asRecord(json.metadata)
    );
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      type: this.type,
      public_link_url: this.publicLinkUrl,
      metadata: this.metadata,
    };
  }
}

export class Affiliate {
  id: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  instagramAccount: string;
  tiktokAccount: string;
  xAccount: string;
  metadata: GoMarketMeMetadata;

  constructor(
    id: string,
    firstName: string,
    lastName: string,
    countryCode: string,
    instagramAccount: string,
    tiktokAccount: string,
    xAccount: string,
    metadata: GoMarketMeMetadata = {}
  ) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.countryCode = countryCode;
    this.instagramAccount = instagramAccount;
    this.tiktokAccount = tiktokAccount;
    this.xAccount = xAccount;
    this.metadata = metadata;
  }

  static fromJson(json: Record<string, unknown>): Affiliate {
    return new Affiliate(
      asString(json.id),
      asString(json.first_name),
      asString(json.last_name),
      asString(json.country_code),
      asString(json.instagram_account),
      asString(json.tiktok_account),
      asString(json.x_account),
      asRecord(json.metadata)
    );
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      first_name: this.firstName,
      last_name: this.lastName,
      country_code: this.countryCode,
      instagram_account: this.instagramAccount,
      tiktok_account: this.tiktokAccount,
      x_account: this.xAccount,
      metadata: this.metadata,
    };
  }
}

export class AffiliateCampaign {
  metadata: GoMarketMeMetadata;

  constructor(metadata: GoMarketMeMetadata = {}) {
    this.metadata = metadata;
  }

  static fromJson(json: Record<string, unknown>): AffiliateCampaign {
    return new AffiliateCampaign(asRecord(json.metadata));
  }

  toJson(): Record<string, unknown> {
    return { metadata: this.metadata };
  }
}

export class SaleDistribution {
  platformPercentage: string;
  affiliatePercentage: string;

  constructor(platformPercentage: string, affiliatePercentage: string) {
    this.platformPercentage = platformPercentage;
    this.affiliatePercentage = affiliatePercentage;
  }

  static fromJson(json: Record<string, unknown>): SaleDistribution {
    return new SaleDistribution(asString(json.platform_percentage), asString(json.affiliate_percentage));
  }

  toJson(): Record<string, unknown> {
    return {
      platform_percentage: this.platformPercentage,
      affiliate_percentage: this.affiliatePercentage,
    };
  }
}

class GoMarketMe {
  private static instance: GoMarketMe;
  private readonly sdkType = 'ReactNative';
  private readonly sdkVersion = '6.0.1';
  private isInitializing = false;
  private isInitialized = false;
  private initializationPromise?: Promise<void>;
  public affiliateMarketingData?: GoMarketMeAffiliateMarketingData | null;

  private constructor() {}

  public static getInstance(): GoMarketMe {
    if (!GoMarketMe.instance) {
      GoMarketMe.instance = new GoMarketMe();
    }

    return GoMarketMe.instance;
  }

  public get initialized(): boolean {
    return this.isInitialized;
  }

  public async initialize(apiKey: string): Promise<void> {
    const trimmedApiKey = apiKey.trim();

    if (!trimmedApiKey) {
      log('Initialization skipped because apiKey is empty.');
      return;
    }

    if (this.isInitialized) {
      log('Initialization skipped because SDK is already initialized or initializing.');
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = (async () => {
      try {
        const response = await nativeModule().initialize(
          trimmedApiKey,
          this.sdkType,
          this.sdkVersion,
          !__DEV__
        );

        this.affiliateMarketingData = GoMarketMeAffiliateMarketingData.fromJson(
          response.affiliateMarketingData ?? null
        );
        this.isInitialized = true;
      } catch (error) {
        log(`Error initializing GoMarketMe: ${String(error)}`);
      } finally {
        this.isInitializing = false;
      }
    })();
    return this.initializationPromise;
  }

  public async referralCodeSettings(): Promise<Record<string, unknown>> {
    // React runs child effects before parent effects. Give a parent that calls
    // initialize() on mount one turn to register its initialization promise.
    if (!this.initializationPromise && !this.isInitialized) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    if (this.initializationPromise) await this.initializationPromise;
    if (!this.isInitialized) throw new Error('Initialize GoMarketMe before loading referral settings.');
    return nativeModule().getReferralCodeSettings();
  }

  public async syncAllTransactions(): Promise<SyncAllTransactionsResponse> {
    if (!this.isInitialized) {
      throw new Error('GoMarketMe SDK must be initialized before syncing transactions.');
    }

    const syncAllTransactions = nativeModule().syncAllTransactions;

    if (typeof syncAllTransactions !== 'function') {
      throw new Error('GoMarketMe transaction sync is not available in the linked native module.');
    }

    return syncAllTransactions();
  }

  /** Resolves on apply or cancellation; attribution is updated before resolution. */
  public async showReferralCodeSheet(showTrigger = false): Promise<GoMarketMeAffiliateMarketingData | null> {
    if (!this.isInitialized) throw new Error('Initialize GoMarketMe before showing the referral sheet.');
    const response = await nativeModule().showReferralCodeSheet(showTrigger);
    if (response == null) return null;
    const data = GoMarketMeAffiliateMarketingData.fromJson(response);
    this.affiliateMarketingData = data;
    return data;
  }

  /** Redeems a referral code from an app-owned UI and returns the resulting attribution data. */
  public async redeemReferralCode(code: string): Promise<GoMarketMeAffiliateMarketingData> {
    if (!this.isInitialized) {
      throw new GoMarketMeReferralCodeError(
        GoMarketMeReferralCodeErrorCode.NotInitialized,
        GoMarketMeReferralCodeErrorCode.NotInitialized,
        'Initialize GoMarketMe before redeeming a referral code.'
      );
    }
    let response: Record<string, unknown>;
    try {
      response = await nativeModule().redeemReferralCode(code);
    } catch (error) {
      throw normalizeReferralCodeError(error);
    }
    const data = GoMarketMeAffiliateMarketingData.fromJson(response);
    if (!data) {
      throw new GoMarketMeReferralCodeError(
        GoMarketMeReferralCodeErrorCode.InvalidResponse,
        GoMarketMeReferralCodeErrorCode.InvalidResponse,
        'GoMarketMe returned an invalid referral-code response.'
      );
    }
    this.affiliateMarketingData = data;
    return data;
  }

  public stop(): void {
    nativeModule().stop?.();
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = undefined;
  }
}

function normalizeReferralCodeError(error: unknown): GoMarketMeReferralCodeError {
  const nativeError = asRecord(error);
  const userInfo = asRecord(nativeError.userInfo);
  const rawCode = asString(userInfo.code || nativeError.code || 'request_failed');
  const statusValue = userInfo.statusCode;
  const statusCode = typeof statusValue === 'number' && statusValue > 0
    ? statusValue
    : undefined;
  const knownCode = Object.values(GoMarketMeReferralCodeErrorCode).includes(
    rawCode as GoMarketMeReferralCodeErrorCode
  )
    ? rawCode as GoMarketMeReferralCodeErrorCode
    : GoMarketMeReferralCodeErrorCode.Unknown;
  const isRetryable = typeof userInfo.isRetryable === 'boolean'
    ? userInfo.isRetryable
    : rawCode === 'network_error' || rawCode === 'timeout' ||
      statusCode === 408 || statusCode === 425 || statusCode === 429 ||
      (statusCode != null && statusCode >= 500);
  return new GoMarketMeReferralCodeError(
    knownCode,
    rawCode,
    asString(nativeError.message) || 'Referral code redemption failed.',
    statusCode,
    isRetryable
  );
}

export type GoMarketMeReferralCodeTriggerProps = {
  onResult?: (data: GoMarketMeAffiliateMarketingData | null) => void;
  onError?: (error: unknown) => void;
};

type TriggerSettings = {
  triggerType: 'link' | 'button';
  triggerText: string;
  triggerAlignment: 'left' | 'center' | 'right';
  triggerFontSize: number;
  triggerFontWeight: TextStyle['fontWeight'];
  triggerLinkColor: string;
  triggerLinkUnderline: boolean;
  triggerButtonBackground: string;
  triggerButtonTextColor: string;
  triggerButtonBorder: string;
  triggerButtonBorderWidth: number;
  triggerButtonBorderRadius: number;
  triggerButtonPaddingHorizontal: number;
  triggerButtonPaddingVertical: number;
  family?: string;
};

const defaultTriggerSettings: TriggerSettings = {
  triggerType: 'link',
  triggerText: 'Have a referral code?',
  triggerAlignment: 'center',
  triggerFontSize: 15,
  triggerFontWeight: '500',
  triggerLinkColor: '#1F2937',
  triggerLinkUnderline: false,
  triggerButtonBackground: '#3B82F6',
  triggerButtonTextColor: '#FFFFFF',
  triggerButtonBorder: '#3B82F6',
  triggerButtonBorderWidth: 1,
  triggerButtonBorderRadius: 10,
  triggerButtonPaddingHorizontal: 16,
  triggerButtonPaddingVertical: 10,
};

/** Remotely configured referral-code trigger. Renders after settings load. */
export function GoMarketMeReferralCodeTrigger({
  onResult,
  onError,
}: GoMarketMeReferralCodeTriggerProps): React.ReactElement | null {
  const sdk = GoMarketMe.getInstance();
  const [settings, setSettings] = useState<TriggerSettings | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let active = true;
    sdk.referralCodeSettings()
      .then(response => {
        if (active) setSettings(normalizeTriggerSettings(response));
      })
      .catch(error => {
        if (active) setSettings(defaultTriggerSettings);
        onError?.(error);
      });
    return () => { active = false; };
  }, [sdk]);

  if (!settings) return null;
  const isLink = settings.triggerType === 'link';
  const alignItems = settings.triggerAlignment === 'left'
    ? 'flex-start'
    : settings.triggerAlignment === 'right'
      ? 'flex-end'
      : 'center';

  const open = async () => {
    if (opening) return;
    setOpening(true);
    try {
      onResult?.(await sdk.showReferralCodeSheet());
    } catch (error) {
      onError?.(error);
    } finally {
      setOpening(false);
    }
  };

  return React.createElement(
    View,
    { style: { alignSelf: 'stretch', alignItems } },
    React.createElement(
      Pressable,
      {
        accessibilityRole: 'button',
        accessibilityLabel: settings.triggerText,
        disabled: opening,
        onPress: open,
        style: {
          minHeight: 44,
          justifyContent: 'center',
          opacity: opening ? 0.6 : 1,
          backgroundColor: isLink ? 'transparent' : settings.triggerButtonBackground,
          borderColor: isLink ? 'transparent' : settings.triggerButtonBorder,
          borderWidth: isLink ? 0 : settings.triggerButtonBorderWidth,
          borderRadius: settings.triggerButtonBorderRadius,
          paddingHorizontal: isLink ? 0 : settings.triggerButtonPaddingHorizontal,
          paddingVertical: isLink ? 0 : settings.triggerButtonPaddingVertical,
        },
      },
      React.createElement(Text, {
        style: {
          color: isLink ? settings.triggerLinkColor : settings.triggerButtonTextColor,
          fontFamily: settings.family,
          fontSize: settings.triggerFontSize,
          fontWeight: settings.triggerFontWeight,
          textDecorationLine: isLink && settings.triggerLinkUnderline ? 'underline' : 'none',
        },
      }, settings.triggerText)
    )
  );
}

function normalizeTriggerSettings(response: Record<string, unknown>): TriggerSettings {
  const marketer = asRecord(response.marketer_settings);
  const defaults = asRecord(response.default_settings);
  const supplied = Object.keys(marketer).length > 0 ? marketer : Object.keys(defaults).length > 0 ? defaults : response;
  const text = (key: string, fallback: string) => typeof supplied[key] === 'string' ? String(supplied[key]) : fallback;
  const number = (key: string, fallback: number, minimum = 0) => {
    const value = typeof supplied[key] === 'number' && Number.isFinite(supplied[key]) ? Number(supplied[key]) : fallback;
    return Math.max(minimum, Math.min(200, value));
  };
  const color = (key: string, fallback: string) => {
    const value = text(key, fallback);
    return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value) ? value : fallback;
  };
  const fontWeight = text('triggerFontWeight', '500');
  const validFontWeights = new Set([
    'normal', 'bold',
    '100', '200', '300', '400', '500', '600', '700', '800', '900',
  ]);
  const triggerType = text('triggerType', 'link');
  const triggerAlignment = text('triggerAlignment', 'center');
  return {
    triggerType: triggerType === 'button' ? 'button' : 'link',
    triggerText: text('triggerText', defaultTriggerSettings.triggerText),
    triggerAlignment: triggerAlignment === 'left' || triggerAlignment === 'right' ? triggerAlignment : 'center',
    triggerFontSize: number('triggerFontSize', 15, 10),
    triggerFontWeight: (validFontWeights.has(fontWeight) ? fontWeight : '500') as TextStyle['fontWeight'],
    triggerLinkColor: color('triggerLinkColor', '#1F2937'),
    triggerLinkUnderline: typeof supplied.triggerLinkUnderline === 'boolean' ? supplied.triggerLinkUnderline : false,
    triggerButtonBackground: color('triggerButtonBackground', '#3B82F6'),
    triggerButtonTextColor: color('triggerButtonTextColor', '#FFFFFF'),
    triggerButtonBorder: color('triggerButtonBorder', '#3B82F6'),
    triggerButtonBorderWidth: number('triggerButtonBorderWidth', 1),
    triggerButtonBorderRadius: number('triggerButtonBorderRadius', 10),
    triggerButtonPaddingHorizontal: number('triggerButtonPaddingHorizontal', 16),
    triggerButtonPaddingVertical: number('triggerButtonPaddingVertical', 10),
    family: typeof supplied.family === 'string' && supplied.family ? supplied.family : undefined,
  };
}

function nativeModule(): NativeGoMarketMeModule {
  const module = NativeModules.GoMarketMeReactNative as NativeGoMarketMeModule | undefined;

  if (!module) {
    throw new Error(LINKING_ERROR);
  }

  return module;
}

function log(message: string): void {
  if (__DEV__) {
    console.log(`[GoMarketMe] ${message}`);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return value == null ? '' : String(value);
}

export default GoMarketMe.getInstance();
