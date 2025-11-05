import { Platform, Dimensions, PixelRatio } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import getUserLocale from 'get-user-locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import {
  type Purchase,
  type PurchaseError,
  purchaseUpdatedListener,
  purchaseErrorListener,
  fetchProducts,
  ProductCommon,
  PurchaseCommon,
  getAvailablePurchases,
} from 'react-native-iap';

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

  static fromJson(json: Record<string, any>): GoMarketMeAffiliateMarketingData | null {
    if (!json || Object.keys(json).length === 0) return null;
    return new GoMarketMeAffiliateMarketingData(
      Campaign.fromJson(json.campaign),
      Affiliate.fromJson(json.affiliate),
      SaleDistribution.fromJson(json.sale_distribution),
      json.affiliate_campaign_code || '',
      json.device_id || '',
      json.offer_code
    );
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

  static fromJson(json: Record<string, any>): Campaign {
    return new Campaign(
      json?.id || '',
      json?.name || '',
      json?.status || '',
      json?.type || '',
      json?.public_link_url
    );
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

  static fromJson(json: Record<string, any>): Affiliate {
    return new Affiliate(
      json?.id || '',
      json?.first_name || '',
      json?.last_name || '',
      json?.country_code || '',
      json?.instagram_account || '',
      json?.tiktok_account || '',
      json?.x_account || ''
    );
  }
}

export class SaleDistribution {
  platformPercentage: string;
  affiliatePercentage: string;

  constructor(platformPercentage: string, affiliatePercentage: string) {
    this.platformPercentage = platformPercentage;
    this.affiliatePercentage = affiliatePercentage;
  }

  static fromJson(json: Record<string, any>): SaleDistribution {
    return new SaleDistribution(json?.platform_percentage || '', json?.affiliate_percentage || '');
  }
}

class GoMarketMe {
  private static instance: GoMarketMe;
  private sdkType = 'ReactNative';
  private sdkVersion = '4.0.0';
  private sdkInitializedKey = 'GOMARKETME_SDK_INITIALIZED';
  private sdkInitializationUrl =
    'https://4v9008q1a5.execute-api.us-west-2.amazonaws.com/prod/v1/sdk-initialization';
  private systemInfoUrl =
    'https://4v9008q1a5.execute-api.us-west-2.amazonaws.com/prod/v1/mobile/system-info';
  private eventUrl = 'https://4v9008q1a5.execute-api.us-west-2.amazonaws.com/prod/v1/event';
  private _affiliateCampaignCode = '';
  private _deviceId = '';
  private _packageName = '';
  private _purchaseUpdateUnsub?: ReturnType<typeof purchaseUpdatedListener>;
  private _purchaseErrorUnsub?: ReturnType<typeof purchaseErrorListener>;
  public affiliateMarketingData?: GoMarketMeAffiliateMarketingData | null;

  private constructor() { }

  public static getInstance(): GoMarketMe {
    if (!GoMarketMe.instance) GoMarketMe.instance = new GoMarketMe();
    return GoMarketMe.instance;
  }

  public async initialize(apiKey: string): Promise<void> {
    try {
      const isSDKInitialized = await this._isSDKInitialized();
      if (!isSDKInitialized) await this._postSDKInitialization(apiKey);
      this._packageName = DeviceInfo.getBundleId();
      const systemInfo = await this._getSystemInfo();
      this.affiliateMarketingData = await this._postSystemInfo(systemInfo, apiKey);
      await this._addListeners(apiKey);
      this._fetchExistingPurchases(apiKey).catch(e => {
        console.log('Error in background purchase fetch:', e);
      });
    } catch (e) {
      console.log('Error initializing GoMarketMe:', e);
    }
  }

  public removeListeners(): void {
    try {
      this._purchaseUpdateUnsub?.remove?.();
      this._purchaseErrorUnsub?.remove?.();
    } catch (e) {
      console.log('Error removing listeners:', e);
    }
  }

  private async _addListeners(apiKey: string): Promise<void> {
    if (!this._purchaseUpdateUnsub) {
      this._purchaseUpdateUnsub = purchaseUpdatedListener(async (purchase: Purchase) => {
        try {
          await this._fetchConsolidatedPurchases([purchase], apiKey);
        } catch (e) {
          console.log('purchaseUpdated error:', e);
        }
      });
    }

    if (!this._purchaseErrorUnsub) {
      this._purchaseErrorUnsub = purchaseErrorListener((error: PurchaseError) => {
        console.log('purchaseErrorListener:', error);
      });
    }
  }

  private async _getSystemInfo(): Promise<any> {
    const deviceData =
      Platform.OS === 'ios'
        ? await this._readIosDeviceInfo()
        : await this._readAndroidDeviceInfo();

    this._deviceId = deviceData['deviceId'] || '';

    const devicePixelRatio = PixelRatio.get();
    const dimension = Dimensions.get('window');

    return {
      device_info: deviceData,
      window_info: {
        devicePixelRatio,
        width: dimension.width * devicePixelRatio,
        height: dimension.height * devicePixelRatio,
      },
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language_code: getUserLocale(),
      sdk_type: this.sdkType,
      sdk_version: this.sdkVersion,
      package_name: this._packageName,
      is_production: await this._isProduction()
    };
  }

  private async _postSDKInitialization(apiKey: string): Promise<void> {
    try {
      const res = await axios.post(this.sdkInitializationUrl, {}, {
        headers: { 'x-api-key': apiKey },
      });
      if (res.status === 200) await this._markSDKAsInitialized();
    } catch (e) {
      console.log('Error posting SDK initialization:', e);
    }
  }

  private async _postSystemInfo(data: any, apiKey: string) {
    try {
      const res = await axios.post(this.systemInfoUrl, data, {
        headers: { 'x-api-key': apiKey },
      });
      if (res.status === 200) {
        const obj = GoMarketMeAffiliateMarketingData.fromJson(res.data);
        if (obj) this._affiliateCampaignCode = obj.affiliateCampaignCode;
        return obj;
      }
    } catch (e) {
      console.log('Error posting system info:', e);
    }
    return null;
  }

  private async _readAndroidDeviceInfo() {
    return {
      deviceId: await DeviceInfo.getAndroidId(),
      brand: await DeviceInfo.getBrand(),
      model: await DeviceInfo.getModel(),
      manufacturer: await DeviceInfo.getManufacturer(),
      systemName: await DeviceInfo.getSystemName(),
      systemVersion: await DeviceInfo.getSystemVersion(),
    };
  }

  private async _readIosDeviceInfo() {
    return {
      deviceId: await DeviceInfo.getUniqueId(),
      brand: await DeviceInfo.getBrand(),
      model: await DeviceInfo.getModel(),
      manufacturer: await DeviceInfo.getManufacturer(),
      systemName: await DeviceInfo.getSystemName(),
      systemVersion: await DeviceInfo.getSystemVersion(),
    };
  }

  private async _fetchConsolidatedPurchases(purchases: Purchase[], apiKey: string) {
    for (const purchase of purchases) {
      const receipt = purchase.purchaseToken;
      if (!receipt) continue;

      const data: any = this._serializePurchaseDetails(purchase);
      data.products = [];

      const pid = data.productID || '';
      if (pid) {
        try {
          const products = await fetchProducts({ skus: [pid] });
          if (products && products.length) {
            for (const p of products) {
              data.products.push(this._serializeProductDetails(p));
            }
          }
        } catch (e) {
          console.warn('Error fetching products:', e);
        }
      }

      await this._sendEventToServer(JSON.stringify(data), 'purchase_product', apiKey);
    }
  }

  private async _sendEventToServer(body: string, eventType: string, apiKey: string) {
    try {
      await axios.post(this.eventUrl, body, {
        headers: {
          'x-affiliate-campaign-code': this._affiliateCampaignCode,
          'x-device-id': this._deviceId,
          'x-event-type': eventType,
          'x-product-type': Platform.OS,
          'x-source-name': Platform.OS === 'android' ? 'google_play' : 'app_store',
          'x-api-key': apiKey,
        },
      });
      console.log(`${eventType} sent successfully`);
    } catch (e) {
      console.log(`Error sending ${eventType}:`, e);
    }
  }

  private _serializePurchaseDetails(purchase: PurchaseCommon) {
    return {
      packageName: this._packageName,
      productID: purchase.productId,
      purchaseID: purchase.id,
      transactionDate: purchase.transactionDate,
      verificationData: {
        localVerificationData: purchase.purchaseToken,
        source: Platform.OS === 'android' ? 'google_play' : 'app_store',
      },
    };
  }

  private _serializeProductDetails(product: ProductCommon) {
    return {
      packageName: this._packageName,
      productID: product.id,
      productTitle: product.title,
      productDescription: product.description,
      productPrice: product.displayPrice,
      productRawPrice: product.price || '',
      productCurrencyCode: product.currency,
    };
  }

  private async _markSDKAsInitialized() {
    await AsyncStorage.setItem(this.sdkInitializedKey, 'true');
  }

  private async _isSDKInitialized() {
    const val = await AsyncStorage.getItem(this.sdkInitializedKey);
    return val === 'true';
  }

  private async _isProduction(): Promise<boolean> {
    if (__DEV__) return false;

    try {
      const installer = await DeviceInfo.getInstallerPackageName();

      if (
        installer === 'com.android.vending' ||
        installer === 'com.amazon.venezia'
      ) {
        return true;
      }

      if (installer == null && !__DEV__) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Error determining production status:', error);
      return false;
    }
  }

  private async _fetchExistingPurchases(apiKey: string): Promise<void> {
    try {
      const purchases = await getAvailablePurchases();
      if (purchases && purchases.length > 0) {
        await this._fetchConsolidatedPurchases(purchases, apiKey);
      }
    } catch (e) {
      console.log('Error fetching existing purchases on app open:', e);
    }
  }
}

export default GoMarketMe.getInstance();
