const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    index: {
      type: String,
      default: "NIFTY 50",
    },
    spotPrice: Number,
    totalCallOI: Number,
    totalPutOI: Number,
    pcr: Number,
    outlook: String,
    summary: String,

    maxPainStrike: Number,
    atmStrike: Number,
    maxPainDistance: Number,

    source: {
      type: String,
      default: "SAMPLE DATA",
    },
    isLive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", analysisSchema);
