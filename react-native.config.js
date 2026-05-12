module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import co.gomarketme.reactnative.GoMarketMeReactNativePackage;',
        packageInstance: 'new GoMarketMeReactNativePackage()',
      },
      ios: {},
    },
  },
};