// Scheduler for Google Apps Script
// Public Properties
var USER = 'appetizermonster';
var REPO = 'steem2krw-data';
var PATH = 'exchange_data.json';

// Main code
function updateData() {
  var poloniex = fetchFromPoloniex();
  var bittrex = fetchFromBittrex();
  var bithumb = fetchFromBithumb();
  var korbit = fetchFromKorbit();
  var coinone = fetchFromCoinone();

  var data = JSON.parse(fetchGithubFile(USER, REPO, PATH));
  data.poloniex = overwriteObject(data.poloniex, poloniex);
  data.bittrex = overwriteObject(data.bittrex, bittrex);
  data.bithumb = overwriteObject(data.bithumb, bithumb);
  data.korbit = overwriteObject(data.korbit, korbit);
  data.coinone = overwriteObject(data.coinone, coinone);
  data.modified_date = new Date().toISOString();

  var content = JSON.stringify(data, null, 2);
  updateGithubFile(USER, ACCESS_TOKEN, REPO, PATH, content, 'Updated by Steem2KRW Apps Script');
  Logger.log(content);
}


// Codes for exchanges API
function fetchFromPoloniex() {
  var body = getJson('https://poloniex.com/public?command=returnTicker');
  return {
    btc_steem: body.BTC_STEEM.last,
    btc_sbd: body.BTC_SBD.last
  };
}

function fetchFromBittrex() {
  var steemBody = getJson('https://bittrex.com/api/v1.1/public/getticker?market=BTC-STEEM');
  var sbdBody = getJson('https://bittrex.com/api/v1.1/public/getticker?market=BTC-SBD');
  return {
    btc_steem: steemBody.result.Last.toString(),
    btc_sbd: sbdBody.result.Last.toString()
  };
}

function fetchFromBithumb() {
  var body = getJson('https://api.bithumb.com/public/ticker/BTC');
  return {
    btc_krw: body.data.sell_price
  };
}

function fetchFromKorbit() {
  var body = getJson('https://api.korbit.co.kr/v1/ticker?currency_pair=btc_krw');
  return {
    btc_krw: body.last
  };
}

function fetchFromCoinone() {
  var body = getJson('https://api.coinone.co.kr/ticker/?currency=btc');
  return {
    btc_krw: body.last
  };
}


// Utilities
function getJson(url) {
  return JSON.parse(UrlFetchApp.fetch(url).getContentText());
}

function overwriteObject(source, target) {
  for (var key in target) {
    source[key] = target[key];
  }
  return source;
}


// Codes for manipulating Github files
function fetchGithubFile(user, repo, path) {
  var url = 'https://raw.githubusercontent.com/' + user + '/' + repo + '/master/' + path + '?dummy=' + Math.random();
  var res = UrlFetchApp.fetch(url);
  return res.getContentText();
}

function updateGithubFile(user, token, repo, path, content, message) {
  var url = 'https://api.github.com/repos/' + user + '/' + repo + '/contents/' + path;
  var headers = {
    Authorization: 'Basic ' + Utilities.base64Encode(user + ':' + token)
  };

  // fetch file
  var getRes = UrlFetchApp.fetch(url, {
    headers: headers
  });
  var body = JSON.parse(getRes.getContentText());
  var fileSha = body.sha;

  // update file
  var payload = {
    message: message,
    content: Utilities.base64Encode(content),
    sha: fileSha
  };
  var putRes = UrlFetchApp.fetch(url, {
    contentType: 'application/json',
    method: 'put',
    payload: JSON.stringify(payload),
    headers: headers
  });

  Logger.log(putRes.getContentText());
}