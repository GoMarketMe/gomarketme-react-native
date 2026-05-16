import { NativeModules } from 'react-native';

declare const __DEV__: boolean;

const LINKING_ERROR =
  "The native GoMarketMe module is not linked. Make sure you rebuilt your app after installing gomarketme-react-native.";

type NativeGoMarketMeModule = {
  initialize(apiKey: string, sdkType: string, sdkVersion: string, isProduction: boolean): Promise<InitializeResponse>;
  syncAllTransactions?(): Promise<SyncAllTransactionsResponse>;
  stop?(): void;
};

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
  saleDistribution: SaleDistribution;
  affiliateCampaignCode: string;
  deviceId: string;
  offerCode?: string;

  constructor(
    campaign: Campaign,
    affiliate: Affiliate,
    saleDistribution: SaleDistribution,
    affiliateCampaignCode: string,
    deviceId: string,
    offerCode?: string
  ) {
    this.campaign = campaign;
    this.affiliate = affiliate;
    this.saleDistribution = saleDistribution;
    this.affiliateCampaignCode = affiliateCampaignCode;
    this.deviceId = deviceId;
    this.offerCode = offerCode;
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
      json.offer_code == null ? undefined : String(json.offer_code)
    );
  }

  toJson(): Record<string, unknown> {
    return {
      campaign: this.campaign.toJson(),
      affiliate: this.affiliate.toJson(),
      sale_distribution: this.saleDistribution.toJson(),
      affiliate_campaign_code: this.affiliateCampaignCode,
      device_id: this.deviceId,
      offer_code: this.offerCode,
    };
  }
}

export class Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  publicLinkUrl?: string;

  constructor(id: string, name: string, status: string, type: string, publicLinkUrl?: string) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.type = type;
    this.publicLinkUrl = publicLinkUrl;
  }

  static fromJson(json: Record<string, unknown>): Campaign {
    return new Campaign(
      asString(json.id),
      asString(json.name),
      asString(json.status),
      asString(json.type),
      json.public_link_url == null ? undefined : String(json.public_link_url)
    );
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      type: this.type,
      public_link_url: this.publicLinkUrl,
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

  constructor(
    id: string,
    firstName: string,
    lastName: string,
    countryCode: string,
    instagramAccount: string,
    tiktokAccount: string,
    xAccount: string
  ) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.countryCode = countryCode;
    this.instagramAccount = instagramAccount;
    this.tiktokAccount = tiktokAccount;
    this.xAccount = xAccount;
  }

  static fromJson(json: Record<string, unknown>): Affiliate {
    return new Affiliate(
      asString(json.id),
      asString(json.first_name),
      asString(json.last_name),
      asString(json.country_code),
      asString(json.instagram_account),
      asString(json.tiktok_account),
      asString(json.x_account)
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
    };
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
  private readonly sdkVersion = '5.0.5';
  private isInitializing = false;
  private isInitialized = false;
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

    if (this.isInitialized || this.isInitializing) {
      log('Initialization skipped because SDK is already initialized or initializing.');
      return;
    }

    this.isInitializing = true;

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

  public stop(): void {
    nativeModule().stop?.();
    this.isInitialized = false;
    this.isInitializing = false;
  }
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
