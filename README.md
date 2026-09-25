<div align="center">
  <img src="https://static.gomarketme.net/assets/gmm-icon.png" alt="GoMarketMe" />
  <br />
  <h1>GoMarketMe React Native SDK</h1>
  <p>Affiliate marketing for React Native and Expo apps on iOS and Android.</p>
</div>

## Installation

### npm

```bash
npm install gomarketme-react-native@6.0.0
```

### Yarn

```bash
yarn add gomarketme-react-native@6.0.0
```

### pnpm

```bash
pnpm add gomarketme-react-native@6.0.0
```


## Usage

GoMarketMe takes only a few lines to set up.

### Step 1: Initialize

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

### Step 2: Sync Purchases (recommended)

GoMarketMe automatically detects and reports purchases. For additional reliability, we also recommend manually syncing after `react-native-iap`, `expo-iap`, RevenueCat, Adapty, or another provider confirms a successful purchase:

```tsx
await GoMarketMe.syncAllTransactions();
```

Call it before finishing the transaction when your purchase library controls that step.

### Step 3: Only for iOS consumables

If your iOS app sells consumable in-app purchases, add this key to your app's `Info.plist`:

```xml
<key>SKIncludeConsumableInAppPurchaseHistory</key>
<true/>
```

That's it. GoMarketMe will automatically attribute and report affiliate sales in real time to your dashboard and your affiliates' dashboards.

## Optional

### Step 4: Referral Codes

Referral codes work alongside affiliate links when a link isn't practical, such as in conversations, podcasts, videos, events, or print.

Enable Referral Codes in one line:

```tsx
<GoMarketMeReferralCodeTrigger />
```

**Placement:** Put this referral UI on the first screen users see after installing the app, ideally during onboarding or immediately afterward.

Customize its text, colors, typography, and layout directly in [https://gomarketme.net/marketer/settings#referral-codes](https://gomarketme.net/marketer/settings#referral-codes).

Learn more about [Referral Codes](https://gomarketme.co/referral-codes/).

### Step 5: Programmatic Affiliate Marketing

Programmatic Affiliate Marketing lets your app personalize the user experience based on the affiliate and campaign that referred the user. For example, you can customize onboarding, paywalls, offers, or in-app content.

After awaiting initialization, read `affiliateMarketingData`:

```tsx
await GoMarketMe.initialize('API_KEY');

const data = GoMarketMe.affiliateMarketingData;
if (data) {
  console.log('Affiliate ID:', data.affiliate?.id);
  console.log('Affiliate %:', data.saleDistribution?.affiliatePercentage);
  console.log('Campaign ID:', data.campaign?.id);
}
```

Learn more about [Programmatic Affiliate Marketing](https://gomarketme.co/programmatic-affiliate-marketing/).

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
