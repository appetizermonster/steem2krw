'use strict';

var VERSION = '0.0.2';

// steem2krw-data
var JSON_URL = '../steem2krw-data/exchange_data.json';
var isLocalHost = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
if (isLocalHost)
  JSON_URL = 'exchange_data.example.json';

var app = new Vue({
  el: '#app',
  data: {
    version: VERSION,
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
$.getJSON(JSON_URL, function (data) {
  Vue.set(app, 'updateDate', data.modified_date);
  _data = data;
  calculate();
});

var s2kConvFuncs = [
  wrapSteemToKRW('poloniex', 'bithumb'),
  wrapSteemToKRW('poloniex', 'korbit'),
  wrapSteemToKRW('poloniex', 'coinone'),
  wrapSteemToKRW('bittrex', 'bithumb'),
  wrapSteemToKRW('bittrex', 'korbit'),
  wrapSteemToKRW('bittrex', 'coinone')
];

var k2sConvFuncs = [
  wrapKRWToSteem('bithumb', 'poloniex'),
  wrapKRWToSteem('bithumb', 'bittrex'),
  wrapKRWToSteem('korbit', 'poloniex'),
  wrapKRWToSteem('korbit', 'bittrex'),
  wrapKRWToSteem('coinone', 'poloniex'),
  wrapKRWToSteem('coinone', 'bittrex')
];

function calculate() {
  var isKRW2Steem = (app.currency.indexOf('KRW') >= 0);
  var isSteemDollars = (app.currency.indexOf('SBD') >= 0);

  var convFuncs = isKRW2Steem ? k2sConvFuncs : s2kConvFuncs;
  var steemCurrency = isSteemDollars ? 'SBD' : 'STEEM';

  var results = [];
  var amount = app.amount || 0;
  for (var i = 0; i < convFuncs.length; ++i) {
    var convFunc = convFuncs[i];
    results.push(convFunc(steemCurrency, amount));
  }

  var bestPrice = -999999;
  var bestResult = results[0];
  results.forEach(function (x) {
    if (x.rawPrice <= bestPrice)
      return;
    bestPrice = x.rawPrice;
    bestResult = x;
  });
  bestResult.highlight = true;

  Vue.set(app, 'results', results);
}

function wrapSteemToKRW(source, dest) {
  var method = _capitalize(source) + ' -> ' + _capitalize(dest);
  return function (srcCurrency, amount) {
    var finalKrw = calcSteemToKRW(srcCurrency, amount, source, dest);
    return {
      method: method,
      price: finalKrw.toLocaleString() + ' 원',
      rawPrice: finalKrw,
      highlight: false
    }
  };
}

function wrapKRWToSteem(source, dest) {
  var method = _capitalize(source) + ' -> ' + _capitalize(dest);
  return function (destCurrency, amount) {
    var finalSteem = calcKRWToSteem(destCurrency, amount, source, dest);
    return {
      method: method,
      price: finalSteem.toLocaleString() + ' ' + destCurrency,
      rawPrice: finalSteem,
      highlight: false
    }
  };
}

function calcSteemToKRW(srcCurrency, amount, source, dest) {
  var srcData = _data[source];
  var dstData = _data[dest];

  // Constants for source 
  var srcBtcRate = _getSteemBtcRate(srcData, srcCurrency);
  var srcTradingFee_per = srcData.trading_fee_per;
  var srcTransferFee_btc = srcData.transfer_fee_btc;

  // Calculation
  var src_btc = amount * srcBtcRate * (1 - srcTradingFee_per);

  // Constants for destination
  var dstKrwRate = dstData.btc_krw;
  var dstTradingFee_per = dstData.trading_fee_per;
  var dstWithdrawFee_krw = dstData.withdraw_fee_krw;

  // Calculation
  var dst_btc = src_btc - srcTransferFee_btc;
  var dst_krw = dst_btc * dstKrwRate * (1 - dstTradingFee_per);

  var final_krw = dst_krw - dstWithdrawFee_krw;
  return Math.round(final_krw);
}

function calcKRWToSteem(destCurrency, amount, source, dest) {
  var srcData = _data[source];
  var dstData = _data[dest];

  // Constants for source
  var srcKrwRate = srcData.btc_krw;
  var srcTradingFee_per = srcData.trading_fee_per;
  var srcTransferFee_btc = srcData.transfer_fee_btc;

  // Calculation
  var src_btc = amount / srcKrwRate * (1 - srcTradingFee_per);

  // Constants for destination
  var dstBtcRate = _getSteemBtcRate(dstData, destCurrency);
  var dstTradingFee_per = dstData.trading_fee_per;

  var dst_btc = src_btc - srcTransferFee_btc;
  var dst_steem = dst_btc / dstBtcRate * (1 - dstTradingFee_per); // Steem or SBD

  return dst_steem;
}

function _capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function _getSteemBtcRate(data, currency) {
  if (currency === 'SBD')
    return data.btc_sbd;
  return data.btc_steem;
}