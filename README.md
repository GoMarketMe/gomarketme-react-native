<div align="center">
  <img src="https://static.gomarketme.net/assets/gmm-icon.png" alt="GoMarketMe" />
  <br />
  <h1>GoMarketMe React Native SDK</h1>
  <p>Affiliate marketing for React Native and Expo apps on iOS and Android.</p>
</div>

## Installation

### npm

```bash
npm install gomarketme-react-native@5.0.5
```

### Yarn

```bash
yarn add gomarketme-react-native@5.0.5
```

### pnpm

```bash
pnpm add gomarketme-react-native@5.0.5
```


## Usage

GoMarketMe takes only a few lines to set up.

### Step 1/3: Initialize

Import `gomarketme-react-native` and initialize the SDK with your GoMarketMe API key.

```tsx
import { useEffect } from 'react';
import GoMarketMe from 'gomarketme-react-native';

useEffect(() => {
  const initializeGoMarketMe = async () => {
    await GoMarketMe.initialize('API_KEY');
  };

  initializeGoMarketMe();
}, []);
```

Replace `API_KEY` with your actual GoMarketMe API key. You can find it during onboarding or in **Profile > [API Key](https://gomarketme.net/marketer/profile/#account-settings)**.

### Alternative Step 1/3: Programmatic Affiliate Marketing

For apps that want to customize the user experience based on affiliate attribution, initialize GoMarketMe and read affiliate marketing data after initialization.

This enables [Programmatic Affiliate Marketing](https://gomarketme.co/programmatic-affiliate-marketing/), including affiliate-aware paywalls, personalized onboarding, promotions, and custom in-app experiences.

```tsx
import { useEffect, useState } from 'react';
import GoMarketMe, {
  GoMarketMeAffiliateMarketingData,
} from 'gomarketme-react-native';

const [affiliateData, setAffiliateData] =
  useState<GoMarketMeAffiliateMarketingData | null>(null);

useEffect(() => {
  const initializeGoMarketMe = async () => {
    await GoMarketMe.initialize('API_KEY');

    const data = GoMarketMe.affiliateMarketingData;

    if (!data) {
      return;
    }

    // Maps to GoMarketMe > Affiliates > Export > id column.
    console.log('Affiliate ID:', data.affiliate?.id);

    // Maps to GoMarketMe > Campaigns > [Name] > Affiliate's Revenue Split (%).
    console.log('Affiliate %:', data.saleDistribution?.affiliatePercentage);

    // Maps to GoMarketMe > Campaigns > [Name] > id in the URL.
    console.log('Campaign ID:', data.campaign?.id);

    // Use this data to customize onboarding, paywalls, promotions, or in-app experiences.
    setAffiliateData(data);
  };

  initializeGoMarketMe();
}, []);
```

### Step 2/3: Sync after purchase

After your app completes a purchase through `react-native-iap`, `expo-iap`, RevenueCat, Adapty, or another in-app purchase provider, call:

```tsx
await GoMarketMe.syncAllTransactions();
```

If your purchase library lets you decide when to finish, acknowledge, consume, or complete the transaction, call `syncAllTransactions()` first.

```tsx
purchaseUpdateSub = purchaseUpdatedListener(async purchase => {
  await GoMarketMe.syncAllTransactions();

  await finishTransaction({ purchase, isConsumable: true });
});
```

### Step 3/3: iOS consumables only

If your iOS app sells consumable in-app purchases, add this key to your app's `Info.plist`:

```xml
<key>SKIncludeConsumableInAppPurchaseHistory</key>
<true/>
```

That's it. GoMarketMe automatically attributes and reports affiliate sales.

## Platform Support

| Platform          | Support | Notes                                   |
| ----------------- | ------- | --------------------------------------- |
| iOS               | ✅      | StoreKit 2, requires iOS 15+            |
| Android           | ✅      | Google Play Billing v8.0.0+             |
| Expo Go           | ❌      | Not supported                           |
| Expo Dev Client   | ✅      | Full support                            |
| Bare React Native | ✅      | Full support                            |

## IAP Provider Compatibility

| Provider | Support | Notes |
|---|---:|---|
| react-native-iap | ✅ | Full support |
| expo-iap | ✅ | Full support |
| RevenueCat | ✅ | Supports Apple and Google IAPs |
| Adapty | ✅ | Supports Apple and Google IAPs |

GoMarketMe works alongside `react-native-iap`, `expo-iap`, RevenueCat, Adapty, and other IAP providers.

## Sample app

Check out the sample React Native app:

[https://github.com/GoMarketMe/gomarketme-react-native-sample-app](https://github.com/GoMarketMe/gomarketme-react-native-sample-app)

## Support

For integration support, contact [integrations@gomarketme.co](mailto:integrations@gomarketme.co) or visit [https://gomarketme.co](https://gomarketme.co).
