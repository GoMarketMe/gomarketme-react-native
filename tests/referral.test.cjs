const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('referral results update affiliate data and cancellation/errors preserve it', async () => {
  global.__DEV__ = false;
  const native = {
    initialize: async () => ({initialized: true}),
    getReferralCodeSettings: async () => ({marketer_settings:{triggerText:'Referral code'}}),
    showReferralCodeSheet: async (trigger) => {
      assert.equal(trigger, true);
      return {affiliate_campaign_code:'campaign',device_id:'device',campaign:{id:'campaign'},affiliate:{id:'creator'},sale_distribution:{},referral_code:'FRIEND20'};
    },
  };
  const original = Module._load;
  Module._load = function(name,...args) {
    return name === 'react-native' ? {NativeModules:{GoMarketMeReactNative:native}} : original.call(this,name,...args);
  };
  let sdk;
  try { sdk = require('../lib/index.js').default; } finally { Module._load = original; }
  await assert.rejects(sdk.showReferralCodeSheet(), /Initialize/);

  // A trigger nested below a component that initializes on mount runs its
  // effect first. Settings should wait for initialization started that turn.
  const settings = sdk.referralCodeSettings();
  await sdk.initialize('test-key');
  assert.equal((await settings).marketer_settings.triggerText, 'Referral code');

  const data = await sdk.showReferralCodeSheet(true);
  assert.equal(data.affiliate.id,'creator');
  assert.equal(data.referralCode,'FRIEND20');
  assert.equal(data.toJson().referral_code,'FRIEND20');
  assert.equal(sdk.affiliateMarketingData,data);
  native.showReferralCodeSheet = async () => null;
  assert.equal(await sdk.showReferralCodeSheet(),null);
  assert.equal(sdk.affiliateMarketingData,data);
  native.showReferralCodeSheet = async () => {throw Error('already_presented')};
  await assert.rejects(sdk.showReferralCodeSheet(), /already_presented/);
  assert.equal(sdk.affiliateMarketingData,data);
});
