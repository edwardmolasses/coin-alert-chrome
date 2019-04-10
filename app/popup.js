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

// variables
let currentPriceFull = false;
let alertPriceFull = false;
let currentPriceIntervalId = false;
const getCoinPriceUrl = 'https://chrome-coin-alert.glitch.me/oneFromName?name=IOTA';
const currentPriceDecimalPlaces = 5;
const badgePriceDecimalPlaces = 2;
const intervalCheckInSeconds = 4;
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
};
const setAlert = function(alertPrice, directionToPrice) {
  chrome.storage.sync.set({
    coinAlertAlertPrice: alertPrice,
    directionToPrice: directionToPrice,
    alertTriggered: false
  });
  showElement(alertPriceMessage);
  hideElement(alertOffBtn);
  console.log('setAlert');
};
const setAlertPrice = function(price) {
  alertSaveMessagePrice.innerHTML = price;
  alertStatusMessageText.innerHTML = "";
  hideElement(alertStatusMessageText);
  hideElement(alertNoAlertSet);
  console.log('setAlertPrice');
};
const setCurrentCoinPrice = function(currentPrice) {
  //const currentPriceTrunc = parseFloat(currentPrice.toFixed(currentPriceDecimalPlaces)).toString();

  // show long form current price
  if (!!currentPrice) {
    alertCurrentPrice.innerHTML = `${currentPrice}`;
    showElement(currentPriceContainer);
  } else {
    hideElement(currentPriceContainer);
  }

  // fill input with current price if there is no alert price set
  chrome.storage.sync.get(['coinAlertAlertPrice'], function(data) {
    if (!!!data.coinAlertAlertPrice) {
      setAlertFormPriceInput(currentPrice);
    }
  });
  currentPriceFull = currentPrice;

  return currentPrice;
};

// initialize elements
hideElement(alertOffBtn);
hideElement(alertStatusMessageText);
hideElement(alertNoAlertSet);
alertFormPriceInput.focus();
alertFormPriceInput.select();

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
  setCurrentCoinPrice(data.coinAlertCurrentPrice);
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
  chrome.tabs.create({ url: 'https://www.binance.com/?ref=17037537' });
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

currentPriceIntervalId = window.setInterval(function() {
  chrome.storage.sync.get(['coinAlertCurrentPrice', 'coinAlertAlertPrice', 'directionToPrice', 'alertTriggered'], function(data) {
    setCurrentCoinPrice(data.coinAlertCurrentPrice);
    if (data.alertTriggered) {
      showElement(alertOffBtn);
    }
  });
}, intervalCheckInSeconds * 1000);

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