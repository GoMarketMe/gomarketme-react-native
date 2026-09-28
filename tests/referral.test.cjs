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
    redeemReferralCode: async (code) => ({affiliate_campaign_code:'campaign',device_id:'device',campaign:{id:'campaign',metadata:{paywall_variant:'creator-offer'}},affiliate:{id:'creator',metadata:{profile_image_url:'https://example.com/jake.jpg'}},affiliate_campaign:{metadata:{offers:{ios:{monthly:{code:'MONTHLY10'}}}}},sale_distribution:{},referral_code:code}),
  };
  const original = Module._load;
  Module._load = function(name,...args) {
    return name === 'react-native' ? {NativeModules:{GoMarketMeReactNative:native}} : original.call(this,name,...args);
  };
  let sdk;
  let exports;
  try {
    exports = require('../lib/index.js');
    sdk = exports.default;
  } finally { Module._load = original; }
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
  const redeemed = await sdk.redeemReferralCode('JAKE10');
  assert.equal(redeemed.referralCode,'JAKE10');
  assert.equal(redeemed.campaign.metadata.paywall_variant,'creator-offer');
  assert.equal(redeemed.affiliate.metadata.profile_image_url,'https://example.com/jake.jpg');
  assert.equal(redeemed.affiliateCampaign.metadata.offers.ios.monthly.code,'MONTHLY10');
  assert.deepEqual(redeemed.toJson().affiliate_campaign, {metadata:{offers:{ios:{monthly:{code:'MONTHLY10'}}}}});
  native.redeemReferralCode = async () => {
    throw {
      code: 'referral_code_error',
      message: 'Referral request failed (invalid_code, HTTP 422).',
      userInfo: {code: 'invalid_code', statusCode: 422, isRetryable: false},
    };
  };
  await assert.rejects(
    sdk.redeemReferralCode('NOT-A-CODE'),
    error => error instanceof exports.GoMarketMeReferralCodeError &&
      error.code === exports.GoMarketMeReferralCodeErrorCode.InvalidCode &&
      error.rawCode === 'invalid_code' &&
      error.statusCode === 422 &&
      error.isRetryable === false
  );
  assert.equal(sdk.affiliateMarketingData,redeemed);
  native.showReferralCodeSheet = async () => null;
  assert.equal(await sdk.showReferralCodeSheet(),null);
  assert.equal(sdk.affiliateMarketingData,redeemed);
  native.showReferralCodeSheet = async () => {throw Error('already_presented')};
  await assert.rejects(sdk.showReferralCodeSheet(), /already_presented/);
  assert.equal(sdk.affiliateMarketingData,redeemed);
});
