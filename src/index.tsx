import { Platform, Dimensions, PixelRatio } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import getUserLocale from 'get-user-locale'
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNIap from 'react-native-iap';
import axios from 'axios';
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
    // Check if the json is an empty object
    if (Object.keys(json).length === 0) {
      return null; // Return null or undefined, depending on your preference
    }

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
      json.id || '',
      json.name || '',
      json.status || '',
      json.type || '',
      json.public_link_url
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
      json.id || '',
      json.first_name || '',
      json.last_name || '',
      json.country_code || '',
      json.instagram_account || '',
      json.tiktok_account || '',
      json.x_account || ''
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
    return new SaleDistribution(
      json.platform_percentage || '',
      json.affiliate_percentage || ''
    );
  }
}

class GoMarketMe {
  private static instance: GoMarketMe;
  private sdkType = 'ReactNative';
  private sdkVersion = '2.0.0';
  private sdkInitializedKey = 'GOMARKETME_SDK_INITIALIZED';
  private sdkInitializationUrl = 'https://4v9008q1a5.execute-api.us-west-2.amazonaws.com/prod/v1/sdk-initialization';
  private systemInfoUrl = 'https://4v9008q1a5.execute-api.us-west-2.amazonaws.com/prod/v1/mobile/system-info';
  private eventUrl = 'https://4v9008q1a5.execute-api.us-west-2.amazonaws.com/prod/v1/event';
  private _affiliateCampaignCode = '';
  private _deviceId = '';
  private _packageName = ''
  public affiliateMarketingData?: GoMarketMeAffiliateMarketingData | null;

  private constructor() { }

  public static getInstance(): GoMarketMe {
    if (!GoMarketMe.instance) {
      GoMarketMe.instance = new GoMarketMe();
    }
    return GoMarketMe.instance;
  }

  public async initialize(apiKey: string): Promise<void> {
    try {
      const isSDKInitialized = await this._isSDKInitialized();
      if (!isSDKInitialized) {
        await this._postSDKInitialization(apiKey);
      }
      this._packageName = DeviceInfo.getBundleId();
      const systemInfo = await this._getSystemInfo();
      this.affiliateMarketingData = await this._postSystemInfo(systemInfo, apiKey);
      await this._addListener(apiKey);
    } catch (e) {
      console.log('Error initializing GoMarketMe:', e);
    }
  }

  private async _addListener(apiKey: string): Promise<void> {
    try {
      RNIap.purchaseUpdatedListener(async (purchase: RNIap.Purchase) => {
        await this._fetchConsolidatedPurchases([purchase], apiKey);
      });

      RNIap.purchaseErrorListener((error) => {
        console.log('Purchase error:', error);
      });
    } catch (e) {
      console.log('Error setting up IAP listeners:', e);
    }
  }

  private async _getSystemInfo(): Promise<any> {
    const deviceData = Platform.select({
      ios: await this._readIosDeviceInfo(),
      android: await this._readAndroidDeviceInfo(),
    });

    this._deviceId = deviceData['deviceId'];

    const devicePixelRatio = PixelRatio.get();
    const dimension = Dimensions.get('window');

    const windowData = {
      devicePixelRatio: devicePixelRatio,
      width: dimension.width * devicePixelRatio,
      height: dimension.height * devicePixelRatio,
    };

    return {
      device_info: deviceData,
      window_info: windowData,
      time_zone: this._getTimeZone(),
      language_code: this._getLanguageCode(),
    };
  }

