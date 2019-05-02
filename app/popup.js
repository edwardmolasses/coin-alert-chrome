'use strict';

// elements
let alertOffBtn = document.getElementById('popup-alert-off-btn');
let alertAddBtn = document.getElementById('popup-alert-form-add-btn');
let alertChartBtn = document.getElementById('popup-alert-chart-btn');
let alertBuyBtn = document.getElementById('popup-alert-buy-btn');
let alertCurrentPriceRefreshBtn = document.getElementById('popup-alert-current-price-refresh-btn');
let alertCurrentPrice = document.getElementById('popup-alert-current-price');
let currentPriceContainer = document.getElementById('popup-alert-current-price-container');
let alertPriceMessage = document.getElementById('popup-alert-price-message');
let alertFormPriceInput = document.getElementById('popup-alert-form-add-input-price');
let alertStatusMessageText = document.getElementById('popup-alert-status-message');
let alertNoAlertSet = document.getElementById('popup-alert-no-alert-msg');
let alertSaveMessagePrice = document.getElementById('popup-alert-price');
let alertPriceMessageDirectionText = document.getElementById('popup-alert-price-direction');
let alertPriceMessageDirectionAboveText = document.getElementById('popup-alert-price-direction-above');
let alertPriceMessageDirectionBelowText = document.getElementById('popup-alert-price-direction-below');
let buyBtnCoinText = document.getElementById('buy-btn-label-coin');

// variables
const appNameStr = "CoinAlert";
const coinAlertCoin = "iota";
const coinAlertBaseCurrency = "usd";
const coinGeckoPriceAPI = `https://api.coingecko.com/api/v3/simple/price?ids=${coinAlertCoin}&vs_currencies=usd`;
const buyIotaDefaultUrl = 'https://www.binance.com/?ref=17037537';
const buyIotaEuroUrl = 'https://www.binance.je/?ref=35052042';
const buyIotaEuroBtnText = 'CRYPTO';
const currentPriceDecimalPlaces = 5;
const badgePriceDecimalPlaces = 2;
const intervalCheckInSeconds = 1;
let buyIotaUrl = buyIotaDefaultUrl;
let currentPriceFull = false;
let alertPriceFull = false;
let currentPriceIntervalId = false;

