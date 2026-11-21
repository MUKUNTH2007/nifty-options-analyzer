const Analysis = require("../models/Analysis");

const generateSampleMarketData = require("../services/sampleMarketData");

const {
  setManualMarketData,
  getManualMarketData,
  clearManualMarketData: resetManualMarketData,
} = require("../services/manualMarketData");

const getActiveMarketData = () => {
  return getManualMarketData() || generateSampleMarketData();
};

const getMarketData = (req, res) => {
  const data = getActiveMarketData();

  res.json({
    success: true,
    data,
  });
};

const saveManualMarketData = (req, res) => {
  try {
    const { spotPrice, optionChain } = req.body;

    if (
      typeof spotPrice !== "number" ||
      !Number.isFinite(spotPrice) ||
      spotPrice <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Spot price must be a positive number.",
      });
    }

    if (!Array.isArray(optionChain) || optionChain.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one option-chain strike.",
      });
    }

    const strikes = new Set();

    for (const item of optionChain) {
      if (
        !item ||
        typeof item.strikePrice !== "number" ||
        !Number.isFinite(item.strikePrice) ||
        item.strikePrice <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Every strike price must be a positive number.",
        });
      }

      if (strikes.has(item.strikePrice)) {
        return res.status(400).json({
          success: false,
          message: "Duplicate strike prices are not allowed.",
        });
      }

      strikes.add(item.strikePrice);

      for (const side of ["call", "put"]) {
        const option = item[side];

        if (!option) {
          return res.status(400).json({
            success: false,
            message: `Missing ${side} data for strike ${item.strikePrice}.`,
          });
        }

        if (
          !Number.isInteger(option.oi) ||
          option.oi < 0 ||
          !Number.isInteger(option.changeInOi)
        ) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${side} open interest values for strike ${item.strikePrice}.`,
          });
        }

        if (
          typeof option.ltp !== "number" ||
          !Number.isFinite(option.ltp) ||
          option.ltp < 0
        ) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${side} LTP for strike ${item.strikePrice}.`,
          });
        }
      }
    }

    const cleanOptionChain = optionChain.map((item) => ({
      strikePrice: item.strikePrice,
      call: {
        oi: item.call.oi,
        changeInOi: item.call.changeInOi,
        ltp: item.call.ltp,
      },
      put: {
        oi: item.put.oi,
        changeInOi: item.put.changeInOi,
        ltp: item.put.ltp,
      },
    }));

    const data = setManualMarketData({
      spotPrice,
      optionChain: cleanOptionChain,
    });

    res.status(200).json({
      success: true,
      message: "Manual market data saved successfully.",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const clearManualMarketData = (req, res) => {
  resetManualMarketData();

  res.json({
    success: true,
    message: "Manual data cleared. Sample data is now active.",
  });
};

const createAnalysis = async (req, res) => {
  try {
    const marketData = getActiveMarketData();

    const totalCallOI = marketData.optionChain.reduce(
      (total, item) => total + item.call.oi,
      0
    );

    const totalPutOI = marketData.optionChain.reduce(
      (total, item) => total + item.put.oi,
      0
    );

    const pcr =
      totalCallOI === 0
        ? null
        : Number((totalPutOI / totalCallOI).toFixed(2));

    const atmStrike = marketData.optionChain.reduce((closest, item) =>
      Math.abs(item.strikePrice - marketData.spotPrice) <
      Math.abs(closest.strikePrice - marketData.spotPrice)
        ? item
        : closest
    );

    const maxPain = marketData.optionChain.reduce(
      (bestCandidate, candidate) => {
        const totalLoss = marketData.optionChain.reduce((loss, item) => {
          const callPayout =
            Math.max(candidate.strikePrice - item.strikePrice, 0) *
            item.call.oi;

          const putPayout =
            Math.max(item.strikePrice - candidate.strikePrice, 0) *
            item.put.oi;

          return loss + callPayout + putPayout;
        }, 0);

        if (!bestCandidate || totalLoss < bestCandidate.totalLoss) {
          return {
            strikePrice: candidate.strikePrice,
            totalLoss,
          };
        }

        return bestCandidate;
      },
      null
    );

    const maxPainStrike = maxPain.strikePrice;

    const maxPainDistance = Math.abs(
      maxPainStrike - marketData.spotPrice
    );

    let outlook;
    let summary;

    if (pcr === null) {
      outlook = "UNAVAILABLE";
      summary = "PCR cannot be calculated because total Call OI is zero.";
    } else if (pcr > 1.2) {
      outlook = "BULLISH";
      summary = `${marketData.source} PCR indicates relatively higher put open interest.`;
    } else if (pcr < 0.8) {
      outlook = "BEARISH";
      summary = `${marketData.source} PCR indicates relatively higher call open interest.`;
    } else {
      outlook = "NEUTRAL";
      summary = `${marketData.source} PCR is within the neutral range.`;
    }

    const analysis = await Analysis.create({
      index: marketData.index,
      spotPrice: marketData.spotPrice,
      totalCallOI,
      totalPutOI,
      pcr,
      outlook,
      summary,
      maxPainStrike,
      atmStrike: atmStrike.strikePrice,
      maxPainDistance,
      source: marketData.source,
      isLive: false,
    });

    res.status(201).json({
      success: true,
      message: `${marketData.source} analysis created successfully.`,
      analysis,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAnalysisHistory = async (req, res) => {
  try {
    const history = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMaxPainHistory = async (req, res) => {
  try {
    const history = await Analysis.find({
      maxPainStrike: { $exists: true, $ne: null },
    })
      .select(
        "spotPrice maxPainStrike atmStrike maxPainDistance source isLive createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteAnalysis = async (req, res) => {
  try {
    const deletedAnalysis = await Analysis.findByIdAndDelete(req.params.id);

    if (!deletedAnalysis) {
      return res.status(404).json({
        success: false,
        message: "Analysis not found",
      });
    }

    res.json({
      success: true,
      message: "Analysis deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const clearAnalysisHistory = async (req, res) => {
  try {
    const result = await Analysis.deleteMany({});

    res.json({
      success: true,
      message: "Analysis history cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getMarketData,
  saveManualMarketData,
  clearManualMarketData,
  createAnalysis,
  getAnalysisHistory,
  getMaxPainHistory,
  deleteAnalysis,
  clearAnalysisHistory,
};
