<div align="center">
	<img src="https://static.gomarketme.net/assets/gmm-icon.png" alt="GoMarketMe"/>
	<br>
    <h1>gomarketme-react-native</h1>
	<p>Affiliate marketing for React Native apps on iOS and Android.</p>
</div>

## Installation

### Using npm

```bash
npm install gomarketme-react-native@4.0.0
```

### Using yarn

```bash
yarn add gomarketme-react-native@4.0.0
```

### Using pnpm

```bash
pnpm add gomarketme-react-native@4.0.0
```
##

GoMarketMe is built on top of react-native-iap, so you may also need to install the following packages: 
```bash
npm install react-native-iap react-native-nitro-modules
(or yarn add react-native-iap react-native-nitro-modules)
(or pnpm add react-native-iap react-native-nitro-modules)
```

## Usage

⚙️ Basic Integration

To initialize GoMarketMe, import the `gomarketme` package and initialize the SDK with your API key:

```tsx
import GoMarketMe from 'gomarketme-react-native';

useEffect(() => {
  
  GoMarketMe.initialize('API_KEY'); // Initialize with your API key

}, []);
```

No further steps needed. The SDK automatically attributes and reports your affiliate sales in real time.

⚙️ OR - Advanced Integration

Use this approach for more advanced scenarios, such as:
- Affiliate-aware paywalls: Offer exclusive pricing or promotions to users acquired through affiliate campaigns.
- Personalized onboarding: For example, a social or fitness app can automatically make new users follow the influencer who referred them, strengthening engagement and maximizing the affiliate’s impact.

```tsx
import GoMarketMe from 'gomarketme-react-native';
  
const goMarketMeSDK = GoMarketMe;
const [affiliateData, setAffiliateData] = useState<GoMarketMeAffiliateMarketingData | null>(null);

useEffect(() => {
  
  const initGoMarketMe = async () => {
    
    await goMarketMeSDK.initialize('API_KEY'); // Initialize with your API key
    const data = goMarketMeSDK.affiliateMarketingData;

    if (data) { // user acquired through affiliate campaign
      
      console.log('Affiliate ID:', data.affiliate?.id);                         // maps to GoMarketMe > Affiliates > Export > id column
      console.log('Affiliate %:', data.saleDistribution?.affiliatePercentage);  // maps to GoMarketMe > Campaigns > [Name] > Affiliate's Revenue Split (%)
      console.log('Campaign ID:', data.campaign?.id);                           // maps to GoMarketMe > Campaigns > [Name] > id in the URL

      setAffiliateData(data);
    }

  };

  initGoMarketMe();
}, []);
```

Make sure to replace `API_KEY` with your actual GoMarketMe API key. You can find it on the product onboarding page and under **Profile > API Key**.

For Expo, go to [https://www.npmjs.com/package/gomarketme-react-native-expo](https://www.npmjs.com/package/gomarketme-react-native-expo).

## Support

Check out our sample React Native app at [https://github.com/GoMarketMe/gomarketme-react-native-sample-app](https://github.com/GoMarketMe/gomarketme-react-native-sample-app).

If you run into any issues, please reach out to us at [integrations@gomarketme.co](mailto:integrations@gomarketme.co) or visit [https://gomarketme.co](https://gomarketme.co).