const messageStrings = {
  mustBeNonZero: 'Alert must be a non-zero number'
};
const showElement = function(element) {
  element.style.display = '';
};
const hideElement = function(element) {
  element.style.display = 'none';
};
const setAbovePriceDirectionText = function() {
  showElement(alertPriceMessageDirectionAboveText);
  hideElement(alertPriceMessageDirectionBelowText);
};
const setBelowPriceDirectionText = function() {
  showElement(alertPriceMessageDirectionBelowText);
  hideElement(alertPriceMessageDirectionAboveText);
};
const setAlertFormPriceInput = function(price) {
  alertFormPriceInput.value = price;
};
const resetAlert = function() {
  hideElement(alertPriceMessage);
  hideElement(alertOffBtn);
  showElement(alertNoAlertSet);
  showElement(alertStatusMessageText);
  chrome.runtime.sendMessage({ alertOff: true });
};
const prefixObjectStr = function(str) {
  return `${coinAlertCoin}${appNameStr}${str}`;
};
const setAlert = function(alertPrice, directionToPrice) {
  let storageSettings = {};
  storageSettings[prefixObjectStr('Price')] = alertPrice;
  storageSettings[prefixObjectStr('DirectionToPrice')] = directionToPrice;
  storageSettings[prefixObjectStr('Triggered')] = false;
  chrome.storage.sync.set(storageSettings);
  // send new alert price to background script & switch alert off
  chrome.runtime.sendMessage({
    alertPrice: alertPrice,
    directionToPrice: directionToPrice,
    alertOff: true
  });
  showElement(alertPriceMessage);
  hideElement(alertOffBtn);
};
const setAlertPrice = function(price) {
  alertSaveMessagePrice.innerHTML = price;
  alertStatusMessageText.innerHTML = "";
  hideElement(alertStatusMessageText);
  hideElement(alertNoAlertSet);
};
const setCurrentCoinPrice = function(currentPrice) {
  // show long form current price
  if (!!currentPrice) {
    alertCurrentPrice.innerHTML = `${currentPrice}`;
    showElement(currentPriceContainer);
  } else {
    hideElement(currentPriceContainer);
  }

  // fill input with current price if there is no alert price set
  chrome.storage.sync.get([prefixObjectStr('Price')], function(data) {
    const alertPrice = data[prefixObjectStr('Price')];

    if (!!!alertPrice && !!!alertFormPriceInput.value) {
      setAlertFormPriceInput(currentPrice);
    }
  });
  currentPriceFull = currentPrice;

  return currentPrice;
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
const isIpAddress = function (str) {
  const splitStrArr = str.split('.');
  const digitFirst = parseInt(splitStrArr[0]);
  const digitSecond = parseInt(splitStrArr[1]);
  const digitThird = parseInt(splitStrArr[2]);
  const digitFourth = parseInt(splitStrArr[3]);

  if (!isNaN(digitFirst) &&
    !isNaN(digitSecond) &&
    !isNaN(digitThird) &&
    !isNaN(digitFourth)) {
    if ((digitFirst >= 0 && digitFirst <= 256) &&
      (digitSecond >= 0 && digitSecond <= 256) &&
      (digitThird >= 0 && digitThird <= 256) &&
      (digitFourth >= 0 && digitFourth <= 256)) {
      return true;
    }
  }

  return false;
};
const parseCoinGeckoPriceObject = function(jsonObj) {
  return parseFloat(jsonObj[coinAlertCoin][coinAlertBaseCurrency]);
};

// initialize elements
hideElement(alertOffBtn);
hideElement(alertStatusMessageText);
hideElement(alertNoAlertSet);
alertFormPriceInput.focus();
alertFormPriceInput.select();

// set buy coin referral url with user country
fetch('http://jsonip.com', {
  headers : {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})
  .then(response => response.clone().json())
  .then(jsonIp => {
    if (isIpAddress(jsonIp.ip)) {
      fetch(`http://api.ipstack.com/${jsonIp.ip}?access_key=92337a96b7b8589d890d5a36870ff317`)
        .then(response => response.json())
        .then(json => {
          let isClientEU = json.continent_code === 'EU';
          if (isClientEU) {
            buyIotaUrl = buyIotaEuroUrl;
            buyBtnCoinText.innerHTML = buyIotaEuroBtnText;
          }
        });
    }
  });

// initialize popup with current alert settings
chrome.storage.sync.get([prefixObjectStr('CurrentPrice'), prefixObjectStr('Price'), prefixObjectStr('DirectionToPrice'), prefixObjectStr('Triggered')], function(data) {
  const alertPrice = data[prefixObjectStr('Price')];
  const directionToPrice = data[prefixObjectStr('DirectionToPrice')];
  const alertTriggered = data[prefixObjectStr('Triggered')];

  setAlertPrice(alertPrice);
  if (directionToPrice === 'up') setAbovePriceDirectionText();
  if (directionToPrice === 'down') setBelowPriceDirectionText();
  if (alertTriggered) {
    showElement(alertOffBtn);
  }
  if (!!alertPrice) {
    setAlertFormPriceInput(alertPrice);
  } else {
    resetAlert();
  }

  // initialize popup with current coin price
  fetch(coinGeckoPriceAPI, {
    headers : {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })
    .then(response => response.json())
    .then(json => {
      setCurrentCoinPrice(parseCoinGeckoPriceObject(json));
      // send current price to background script so badge can be updated on click
      chrome.runtime.sendMessage({ currentPrice: parseCoinGeckoPriceObject(json) });
    });
});

// click current price event
alertCurrentPrice.addEventListener('click', function() {
  if (!isNaN(currentPriceFull)) {
    alertFormPriceInput.value = parseFloat(currentPriceFull);
  }
});

// click alert price event
alertSaveMessagePrice.addEventListener('click', function() {
  const currentPrice = parseFloat(alertSaveMessagePrice.innerHTML);

  if (!isNaN(currentPrice)) {
    alertFormPriceInput.value = parseFloat(alertSaveMessagePrice.innerHTML);
  }
});

// link from chart button
alertChartBtn.addEventListener('click', function() {
  chrome.tabs.create({ url: `https://coinmarketcap.com/currencies/${coinAlertCoin}/` });
});

// link from exchange buy button
alertBuyBtn.addEventListener('click', function() {
  chrome.tabs.create({ url: buyIotaUrl });
});

// stop alert, button click event
alertOffBtn.addEventListener('click', function() {
  let storageSettings = {};
  storageSettings[prefixObjectStr('Price')] = false;
  storageSettings[prefixObjectStr('DirectionToPrice')] = false;
  storageSettings[prefixObjectStr('Triggered')] = false;
  chrome.storage.sync.set(storageSettings);
  resetAlert();
});

// set current price in popup on price change in background script
chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
  if (!!response.currentBackgroundPrice) {
    setCurrentCoinPrice(response.currentBackgroundPrice);
  }
});

// show the alert panel in the popup if the alert has been triggered in background script
chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
  if (!!response.alertTriggered && response.alertTriggered) {
    showElement(alertOffBtn);
  }
});

// set alert button event
alertAddBtn.addEventListener('click', function() {
  const alertPrice = parseFloat(alertFormPriceInput.value);
  const isCurrentSameAsAlertPrice = Math.abs(currentPriceFull - alertPrice) < Number.EPSILON;

  // if input is a valid number
  if (!isNaN(alertPrice) && alertPrice > 0) {
    const isAlertPriceHigher = isCurrentSameAsAlertPrice ? true : (alertPrice > currentPriceFull);
    const directionToPrice = isAlertPriceHigher ? 'up' : 'down';

    setAlertPrice(alertPrice);
    isAlertPriceHigher ? setAbovePriceDirectionText() : setBelowPriceDirectionText();
    setAlert(alertPrice, directionToPrice);
    hideElement(alertStatusMessageText);

    // if input is not valid
  } else {
    alertStatusMessageText.innerHTML = messageStrings.mustBeNonZero;
    showElement(alertStatusMessageText);
    setAlertFormPriceInput("");
  }
}, false);
