'use strict';

var app = new Vue({
  el: '#app',
  data: {
    amount: 100,
    currency: 'STEEM',
    updateDate: '잠시만 기다려 주세요',
    results: [{
      method: '데이터를 받아오는 중입니다',
      price: 0,
      best: false
    }]
  },
  watch: {
    amount: calculate,
    currency: calculate
  }
});

var _data = {};

// fetch exchange data
$.getJSON('exchange_data.json', function (data) {
  Vue.set(app, 'updateDate', data.modified_date);
  _data = data;
  calculate();
});

function calculate() {
  var currency = app.currency || 'STEEM';
  var amount = app.amount || 0;
  var results = [];

  results.push(calcSteemToKRW(currency, amount, 'Poloniex -> Bithumb', 'poloniex', 'bithumb'));
  results.push(calcSteemToKRW(currency, amount, 'Poloniex -> Korbit', 'poloniex', 'korbit'));
  results.push(calcSteemToKRW(currency, amount, 'Poloniex -> Coinone', 'poloniex', 'coinone'));
  results.push(calcSteemToKRW(currency, amount, 'Bittrex -> Bithumb', 'bittrex', 'bithumb'));
  results.push(calcSteemToKRW(currency, amount, 'Bittrex -> Korbit', 'bittrex', 'korbit'));
  results.push(calcSteemToKRW(currency, amount, 'Bittrex -> Coinone', 'bittrex', 'coinone'));

  var bestPrice = 0;
  var bestResult = results[0];
  results.forEach(function (x) {
    if (x.price <= bestPrice)
      return;
    bestPrice = x.price;
    bestResult = x;
  });
  bestResult.best = true;

  Vue.set(app, 'results', results);
}

function calcSteemToKRW(currency, amount, methodName, source, dest) {
  var srcData = _data[source];
  var dstData = _data[dest];

  // Constants for source 
  var srcBtcRate = srcData[getSourceBtcRateKey(currency)];
  var srcTradingFee_per = srcData.trading_fee_per;
  var srcTransferFee_btc = srcData.transfer_fee_btc;

  // Calculation
  var src_btc = amount * srcBtcRate * (1 - srcTradingFee_per)

  // Constants for destination
  var dstKrwRate = dstData.btc_krw;
  var dstTradingFee_per = dstData.trading_fee_per;
  var dstWithdrawFee_krw = dstData.withdraw_fee_krw;

  // Calculation
  var dst_btc = src_btc - srcTransferFee_btc;
  var dst_krw = dst_btc * dstKrwRate * (1 - dstTradingFee_per);

  var final_krw = dst_krw - dstWithdrawFee_krw;

  return {
    method: methodName,
    price: Math.round(final_krw),
    highlight: false
  };
}

function getSourceBtcRateKey(currency) {
  if (currency === 'SBD')  
    return 'btc_sbd';
  return 'btc_steem';
}
