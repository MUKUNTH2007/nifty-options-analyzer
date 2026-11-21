const generateSampleMarketData = () => {
  const spotPrice = 26000;

  const strikes = [
    25800, 25850, 25900, 25950, 26000,
    26050, 26100, 26150, 26200,
  ];

  const optionChain = strikes.map((strike, index) => ({
    strikePrice: strike,
    call: {
      oi: 120000 + index * 12500,
      changeInOi: (index - 4) * 1800,
      ltp: Math.max(10, 240 - index * 24),
    },
    put: {
      oi: 90000 + (8 - index) * 14000,
      changeInOi: (4 - index) * 2200,
      ltp: Math.max(10, 35 + index * 25),
    },
  }));

  return {
    index: "NIFTY 50",
    spotPrice,
    optionChain,
    source: "SAMPLE DATA",
    isLive: false,
    timestamp: new Date(),
  };
};

module.exports = generateSampleMarketData;
