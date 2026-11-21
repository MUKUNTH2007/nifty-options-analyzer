let manualMarketData = null;

const setManualMarketData = (data) => {
  manualMarketData = {
    index: "NIFTY 50",
    spotPrice: data.spotPrice,
    optionChain: data.optionChain,
    source: "MANUAL DATA",
    isLive: false,
    timestamp: new Date(),
  };

  return manualMarketData;
};

const getManualMarketData = () => manualMarketData;

const clearManualMarketData = () => {
  manualMarketData = null;
};

module.exports = {
  setManualMarketData,
  getManualMarketData,
  clearManualMarketData,
};
