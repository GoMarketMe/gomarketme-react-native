<div align="center">
  <img src="https://static.gomarketme.net/assets/gmm-icon.png" alt="GoMarketMe" />
  <br />
  <h1>GoMarketMe Affiliate Marketing SDK for React Native</h1>
  <p>Affiliate attribution, referral codes, and in-app purchase reporting for React Native and Expo apps on iOS and Android.</p>
</div>

[![npm package][npm_badge]][npm_link]
[![License: MIT][license_badge]][license_link]

[GoMarketMe](https://gomarketme.co) is an affiliate marketing platform for mobile apps, with affiliate attribution, referral codes, and purchase reporting for iOS and Android.

## Installation

### npm

```bash
npm install gomarketme-react-native@6.0.1
```

### Yarn

```bash
yarn add gomarketme-react-native@6.0.1
```

### pnpm

```bash
pnpm add gomarketme-react-native@6.0.1
```

## Usage

GoMarketMe takes only a few lines to set up.

### Step 1: Initialize

Import `gomarketme-react-native` and initialize the SDK with your GoMarketMe API key:

```tsx
import { useEffect } from 'react';
import GoMarketMe from 'gomarketme-react-native';

useEffect(() => {
  void GoMarketMe.initialize('API_KEY');
}, []);
```

Replace `API_KEY` with your actual GoMarketMe API key. You can find it during onboarding or in **Profile > [API Key](https://gomarketme.net/marketer/profile/#account-settings)**.

### Step 2: Sync Purchases (optional but recommended)

GoMarketMe automatically detects and reports purchases. We also recommend manually syncing after `react-native-iap`, `expo-iap`, RevenueCat, Adapty, or another provider confirms a successful purchase. Call it before finishing the transaction if your purchase library controls that step:

```tsx
await GoMarketMe.syncAllTransactions();
```

### Step 3: Include iOS Consumable History (optional)

If your iOS app sells consumable in-app purchases, add this key to your app's `Info.plist`:

```xml
<key>SKIncludeConsumableInAppPurchaseHistory</key>
<true/>
```

That's it! GoMarketMe will automatically attribute and report affiliate sales in real time to your dashboard and your affiliates' dashboards.

## Optional features

### Step 4: Referral Codes

Referral codes work alongside affiliate links when a link isn't practical, such as in conversations, podcasts, videos, events, or print.

**GoMarketMe UI:** Add the remotely configured referral-code trigger to your component tree:

```tsx
import { GoMarketMeReferralCodeTrigger } from 'gomarketme-react-native';

<GoMarketMeReferralCodeTrigger />
```

Enable and customize its text, colors, typography, and layout in [GoMarketMe Referral Code settings](https://gomarketme.net/marketer/settings#referral-codes).

**Custom UI:** If your app provides its own code-entry interface, redeem the code after initialization:

```tsx
const data = await GoMarketMe.redeemReferralCode('ASHLEY10');
```

Redemption throws `GoMarketMeReferralCodeError`. Use `code` for messages or UI behavior; the enum distinguishes invalid, expired, inactive, malformed-response, request, network, timeout, initialization, and unknown errors. `rawCode`, `statusCode`, and `isRetryable` are available for logging and retry decisions.

```tsx
import {
  GoMarketMeReferralCodeError,
  GoMarketMeReferralCodeErrorCode,
} from 'gomarketme-react-native';

try {
  await GoMarketMe.redeemReferralCode(code);
} catch (error) {
  if (error instanceof GoMarketMeReferralCodeError &&
      error.code === GoMarketMeReferralCodeErrorCode.InvalidCode) {
    showError('That referral code is not valid.');
  }
}
```

**Placement:** Put the referral-code entry point on the first screen users see after installing the app, ideally during onboarding or immediately afterward.

Learn more about [Referral Codes](https://gomarketme.co/referral-codes/).

### Step 5: Programmatic Affiliate Marketing

Programmatic Affiliate Marketing lets your app personalize the user experience based on the affiliate and campaign that referred the user. For example, you can customize onboarding, paywalls, offers, or in-app content.

When attribution exists—after initialization detects an affiliate link or after a referral code is successfully redeemed, either programmatically or through GoMarketMe's UI—`GoMarketMe.affiliateMarketingData` is populated.

If your app needs the attribution data immediately after initialization, await it first:

```tsx
await GoMarketMe.initialize('API_KEY');

const data = GoMarketMe.affiliateMarketingData;
```

The returned data includes:

```jsonc
{
  "campaign": {
    "id": "campaign-id",
    "name": "Creator campaign",
    "status": "active",
    "type": "affiliate",
    "publicLinkUrl": null, // null unless this is a public campaign
    "metadata": {
      // Optional campaign-level properties configured in GoMarketMe
    }
  },
  "affiliate": {
    "id": "affiliate-id",
    "firstName": "Ashley",
    "lastName": "Creator",
    "countryCode": "US",
    "instagramAccount": "",
    "tiktokAccount": "",
    "xAccount": ""
  },
  "affiliateCampaign": {
    "metadata": {
      // Optional affiliate-level properties for this campaign configured in GoMarketMe
    }
  },
  "saleDistribution": {
    "platformPercentage": "10",
    "affiliatePercentage": "20"
  },
  "affiliateCampaignCode": "affiliate-campaign-code",
  "deviceId": "device-id",
  "offerCode": null, // null unless this is an offer-code campaign
  "referralCode": "ASHLEY10" // null unless attribution used a referral code
}
```

- `campaign.metadata` is configured under **Campaign detail > Advanced > Campaign-level metadata**.
- `affiliateCampaign.metadata` is configured under **Campaign detail > Affiliates > Invite or edit affiliate > Advanced > Affiliate-level metadata for this campaign**.

Every property shown above is present when attribution exists. Optional values are `undefined` when they do not apply. The configurable metadata objects are always present and are empty when no metadata is configured; GoMarketMe returns their free-form contents without interpreting them. If no attribution exists, `affiliateMarketingData` is `null` or `undefined`.

Learn more about [Programmatic Affiliate Marketing](https://gomarketme.co/programmatic-affiliate-marketing/).

## Platform requirements

| Platform | Support | Notes |
|---|---:|---|
| iOS | ✅ | StoreKit 2, requires iOS 15+ |
| Android | ✅ | Requires Android API 23+ |
| Expo Go | ❌ | Native modules are not supported |
| Expo development build | ✅ | Full support |
| Bare React Native | ✅ | Full support |

## IAP provider compatibility

| Provider | Support | Notes |
|---|---:|---|
| react-native-iap | ✅ | Full support |
| expo-iap | ✅ | Full support |
| RevenueCat | ✅ | Supports Apple and Google IAPs |
| Adapty | ✅ | Supports Apple and Google IAPs |

GoMarketMe works alongside `react-native-iap`, `expo-iap`, RevenueCat, Adapty, and other IAP providers.

## Resources

- [GoMarketMe affiliate marketing platform](https://gomarketme.co)
- [GoMarketMe React Native package on npm][npm_link]
- [GoMarketMe React Native sample app](https://github.com/GoMarketMe/gomarketme-react-native-sample-app)
- [Referral Codes](https://gomarketme.co/referral-codes/)
- [Programmatic Affiliate Marketing](https://gomarketme.co/programmatic-affiliate-marketing/)

## Support

For integration support, contact [integrations@gomarketme.co](mailto:integrations@gomarketme.co) or visit [https://gomarketme.co](https://gomarketme.co).

[npm_badge]: https://img.shields.io/npm/v/gomarketme-react-native.svg
[npm_link]: https://www.npmjs.com/package/gomarketme-react-native
[license_badge]: https://img.shields.io/badge/license-MIT-blue.svg
[license_link]: https://opensource.org/licenses/MIT
