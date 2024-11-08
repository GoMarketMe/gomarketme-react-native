import { Platform, Dimensions, PixelRatio } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import getUserLocale from 'get-user-locale'
import AsyncStorage from '@react-native-async-storage/async-storage';
import InAppPurchase, { Purchase, Product, Subscription } from 'react-native-iap';
import axios from 'axios';

class GoMarketMe {
  private static instance: GoMarketMe;
  private sdkInitializedKey = 'GOMARKETME_SDK_INITIALIZED';
  private affiliateCampaignCode = '';
  private deviceId = '';
  private sdkInitializationUrl = 'https://api.gomarketme.net/v1/sdk-initialization';
  private systemInfoUrl = 'https://api.gomarketme.net/v1/mobile/system-info';
  private eventUrl = 'https://api.gomarketme.net/v1/event';

  private constructor() {}

  public static getInstance(): GoMarketMe {
    if (!GoMarketMe.instance) {
      GoMarketMe.instance = new GoMarketMe();
    }
    return GoMarketMe.instance;
  }

  public async initialize(apiKey: string): Promise<void> {
    try {
      const isSDKInitialized = await this.isSDKInitialized();
      if (!isSDKInitialized) {
        await this.postSDKInitialization(apiKey);
      }
      const systemInfo = await this.getSystemInfo();
      await this.postSystemInfo(systemInfo, apiKey);
      await this.addListener(apiKey);
    } catch (e) {
      console.error('Error initializing GoMarketMe:', e);
    }
  }

  private async addListener(apiKey: string): Promise<void> {
    InAppPurchase.purchaseUpdatedListener(async (purchase: Purchase) => {
      if (this.affiliateCampaignCode != '') {
        const productIds = await this.fetchPurchases([purchase], apiKey);
        await this.fetchPurchaseProducts(productIds, apiKey);
      }
    });
  }

  private async getSystemInfo(): Promise<any> {
    const deviceData = Platform.select({
      ios: await this.readIosDeviceInfo(),
      android: await this.readAndroidDeviceInfo(),
    });
  
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
      time_zone: this.getTimeZone(),
      language_code: this.getLanguageCode(),
    };
  }

  private async postSDKInitialization(apiKey: string): Promise<void> {
    try {
      const response = await axios.post(this.sdkInitializationUrl, {}, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      });
      if (response.status === 200) {
        await this.markSDKAsInitialized();
      } else {
        console.error('Failed to mark SDK as Initialized. Status code:', response.status);
      }
    } catch (e) {
      console.error('Error sending SDK information to server:', e);
    }
  }

  private async postSystemInfo(systemInfo: any, apiKey: string): Promise<void> {
    try {
      const response = await axios.post(this.systemInfoUrl, systemInfo, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      });
      if (response.status === 200) {
        const responseData = response.data;
        if (responseData.affiliate_campaign_code) {
          this.affiliateCampaignCode = responseData.affiliate_campaign_code;
        }
        if (responseData.device_id) {
          this.deviceId = responseData.device_id;
        }

      } else {
        console.error('Failed to send system info. Status code:', response.status);
      }
    } catch (e) {
      console.error('Error sending system info to server:', e);
    }
  }

  private async readAndroidDeviceInfo(): Promise<any> {

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

  private async readIosDeviceInfo(): Promise<any> {

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

  private getTimeZone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

  private getLanguageCode(): string {
    return getUserLocale();
  }

  private async fetchPurchases(purchaseDetailsList: Purchase[], apiKey: string): Promise<string[]> {
    const productIds: string[] = [];
    for (const purchase of purchaseDetailsList) {
      if (purchase.transactionReceipt) {
        await this.sendEventToServer(JSON.stringify(this.serializePurchaseDetails(purchase)), 'purchase', apiKey);
        if (purchase.productId && !productIds.includes(purchase.productId)) {
          productIds.push(purchase.productId);
        }
      }
    }
    return productIds;
  }

  private async fetchPurchaseProducts(productIds: string[], apiKey: string): Promise<void> {
    try {
      const products = await InAppPurchase.getProducts(productIds);
      if (products.length > 0) {
        for (const product of products) {
          await this.sendEventToServer(JSON.stringify(this.serializeProductDetails(product)), 'product', apiKey);
        }
      } else {
        const products = await InAppPurchase.getSubscriptions(productIds);
        if (products.length > 0) {
          for (const product of products) {
            await this.sendEventToServer(JSON.stringify(this.serializeSubscriptionDetails(product)), 'product', apiKey);
          }
        } else {
          await this.sendEventToServer(JSON.stringify({ notFoundIDs: productIds.join(',') }), 'product', apiKey);
        }
      }
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  }

  private async sendEventToServer(body: string, eventType: string, apiKey: string): Promise<void> {
    try {
      const response = await axios.post(this.eventUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          'x-affiliate-campaign-code': this.affiliateCampaignCode,
          'x-device-id': this.deviceId,
          'x-event-type': eventType,
          'x-product-type': Platform.OS,
          'x-source-name': Platform.OS === 'android' ? 'google_play' : 'app_store',
          'x-api-key': apiKey,
        },
      });
      if (response.status === 200) {
        console.log(`${eventType} sent successfully`);
      } else {
        console.error(`Failed to send ${eventType}. Status code:`, response.status);
      }
    } catch (e) {
      console.error(`Error sending ${eventType} to server:`, e);
    }
  }

  private serializePurchaseDetails(purchase: Purchase): any {
    return {
      productID: purchase.productId,
      purchaseID: purchase.transactionId || '',
      transactionDate: purchase.transactionDate || '',
      status: Platform.select({
        ios: (purchase as any).transactionStateIOS, // Removed non-existent properties
        android: (purchase as any).purchaseStateAndroid,
      }),
      verificationData: {
        localVerificationData: purchase.transactionReceipt,
      },
    };
  }

  private serializeProductDetails(product: Product): any {
    return {
      productID: product.productId,
      productTitle: product.title,
      productDescription: product.description,
      productPrice: product.price,
      productRawPrice: product.price,
      productCurrencyCode: product.currency,
    };
  }

  private serializeSubscriptionDetails(subscription: Subscription): any {
    return {
      productID: subscription.productId,
      productTitle: subscription.title,
      productDescription: subscription.description,
      productPrice: subscription.price,
      productRawPrice: subscription.price,
      productCurrencyCode: subscription.currency,
    };
  }

  private async markSDKAsInitialized(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.sdkInitializedKey, 'true');
      return true;
    } catch (e) {
      console.error('Failed to save SDK initialization:', e);
      return false;
    }
  }

  private async isSDKInitialized(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(this.sdkInitializedKey);
      return value === 'true';
    } catch (e) {
      console.error('Failed to load SDK initialization:', e);
      return false;
    }
  }
}

export default GoMarketMe.getInstance();
