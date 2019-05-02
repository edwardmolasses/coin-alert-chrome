'use strict';

const appNameStr = "CoinAlert";
const coinAlertCoin = "iota";
const coinAlertCoinSymbol = "IOTA";
const coinAlertBaseCurrency = "usd";
const coinmarketcapApiKey = 'b606f249-ad00-49f5-8a21-2dcb8fe903ac';
const gainsBadgeColour = '#30ad63';
const defaultBadgeColour = '#000';
const lossBadgeColour = '#be3a31';
const defaultBadgeDecimalPlaces = 2;
const intervalPriceCheckInMinutes = 1;
const intervalGainCheckInMinutes = 720;
const coinGeckoPriceAPI = `https://api.coingecko.com/api/v3/simple/price?ids=${coinAlertCoin}&vs_currencies=usd`;

let lastBadgeColour = false;
let badgeAlertSwitch = false;
let alertIntervalId = false;
let currentPrice = false;
let alertPrice = false;
let directionToPrice = false;
let alertTriggered = false;

const setBadgeAlert = function() {
  alertIntervalId = window.setInterval(function() {
    let intervalColor = badgeAlertSwitch ? '#2698fc' : '#FCB514';
    chrome.browserAction.setBadgeBackgroundColor({color: intervalColor});
    badgeAlertSwitch = !badgeAlertSwitch;
  }, 1000);
};
const stopAlert = function () {
  window.clearInterval(alertIntervalId);
  alertIntervalId = false;
  if (lastBadgeColour) {
    chrome.browserAction.setBadgeBackgroundColor({ color: lastBadgeColour });
  } else {
    setGainLossBadgeColour();
  }
  alertTriggered = false;
};
const setGainLossBadgeColour = function() {
  if (!alertTriggered) {
    fetch(buildCoinServerUrl(`priceChange?symbol=${coinAlertCoinSymbol}USDT`), {
      headers : {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
      .then(response => response.json())
      .then(jsonPriceChange => {
        lastBadgeColour = parseFloat(jsonPriceChange) > 0 ? gainsBadgeColour : lossBadgeColour;
        chrome.browserAction.setBadgeBackgroundColor({ color: lastBadgeColour });
      });
  }
};
const buildCoinServerUrl = function(postfix) {
  const hostDomain = 'chrome-coin-alert';
  const hostSubdomain = 'glitch.me';
  const minServerNum = 1;
  const maxServerNum = 5;
  //let randomServerNum = Math.floor(Math.random() * (+(maxServerNum + 1) - +minServerNum)) + +minServerNum;
  const randomServerNum = 4;

  return `https://${hostDomain}-${randomServerNum}.${hostSubdomain}/${postfix}`;
};
const prefixObjectStr = function(str) {
  return `${coinAlertCoin}${appNameStr}${str}`;
};
const triggerAlert = function() {
  let storageSettings = {};

  alertTriggered = true;
  storageSettings[prefixObjectStr('Triggered')] = alertTriggered;
  chrome.storage.sync.set(storageSettings);
  chrome.runtime.sendMessage({ alertTriggered: alertTriggered });
};
const parseCoinGeckoPriceObject = function(jsonObj) {
  return parseFloat(jsonObj[coinAlertCoin][coinAlertBaseCurrency]);
};
const prettifyPrice = function(uglyPrice) {
  if (uglyPrice >= 1000000000) {
    return Math.sign(uglyPrice) * ((Math.abs(uglyPrice) / 1000000000).toFixed(2));
  }
  if (uglyPrice >= 100000000) {
    return parseInt(Math.sign(uglyPrice) * (Math.abs(uglyPrice) / 1000000).toFixed(1));
  }
  if (uglyPrice >= 1000000) {
    return Math.sign(uglyPrice) * ((Math.abs(uglyPrice) / 1000000).toFixed(2));
  }
  if (uglyPrice >= 100000) {
    return parseInt(Math.sign(uglyPrice) * (Math.abs(uglyPrice) / 1000).toFixed(1));
  }
  if (uglyPrice >= 1000) {
    return Math.sign(uglyPrice) * ((Math.abs(uglyPrice) / 1000).toFixed(2));
  }
  if (uglyPrice < 1) {
    return Math.abs(uglyPrice.toFixed(2));
  }
  if (uglyPrice < 0.001 && uglyPrice > 0.00009) {
    return '000' + parseInt(uglyPrice * 10000);
  }

  return Math.sign(uglyPrice) * Math.abs(uglyPrice);
};
const shouldTriggerAlert = function(directionToPriceToTest, alertPriceToTest, currentPriceToTest) {
  // if alertPriceToTest < currentPriceToTest, set off alert
  if (directionToPriceToTest === 'up') {
    if (alertPriceToTest < currentPriceToTest) {
      return true;
    }
  }
  // if alertPriceToTest > currentPriceToTest, set off alert
  else if (directionToPriceToTest === 'down') {
    if (alertPriceToTest > currentPriceToTest) {
      return true;
    }
  }

  return false;
};

// set initial badge color
chrome.browserAction.setBadgeBackgroundColor({ color: defaultBadgeColour });
setGainLossBadgeColour();

// set initial badge price
fetch(coinGeckoPriceAPI, {
  headers : {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})
  .then(response => response.json())
  .then(responseJson => chrome.browserAction.setBadgeText({text:`${prettifyPrice(parseCoinGeckoPriceObject(responseJson))}`}));

// decide whether to turn alert on or off
// initialize alert variables
chrome.storage.sync.get([prefixObjectStr('CurrentPrice'), prefixObjectStr('Price'), prefixObjectStr('DirectionToPrice'), prefixObjectStr('Triggered')], function(data) {
  alertPrice = data[prefixObjectStr('Price')];
  directionToPrice = data[prefixObjectStr('DirectionToPrice')];
  alertTriggered = data[prefixObjectStr('Triggered')];
  currentPrice = data[prefixObjectStr('CurrentPrice')];
});
// set interval to check alert variables
window.setInterval(function() {
  // set or disable badge alert based on alert triggered flag
  if (alertTriggered && !alertIntervalId) {
    setBadgeAlert();
  }
  if (!alertTriggered) {
    stopAlert();
  }
}, 1000);

// reset alert state if alert was switched off in popup
chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
  if (!!response.alertOff && response.alertOff) {
    stopAlert();
    // get new alert price from popup whenever it is set
    if (!!response.alertPrice && !!response.directionToPrice) {
      alertPrice = response.alertPrice;
      directionToPrice = response.directionToPrice;
    } else {
      alertPrice = false;
      directionToPrice = false;
    }
  }
});

// change price badge and check alert trigger if popup sent us a new current price
chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
  if (!!response.currentPrice && response.currentPrice) {
    chrome.browserAction.setBadgeText({text:`${prettifyPrice(response.currentPrice)}`});
    if (shouldTriggerAlert(directionToPrice, alertPrice, response.currentPrice)) {
      triggerAlert();
    }
  }
});

// check coin price on an interval
window.setInterval(function() {
  fetch(coinGeckoPriceAPI, {
    headers : {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })
    .then(response => response.json())
    .then(json => {
      currentPrice = parseFloat(parseCoinGeckoPriceObject(json));
      chrome.runtime.sendMessage({ currentBackgroundPrice: currentPrice });

      if (shouldTriggerAlert(directionToPrice, alertPrice, currentPrice)) {
        triggerAlert();
      }
      chrome.browserAction.setBadgeText({text:`${prettifyPrice(currentPrice)}`});
    });
}, intervalPriceCheckInMinutes * 60 * 1000);

// check coin price on an interval
window.setInterval(function() {
  setGainLossBadgeColour();
}, intervalGainCheckInMinutes * 60 * 1000);
