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
const buyIotaDefaultUrl = 'https://www.binance.com/?ref=17037537';
const buyIotaEuroUrl = 'https://www.binance.je/?ref=35052042';
const buyIotaEuroBtnText = 'CRYPTO';
const currentPriceDecimalPlaces = 5;
const badgePriceDecimalPlaces = 2;
const intervalCheckInSeconds = 4;
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
const setAlert = function(alertPrice, directionToPrice) {
  chrome.storage.sync.set({
    coinAlertAlertPrice: alertPrice,
    directionToPrice: directionToPrice,
    alertTriggered: false
  });
  // send new alert price to background script
  chrome.runtime.sendMessage({
    alertPrice: alertPrice,
    directionToPrice: directionToPrice
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
  chrome.storage.sync.get(['coinAlertAlertPrice'], function(data) {
    if (!!!data.coinAlertAlertPrice && !!!alertFormPriceInput.value) {
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

// initialize elements
hideElement(alertOffBtn);
hideElement(alertStatusMessageText);
hideElement(alertNoAlertSet);
alertFormPriceInput.focus();
alertFormPriceInput.select();

// set buy coin referral url with user country
fetch('http://gd.geobytes.com/GetCityDetails')
  .then(response => response.json())
  .then(jsonIp => {
    fetch(`http://api.ipstack.com/${jsonIp.geobytesipaddress}?access_key=92337a96b7b8589d890d5a36870ff317`)
      .then(response => response.json())
      .then(json => {
        let isClientEU = json.continent_code === 'EU';
        if (isClientEU) {
          buyIotaUrl = buyIotaEuroUrl;
          buyBtnCoinText.innerHTML = buyIotaEuroBtnText;
        }
      });
  });

// initialize popup with current alert settings
chrome.storage.sync.get(['coinAlertCurrentPrice', 'coinAlertAlertPrice', 'directionToPrice', 'alertTriggered'], function(data) {
  setAlertPrice(data.coinAlertAlertPrice);
  if (data.directionToPrice === 'up') setAbovePriceDirectionText();
  if (data.directionToPrice === 'down') setBelowPriceDirectionText();
  if (data.alertTriggered) {
    showElement(alertOffBtn);
  }
  if (!!data.coinAlertAlertPrice) {
    setAlertFormPriceInput(data.coinAlertAlertPrice);
  } else {
    resetAlert();
  }

  // initialize popup with current coin price
  fetch(buildCoinServerUrl('oneFromName?name=IOTA'))
    .then(response => response.json())
    .then(json => {
      setCurrentCoinPrice(parseFloat(json.price));
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
  chrome.tabs.create({ url: 'https://coinmarketcap.com/currencies/iota/' });
});

// link from exchange buy button
alertBuyBtn.addEventListener('click', function() {
  chrome.tabs.create({ url: buyIotaUrl });
});

// stop alert, button click event
alertOffBtn.addEventListener('click', function() {
  chrome.storage.sync.set({
    coinAlertAlertPrice: false,
    directionToPrice: false,
    alertTriggered: false
  });
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