<div align="center">
	<img src="https://static.gomarketme.net/assets/gmm-icon.png" alt="GoMarketMe"/>
	<br>
    <h1>gomarketme-react-native</h1>
	<p>Affiliate Marketing for React Native-Based iOS and Android Apps.</p>
</div>

## Installation

### Using npm

```bash
npm install gomarketme-react-native
```

### Using yarn

```bash
yarn add gomarketme-react-native
```

### Using pnpm

```bash
pnpm add gomarketme-react-native
```


## Usage

To initialize GoMarketMe, import the `gomarketme` package and create a new instance of `GoMarketMe`:

```tsx
import GoMarketMe from 'gomarketme-react-native';

const App: React.FC = () => {
  const apiKey = 'YOUR_API_KEY_HERE';

  useEffect(() => {
    const initializeGoMarketMe = async () => {
      await GoMarketMe.initialize(apiKey);
    };

    initializeGoMarketMe();
  }, []);
};
```

Make sure to replace API_KEY with your actual GoMarketMe API key. You can find it on the product onboarding page and under Profile > API Key.

## Support

If you encounter any problems or issues, please contact us at [integrations@gomarketme.co](mailto:integrations@gomarketme.co) or visit [https://gomarketme.co](https://gomarketme.co).