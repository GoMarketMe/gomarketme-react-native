const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('referral results update affiliate data and cancellation/errors preserve it', async () => {
  global.__DEV__ = false;
  const native = {
    initialize: async () => ({initialized: true, appInstallRef:'install-reference', attributionMode:'LinksAndReferralCodes'}),
    getReferralCodeSettings: async () => ({marketer_settings:{triggerText:'Referral code'}}),
    showReferralCodeSheet: async (trigger) => {
      assert.equal(trigger, true);
      return {affiliate_campaign_code:'campaign',device_id:'device',campaign:{id:'campaign'},affiliate:{id:'creator'},sale_distribution:{},referral_code:'FRIEND20'};
    },
    redeemReferralCode: async (code) => ({affiliate_campaign_code:'campaign',device_id:'device',campaign:{id:'campaign',metadata:{paywall_variant:'creator-offer'}},affiliate:{id:'creator',metadata:{profile_image_url:'https://example.com/jake.jpg'}},affiliate_campaign:{metadata:{offers:{ios:{monthly:{code:'MONTHLY10'}}}}},sale_distribution:{},referral_code:code}),
  };
  let foreground;
  const original = Module._load;
  Module._load = function(name,...args) {
    return name === 'react-native' ? {NativeModules:{GoMarketMeReactNative:native}, AppState:{addEventListener:(_event, listener) => { foreground = listener; return {remove(){}}; }}} : original.call(this,name,...args);
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
  assert.equal(sdk.appInstallRef, 'install-reference');
  assert.equal((sdk.attributionMode == 'ReferralCodesOnly'), false);
  native.initialize = async () => ({initialized:true,appInstallRef:'install-reference',attributionMode:'unknown'});
  await assert.rejects(sdk.initialize('test-key'), /invalid initialization/);
  assert.equal(sdk.initialized, false);
  native.initialize = async () => ({initialized:true,appInstallRef:'install-reference',attributionMode:'ReferralCodesOnly'});
  foreground('active');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sdk.initialized, true);
  assert.equal((sdk.attributionMode == 'ReferralCodesOnly'), true);
  native.initialize = async () => ({initialized:true,appInstallRef:'install-reference',attributionMode:'ReferralCodesOnly'});
  await sdk.initialize('test-key');
  assert.equal((sdk.attributionMode == 'ReferralCodesOnly'), true);
  native.initialize = async () => { throw Error('offline'); };
  await assert.rejects(sdk.initialize('test-key'), /offline/);
  assert.equal(sdk.initialized, false);
  native.initialize = () => { throw Error('bridge unavailable'); };
  await assert.rejects(sdk.initialize('test-key'), /bridge unavailable/);
  native.initialize = async () => ({initialized:true,appInstallRef:'install-reference',attributionMode:'LinksOnly'});
  await sdk.initialize('test-key');
  assert.equal(sdk.initialized, true);
  assert.equal((sdk.attributionMode == 'ReferralCodesOnly'), false);
  const installData = exports.GoMarketMeAffiliateMarketingData.fromJson({affiliate_campaign_code:'campaign',app_install_ref:'install-reference',device_id:'legacy'});
  assert.equal(installData.deviceId, '');
  assert.equal(installData.toJson().app_install_ref, 'install-reference');
  assert.equal('device_id' in installData.toJson(), false);
  assert.equal(exports.GoMarketMeAffiliateMarketingData.fromJson({affiliate_campaign_code:'',app_install_ref:'install-reference'}), null);

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