  private async _postSDKInitialization(apiKey: string): Promise<void> {
    try {
      const response = await axios.post(this.sdkInitializationUrl, {}, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      });
      if (response.status === 200) {
        await this._markSDKAsInitialized();
      } else {
        console.log('Failed to mark SDK as Initialized. Status code:', response.status);
      }
    } catch (e) {
      console.log('Error sending SDK information to server:', e);
    }
  }

  private async _postSystemInfo(data: any, apiKey: string): Promise<GoMarketMeAffiliateMarketingData | null> {
    let output: GoMarketMeAffiliateMarketingData | null = null;
    try {
      data['sdk_type'] = this.sdkType;
      data['sdk_version'] = this.sdkVersion;
      data['package_name'] = this._packageName;
      const response = await axios.post(this.systemInfoUrl, data, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      });
      if (response.status === 200) {
        output = GoMarketMeAffiliateMarketingData.fromJson(response.data);
        if (output != null) {
          this._affiliateCampaignCode = output.affiliateCampaignCode;
        }
      } else {
        console.log('Failed to send system info. Status code:', response.status);
      }
    } catch (e) {
      console.log('Error sending system info to server:', e);
    }
    return output;
  }

  private async _readAndroidDeviceInfo(): Promise<any> {

    let androidId = await DeviceInfo.getAndroidId();
    let uniqueId = await DeviceInfo.getUniqueId();
    let deviceId = await DeviceInfo.getDeviceId(); // model
    let systemName = await DeviceInfo.getSystemName();
    let systemVersion = await DeviceInfo.getSystemVersion()
    let brand = await DeviceInfo.getBrand();
    let model = await DeviceInfo.getModel();
    let manufacturer = await DeviceInfo.getManufacturer();
    let isEmulator = await DeviceInfo.isEmulator();

    return {
      deviceId: androidId,
      _deviceId: deviceId,
      _uniqueId: uniqueId,
      systemName: systemName,
      systemVersion: systemVersion,
      brand: brand,
      model: model,
      manufacturer: manufacturer,
      isEmulator: isEmulator
    };
  }

  private async _readIosDeviceInfo(): Promise<any> {

    let uniqueId = await DeviceInfo.getUniqueId();
    let deviceId = await DeviceInfo.getDeviceId(); // model
    let systemName = await DeviceInfo.getSystemName();
    let systemVersion = await DeviceInfo.getSystemVersion()
    let brand = await DeviceInfo.getBrand();
    let model = await DeviceInfo.getModel();
    let manufacturer = await DeviceInfo.getManufacturer();
    let isEmulator = await DeviceInfo.isEmulator();

    return {
      deviceId: uniqueId,
      _deviceId: deviceId,
      systemName: systemName,
      systemVersion: systemVersion,
      brand: brand,
      model: model,
      manufacturer: manufacturer,
      isEmulator: isEmulator
    };
  }

  private _getTimeZone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  private _getLanguageCode(): string {
    return getUserLocale();
  }

  private async _fetchConsolidatedPurchases(purchaseDetailsList: RNIap.Purchase[], apiKey: string): Promise<void> {
    for (const purchase of purchaseDetailsList) {
      if (purchase.transactionReceipt) {
        var data = this._serializePurchaseDetails(purchase);
        data['products'] = []
        if (data.productID != '') {
          const products = await RNIap.getProducts({ skus: [data.productID] })
          if (products.length > 0) {
            for (const product0 of products) {
              data['products'].push(this._serializeProductDetails(product0))
            }
          }
          else {
            const products = await RNIap.getSubscriptions({ skus: [data.productID] });
            if (products.length > 0) {
              for (const product0 of products) {
                data['products'].push(this._serializeSubscriptionDetails(product0))
              }
            }
          }
        }
        await this._sendEventToServer(JSON.stringify(data), 'purchase', apiKey);
      }
    }
  }

  private async _sendEventToServer(body: string, eventType: string, apiKey: string): Promise<void> {
    try {
      const response = await axios.post(this.eventUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          'x-affiliate-campaign-code': this._affiliateCampaignCode,
          'x-device-id': this._deviceId,
          'x-event-type': eventType,
          'x-product-type': Platform.OS,
          'x-source-name': Platform.OS === 'android' ? 'google_play' : 'app_store',
          'x-api-key': apiKey,
        },
      });
      if (response.status === 200) {
        console.log(`${eventType} sent successfully`);
      } else {
        console.log(`Failed to send ${eventType}. Status code:`, response.status);
      }
    } catch (e) {
      console.log(`Error sending ${eventType} to server:`, e);
    }
  }

  private _serializePurchaseDetails(purchase: RNIap.Purchase): any {
    return {
      packageName: this._packageName,
      productID: purchase.productId,
      purchaseID: purchase.transactionId || '',
      transactionDate: purchase.transactionDate || '',
      status: Platform.select({
        ios: (purchase as any).transactionStateIOS, // Removed non-existent properties
        android: (purchase as any).purchaseStateAndroid,
      }),
      verificationData: {
        localVerificationData: purchase.transactionReceipt,
        serverVerificationData: purchase.transactionReceipt,
        source: Platform.OS === 'android' ? 'google_play' : 'app_store',
      },
      pendingCompletePurchase: '',
      error: {},
      hashCode: '',
      _purchase: purchase
    };
  }

  private _serializeProductDetails(product: RNIap.Product): any {
    return {
      packageName: this._packageName,
      productID: product.productId,
      productTitle: product.title,
      productDescription: product.description,
      productPrice: product.localizedPrice,
      productRawPrice: product.price,
      productCurrencySymbol: product.localizedPrice.replace('product.price', ''),
      productCurrencyCode: product.currency,
      hashCode: '',
      _product: product
    };
  }

  private _serializeSubscriptionDetails(subscription: RNIap.Subscription): any {
    let output: any = {
      productID: subscription.productId,
      productTitle: subscription.title,
      productDescription: subscription.description,
      hashCode: '',
    };

    if (Platform.OS === 'ios') {
      const subscriptionIOS = subscription as RNIap.SubscriptionIOS;
      output.productPrice = subscriptionIOS.localizedPrice;
      output.productRawPrice = subscriptionIOS.price;
      output.productCurrencyCode = subscriptionIOS.currency;
      output._subscription = subscriptionIOS;
    } else if (Platform.OS === 'android') {
      const subscriptionAndroid = subscription as RNIap.SubscriptionAndroid;
      if (subscriptionAndroid.subscriptionOfferDetails?.length) {
        const offerDetails = subscriptionAndroid.subscriptionOfferDetails[0];
        const priceAmountMicros = parseInt(offerDetails.pricingPhases.pricingPhaseList[0].priceAmountMicros, 10) || 0;
        output.productPrice = offerDetails.pricingPhases.pricingPhaseList[0].formattedPrice;
        output.productRawPrice = String(priceAmountMicros / 1_000_000);
        output.productCurrencyCode = offerDetails.pricingPhases.pricingPhaseList[0].priceCurrencyCode;
      }
      output._subscription = subscriptionAndroid;
    }

    return output;
  }

  private async _markSDKAsInitialized(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.sdkInitializedKey, 'true');
      return true;
    } catch (e) {
      console.log('Failed to save SDK initialization:', e);
      return false;
    }
  }

  private async _isSDKInitialized(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(this.sdkInitializedKey);
      return value === 'true';
    } catch (e) {
      console.log('Failed to load SDK initialization:', e);
      return false;
    }
  }
}

export default GoMarketMe.getInstance();
