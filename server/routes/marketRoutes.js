const express = require("express");

const {
  getMarketData,
  createAnalysis,
  getAnalysisHistory,
  getMaxPainHistory,
  deleteAnalysis,
  clearAnalysisHistory,
  saveManualMarketData,
  clearManualMarketData,
} = require("../controllers/marketController");

const router = express.Router();

router.get("/options", getMarketData);

router.post("/analysis", createAnalysis);

router.post("/manual-data", saveManualMarketData);

router.delete("/manual-data", clearManualMarketData);

router.get("/history", getAnalysisHistory);

router.get("/max-pain-history", getMaxPainHistory);

router.delete("/history", clearAnalysisHistory);

router.delete("/history/:id", deleteAnalysis);

module.exports = router;
