import { useEffect, useState } from "react";
import axios from "axios";
import {
  Activity,
  Crosshair,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Database,
  AlertCircle,
  Shield,
  Target,
  FileText,
  Info,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import "./App.css";

const API = "http://localhost:5001/api/market";

function App() {
  const [market, setMarket] = useState(null);
  const [history, setHistory] = useState([]);
  const [maxPainHistory, setMaxPainHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");
  const [manualSpotPrice, setManualSpotPrice] = useState("");
  const [manualRows, setManualRows] = useState([]);
  const [savingManualData, setSavingManualData] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [strikeSearch, setStrikeSearch] = useState("");
  const [optionFilter, setOptionFilter] = useState("ALL");
  const [minStrike, setMinStrike] = useState("");
  const [maxStrike, setMaxStrike] = useState("");
  const [sortBy, setSortBy] = useState("STRIKE_ASC");

  const filteredOptions = market
    ? market.optionChain.filter((item) => {
        const matchesSearch = String(item.strikePrice).includes(strikeSearch.trim());
        const matchesMin = minStrike === "" || item.strikePrice >= Number(minStrike);
        const matchesMax = maxStrike === "" || item.strikePrice <= Number(maxStrike);
        return matchesSearch && matchesMin && matchesMax;
      })
    : [];

  const exportOptionsCSV = () => {
    const headers = [
      "Strike Price",
      "Call OI",
      "Call Change OI",
      "Call LTP",
      "Put LTP",
      "Put Change OI",
      "Put OI",
    ];

    const rows = sortedOptions.map((item) => [
      item.strikePrice,
      item.call.oi,
      item.call.changeInOi,
      item.call.ltp,
      item.put.ltp,
      item.put.changeInOi,
      item.put.oi,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "optionlens-options-chain.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setStrikeSearch("");
    setOptionFilter("ALL");
    setMinStrike("");
    setMaxStrike("");
  };

  const sortedOptions = [...filteredOptions].sort((a, b) => {
    switch (sortBy) {
      case "STRIKE_DESC":
        return b.strikePrice - a.strikePrice;
      case "CALL_DESC":
        return b.call.oi - a.call.oi;
      case "CALL_ASC":
        return a.call.oi - b.call.oi;
      case "PUT_DESC":
        return b.put.oi - a.put.oi;
      case "PUT_ASC":
        return a.put.oi - b.put.oi;
      default:
        return a.strikePrice - b.strikePrice;
    }
  });



  const fetchData = async () => {
  try {
    setError("");

    const [marketResponse, historyResponse, maxPainResponse] =
      await Promise.all([
        axios.get(`${API}/options`),
        axios.get(`${API}/history`),
        axios.get(`${API}/max-pain-history`),
      ]);

    const activeMarket = marketResponse.data.data;
    setMarket(activeMarket);
    setManualSpotPrice(String(activeMarket.spotPrice));
    setManualRows(activeMarket.optionChain.map((item) => ({
      strikePrice: String(item.strikePrice),
      call: {
        oi: String(item.call.oi),
        changeInOi: String(item.call.changeInOi),
        ltp: String(item.call.ltp),
      },
      put: {
        oi: String(item.put.oi),
        changeInOi: String(item.put.changeInOi),
        ltp: String(item.put.ltp),
      },
    })));
    setLastUpdated(new Date());
    setHistory(historyResponse.data.history);
    setMaxPainHistory(maxPainResponse.data.history);
  } catch (err) {
    console.error("Fetch data failed:", err.response?.data || err.message);

    setError(
      "Unable to connect to the backend. Check whether your server is running on port 5001."
    );
  } finally {
    setLoading(false);
  }
};

  const updateManualRow = (index, side, field, value) => {
    setManualRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [side]: {
                ...row[side],
                [field]: value,
              },
            }
          : row
      )
    );
  };

  const updateManualStrike = (index, value) => {
    setManualRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, strikePrice: value } : row
      )
    );
  };

  const addManualRow = () => {
    const lastStrike = Number(
      manualRows[manualRows.length - 1]?.strikePrice || 0
    );

    setManualRows((current) => [
      ...current,
      {
        strikePrice: String(lastStrike + 50),
        call: { oi: "0", changeInOi: "0", ltp: "0" },
        put: { oi: "0", changeInOi: "0", ltp: "0" },
      },
    ]);
  };

  const removeManualRow = (index) => {
    setManualRows((current) =>
      current.filter((_, rowIndex) => rowIndex !== index)
    );
  };

  const saveManualData = async () => {
    try {
      setSavingManualData(true);
      setManualMessage("");
      setError("");

      const payload = {
        spotPrice: Number(manualSpotPrice),
        optionChain: manualRows.map((row) => ({
          strikePrice: Number(row.strikePrice),
          call: {
            oi: Number(row.call.oi),
            changeInOi: Number(row.call.changeInOi),
            ltp: Number(row.call.ltp),
          },
          put: {
            oi: Number(row.put.oi),
            changeInOi: Number(row.put.changeInOi),
            ltp: Number(row.put.ltp),
          },
        })),
      };

      const response = await axios.post(`${API}/manual-data`, payload);

      await fetchData();
      setManualMessage(response.data.message);
    } catch (err) {
      setManualMessage(
        err.response?.data?.message || "Unable to save manual data."
      );
    } finally {
      setSavingManualData(false);
    }
  };

  const resetManualData = async () => {
    try {
      setSavingManualData(true);
      setManualMessage("");
      setError("");

      const response = await axios.delete(`${API}/manual-data`);

      await fetchData();
      setManualMessage(response.data.message);
    } catch (err) {
      setManualMessage(
        err.response?.data?.message || "Unable to reset market data."
      );
    } finally {
      setSavingManualData(false);
    }
  };

  const generateAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError("");

      await axios.post(`${API}/analysis`);
      await fetchData();
    } catch (err) {
      setError("Unable to generate analysis. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshMarketData = async () => {
    try {
      setRefreshing(true);
      setError("");
      const response = await axios.get(`${API}/options`);
      const activeMarket = response.data.data;
      setMarket(activeMarket);
      setManualSpotPrice(String(activeMarket.spotPrice));
      setManualRows(activeMarket.optionChain.map((item) => ({
        strikePrice: String(item.strikePrice),
        call: {
          oi: String(item.call.oi),
          changeInOi: String(item.call.changeInOi),
          ltp: String(item.call.ltp),
        },
        put: {
          oi: String(item.put.oi),
          changeInOi: String(item.put.changeInOi),
          ltp: String(item.put.ltp),
        },
      })));
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Market refresh failed:", error.message);
      setError("Unable to refresh market data.");
    } finally {
      setRefreshing(false);
    }
  };

  const deleteAnalysis = async (id) => {
    if (!window.confirm("Delete this analysis?")) return;

    try {
      await axios.delete(`${API}/history/${id}`);
      setHistory((current) =>
        current.filter((item) => item._id !== id)
      );
    } catch (error) {
      console.error("Delete failed:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Delete failed. Please try again.");
    }
  };

  const exportHistoryCSV = () => {
    if (!history.length) {
      alert("No analysis history available to export.");
      return;
    }

    const headers = [
      "Index",
      "Spot Price",
      "Call OI",
      "Put OI",
      "PCR",
      "Outlook",
      "Summary",
      "Source",
      "Created At",
    ];

    const rows = history.map((item) => [
      item.index,
      item.spotPrice,
      item.totalCallOI,
      item.totalPutOI,
      item.pcr,
      item.outlook,
      item.summary,
      item.source,
      new Date(item.createdAt).toLocaleString(),
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "optionlens-analysis-history.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const clearAllHistory = async () => {
    if (!history.length) return;

    if (!window.confirm("Are you sure you want to delete ALL analysis history?")) {
      return;
    }

    try {
      await axios.delete(`${API}/history`);
      setHistory([]);
      alert("All analysis history cleared successfully.");
    } catch (error) {
      console.error("Clear history failed:", error.response?.data || error.message);
      alert("Unable to clear history. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <Activity size={35} />
        <p>Loading NIFTY Analyzer...</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="loading-screen">
        <AlertCircle size={35} />
        <p>{error || "Market data unavailable."}</p>
        <button onClick={fetchData}>Retry</button>
      </div>
    );
  }

  const totalCallOI = market.optionChain.reduce(
    (sum, item) => sum + item.call.oi,
    0
  );

  const totalPutOI = market.optionChain.reduce(
    (sum, item) => sum + item.put.oi,
    0
  );

  const pcr = totalPutOI / totalCallOI;

  const highestCallOI = market.optionChain.reduce((highest, item) =>
    item.call.oi > highest.call.oi ? item : highest
  );

  const highestPutOI = market.optionChain.reduce((highest, item) =>
    item.put.oi > highest.put.oi ? item : highest
  );

  const atmStrike = market.optionChain.reduce((closest, item) =>
    Math.abs(item.strikePrice - market.spotPrice) <
    Math.abs(closest.strikePrice - market.spotPrice)
      ? item
      : closest
  );

  const maxPain = market.optionChain.reduce((bestCandidate, candidate) => {
    const totalLoss = market.optionChain.reduce((loss, item) => {
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
  }, null);


  const maxPainDifference = maxPain.strikePrice - market.spotPrice;
  const maxPainDistance = Math.abs(maxPainDifference);

  const maxPainPosition =
    maxPainDifference > 0
      ? "Above sample spot"
      : maxPainDifference < 0
        ? "Below sample spot"
        : "At sample spot";

  const strikePrices = market.optionChain.map((item) => item.strikePrice);
  const lowestStrike = Math.min(...strikePrices);
  const highestStrike = Math.max(...strikePrices);
  const strikeRange = highestStrike - lowestStrike || 1;

  const spotMarkerPosition = Math.max(
    0,
    Math.min(100, ((market.spotPrice - lowestStrike) / strikeRange) * 100)
  );

  const painMarkerPosition = Math.max(
    0,
    Math.min(100, ((maxPain.strikePrice - lowestStrike) / strikeRange) * 100)
  );

  const latest = history[0];
  const outlook = latest?.outlook || "NEUTRAL";

  const chartData = market.optionChain.map((item) => ({
    strike: item.strikePrice,
    Calls: item.call.oi,
    Puts: item.put.oi,
  }));

  const maxPainHistoryChartData = [...maxPainHistory]
  .reverse()
  .map((item, index) => ({
    snapshot: `#${index + 1}`,
    maxPainStrike: item.maxPainStrike,
    atmStrike: item.atmStrike,
    createdAt: new Date(item.createdAt).toLocaleString(),
  }));

  const maxPainChartData = market.optionChain.map((candidate) => {
    const callPayout = market.optionChain.reduce(
      (total, item) =>
        total +
        Math.max(candidate.strikePrice - item.strikePrice, 0) *
          item.call.oi,
      0
    );

    const putPayout = market.optionChain.reduce(
      (total, item) =>
        total +
        Math.max(item.strikePrice - candidate.strikePrice, 0) *
          item.put.oi,
      0
    );

    return {
      strike: candidate.strikePrice,
      payout: callPayout + putPayout,
    };
  });

  const formatNumber = (number) =>
    new Intl.NumberFormat("en-IN").format(number);

  const formatDate = (date) =>
    new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const pcrInterpretation =
    pcr > 1.2
      ? "The sample Put-Call Ratio is above 1.20. Put open interest is relatively higher than Call open interest."
      : pcr < 0.8
        ? "The sample Put-Call Ratio is below 0.80. Call open interest is relatively higher than Put open interest."
        : "The sample Put-Call Ratio is between 0.80 and 1.20, indicating a relatively balanced open-interest distribution.";

  const oiComparison =
    totalPutOI > totalCallOI
      ? "Total Put open interest is higher than total Call open interest."
      : totalCallOI > totalPutOI
        ? "Total Call open interest is higher than total Put open interest."
        : "Total Call and Put open interest are equal.";

  const outlookExplanation =
    pcr > 1.2
      ? "The rule-based sample model classifies this snapshot as bullish because the PCR is above 1.20."
      : pcr < 0.8
        ? "The rule-based sample model classifies this snapshot as bearish because the PCR is below 0.80."
        : "The rule-based sample model classifies this snapshot as neutral because the PCR is between 0.80 and 1.20.";

  const marketSummary = [
    {
      title: "PCR interpretation",
      description: pcrInterpretation,
    },
    {
      title: "Open interest comparison",
      description: oiComparison,
    },
    {
      title: "Potential resistance indicator",
      description: `The highest Call OI in the displayed sample chain is at strike ${formatNumber(highestCallOI.strikePrice)}.`,
    },
    {
      title: "Potential support indicator",
      description: `The highest Put OI in the displayed sample chain is at strike ${formatNumber(highestPutOI.strikePrice)}.`,
    },
    {
      title: "Max Pain interpretation",
      description: `The estimated Max Pain strike is ${formatNumber(maxPain.strikePrice)}, which is ${formatNumber(Math.abs(maxPainDifference))} points ${maxPainDifference > 0 ? "above" : maxPainDifference < 0 ? "below" : "equal to"} the sample NIFTY spot price. Max Pain is a theoretical calculation based on sample open interest, not a reliable expiry prediction.`,
    },
    {
      title: "Overall sample outlook",
      description: outlookExplanation,
    },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <BarChart3 size={23} />
          </div>
          <div>
            <h2>OptionLens</h2>
            <span>MARKET ANALYTICS</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <div className="nav-item active">
          <Activity size={19} />
          Dashboard
        </div>

        <div className="nav-item">
          <BarChart3 size={19} />
          Options Chain
        </div>

        <div className="nav-item">
          <Clock size={19} />
          Analysis History
        </div>

        <div className="sidebar-bottom">
          <div className="database-status">
            <Database size={17} />
            <div>
              <strong>Database</strong>
              <span>MongoDB connected</span>
            </div>
            <span className="status-dot" />
          </div>
          <p>OptionLens v1.0.0</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">WORKSPACE / DASHBOARD</p>
            <h1>Market Overview</h1>
          </div>

          <div className="top-actions">
            <span className="demo-badge">
              <span /> DEMO DATA
            </span>
            <button
              className={`refresh-button ${refreshing ? "is-refreshing" : ""}`}
              onClick={refreshMarketData}
              title="Refresh sample market data"
              disabled={refreshing}
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>

        {error && <div className="error-message">{error}</div>}

        <section className="market-banner">
          <div>
            <span className="eyebrow">INDEX VALUE · {market.source}</span>
            <h2>NIFTY 50</h2>
            <div className="index-price">
              {formatNumber(market.spotPrice)}
              <span> INR</span>
            </div>
            <p className="market-caption">
              {market.source === "MANUAL DATA" ? "User-entered test data · Not live market prices" : "Synthetic demonstration data · Not live market prices"}
            </p>
          </div>

          <div className="banner-right">
            <div className="live-indicator">
              <span /> {market.source} SNAPSHOT
            </div>
            <span className="timestamp">
              Last fetched: {lastUpdated ? formatDate(lastUpdated) : formatDate(market.timestamp)}
            </span>
          </div>
        </section>

        <section className="panel manual-data-panel">
          <div className="panel-heading">
            <div>
              <h3>Manual Market Data Entry</h3>
              <p>Enter your own NIFTY 50 spot price and option-chain values</p>
            </div>
            <span className="small-tag">{market.source}</span>
          </div>

          <label className="manual-spot-field">
            NIFTY 50 Spot Price
            <input
              type="number"
              min="0.01"
              step="any"
              value={manualSpotPrice}
              onChange={(event) => setManualSpotPrice(event.target.value)}
              placeholder="Enter spot price"
            />
          </label>

          <div className="manual-table-heading">
            <h4>Option Chain Rows</h4>
            <button type="button" className="add-strike-button" onClick={addManualRow}>
              + Add Strike
            </button>
          </div>

          <div className="manual-rows">
            {manualRows.map((row, index) => (
              <div className="manual-row" key={index}>
                <label>
                  Strike
                  <input
                    type="number"
                    value={row.strikePrice}
                    onChange={(event) =>
                      updateManualStrike(index, event.target.value)
                    }
                  />
                </label>

                <label>
                  Call OI
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.call.oi}
                    onChange={(event) =>
                      updateManualRow(index, "call", "oi", event.target.value)
                    }
                  />
                </label>

                <label>
                  Call Change OI
                  <input
                    type="number"
                    step="1"
                    value={row.call.changeInOi}
                    onChange={(event) =>
                      updateManualRow(index, "call", "changeInOi", event.target.value)
                    }
                  />
                </label>

                <label>
                  Call LTP
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={row.call.ltp}
                    onChange={(event) =>
                      updateManualRow(index, "call", "ltp", event.target.value)
                    }
                  />
                </label>

                <label>
                  Put OI
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.put.oi}
                    onChange={(event) =>
                      updateManualRow(index, "put", "oi", event.target.value)
                    }
                  />
                </label>

                <label>
                  Put Change OI
                  <input
                    type="number"
                    step="1"
                    value={row.put.changeInOi}
                    onChange={(event) =>
                      updateManualRow(index, "put", "changeInOi", event.target.value)
                    }
                  />
                </label>

                <label>
                  Put LTP
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={row.put.ltp}
                    onChange={(event) =>
                      updateManualRow(index, "put", "ltp", event.target.value)
                    }
                  />
                </label>

                <button
                  type="button"
                  className="remove-strike-button"
                  onClick={() => removeManualRow(index)}
                  title="Remove this strike"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="manual-data-actions">
            <button
              type="button"
              className="analyze-button"
              onClick={saveManualData}
              disabled={savingManualData}
            >
              {savingManualData ? "Saving..." : "Save Manual Data"}
            </button>

            <button
              type="button"
              className="reset-manual-button"
              onClick={resetManualData}
              disabled={savingManualData}
            >
              Reset to Sample Data
            </button>
          </div>

          {manualMessage && (
            <p className="manual-data-message">{manualMessage}</p>
          )}

          <p className="manual-data-note">
            Manual entries are test data, not live market prices or trading signals.
          </p>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span>Total Call OI</span>
              <div className="stat-icon call-icon">
                <TrendingDown size={19} />
              </div>
            </div>
            <h2>{formatNumber(totalCallOI)}</h2>
            <p>Call open interest</p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Total Put OI</span>
              <div className="stat-icon put-icon">
                <TrendingUp size={19} />
              </div>
            </div>
            <h2>{formatNumber(totalPutOI)}</h2>
            <p>Put open interest</p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Put-Call Ratio</span>
              <div className="stat-icon pcr-icon">
                <Activity size={19} />
              </div>
            </div>
            <h2>{pcr.toFixed(2)}</h2>
            <p>Put OI ÷ Call OI</p>
          </div>

          <div className="stat-card max-pain-stat-card">
            <div className="stat-top">
              <span>Max Pain Strike</span>
              <div className="stat-icon max-pain-icon">
                <Crosshair size={19} />
              </div>
            </div>
            <h2>{formatNumber(maxPain.strikePrice)}</h2>
            <p>
              {formatNumber(maxPainDistance)} points{" "}
              {maxPainPosition.toLowerCase()}
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Market Outlook</span>
              <div className="stat-icon outlook-icon">
                <BarChart3 size={19} />
              </div>
            </div>
            <h2 className={`outlook-text ${outlook.toLowerCase()}`}>
              {outlook}
            </h2>
            <p>Rule-based sample analysis</p>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h3>Open Interest Distribution</h3>
                <p>Call vs Put OI across strike prices</p>
              </div>
              <span className="small-tag">SAMPLE</span>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e9edf3"
                  />
                  <XAxis
                    dataKey="strike"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value / 1000}k`}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Legend />
                  <Bar
                    dataKey="Calls"
                    fill="#ef7777"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Puts"
                    fill="#22b891"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel analysis-panel">
            <div className="panel-heading">
              <div>
                <h3>Market Analysis</h3>
                <p>Automated indicator summary</p>
              </div>
              <Activity size={20} />
            </div>

            <div className={`outlook-box ${outlook.toLowerCase()}`}>
              <span>RULE-BASED OUTLOOK</span>
              <h2>{outlook}</h2>
              <div className="sentiment-gauge">
                <div className="sentiment-track">
                  <div className="sentiment-segment bearish"></div>
                  <div className="sentiment-segment neutral"></div>
                  <div className="sentiment-segment bullish"></div>
                </div>
                <div className={`sentiment-marker ${outlook.toLowerCase()}`}></div>
              </div>
              <div className="sentiment-labels">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
              </div>
              <p>
                {latest?.summary ||
                  "Generate an analysis to see the outlook."}
              </p>
            </div>

            <div className="indicator-row">
              <span>Put-Call Ratio</span>
              <strong>{pcr.toFixed(2)}</strong>
            </div>
            <div className="pcr-guide">
              <h4>PCR Interpretation Guide</h4>
              <div className="pcr-guide-row">
                <span className="pcr-dot bearish-dot"></span>
                <span>Below 0.80</span>
                <strong>Bearish</strong>
              </div>
              <div className="pcr-guide-row">
                <span className="pcr-dot neutral-dot"></span>
                <span>0.80 – 1.20</span>
                <strong>Neutral</strong>
              </div>
              <div className="pcr-guide-row">
                <span className="pcr-dot bullish-dot"></span>
                <span>Above 1.20</span>
                <strong>Bullish</strong>
              </div>
            </div>

            <div className="indicator-row">
              <span>Call OI</span>
              <strong>{formatNumber(totalCallOI)}</strong>
            </div>

            <div className="indicator-row">
              <span>Put OI</span>
              <strong>{formatNumber(totalPutOI)}</strong>
            </div>

            <button
              className="analyze-button"
              onClick={generateAnalysis}
              disabled={analyzing}
            >
              <Activity size={18} />
              {analyzing ? "Generating..." : "Generate Analysis"}
            </button>
          </div>
        </section>

        <section className="panel max-pain-chart-panel">
          <div className="panel-heading">
            <div>
              <h3>Max Pain Payout Analysis</h3>
              <p>Theoretical combined Call and Put payout at each expiry strike</p>
            </div>
            <span className="small-tag">SAMPLE DATA</span>
          </div>

          <div className="max-pain-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maxPainChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e9edf3"
                />
                <XAxis
                  dataKey="strike"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `${value / 1000000}M`}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => formatNumber(value)}
                  labelFormatter={(value) =>
                    Number(value) === maxPain.strikePrice
                      ? `Strike: ${formatNumber(value)} (MAX PAIN)`
                      : `Strike: ${formatNumber(value)}`
                  }
                />
                <Bar
                  dataKey="payout"
                  name="Combined theoretical payout"
                  radius={[5, 5, 0, 0]}
                >
                  {maxPainChartData.map((item) => (
                    <Cell
                      key={item.strike}
                      fill={
                        item.strike === maxPain.strikePrice
                          ? "#f59e0b"
                          : "#0d9488"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="max-pain-chart-note">
            The lowest payout bar represents the calculated Max Pain strike.
            This is a theoretical estimate using synthetic open-interest data,
            not an expiry prediction or trading signal.
          </p>
        </section>

        <section className="panel max-pain-history-panel">
  <div className="panel-heading">
    <div>
      <h3>Max Pain Movement History</h3>
      <p>Previously saved Max Pain strike snapshots</p>
    </div>
    <span className="small-tag">SAMPLE DATA</span>
  </div>

  {maxPainHistoryChartData.length === 0 ? (
    <p className="empty-history">
      No Max Pain history available. Generate an analysis to create your
      first snapshot.
    </p>
  ) : (
    <>
      <div className="max-pain-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={maxPainHistoryChartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e9edf3"
            />
            <XAxis
              dataKey="snapshot"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(value) => `Snapshot ${value}`}
              formatter={(value, name) => [
                formatNumber(value),
                name,
              ]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="maxPainStrike"
              name="Max Pain Strike"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />
            <Line
              type="monotone"
              dataKey="atmStrike"
              name="ATM Strike"
              stroke="#0d9488"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="max-pain-chart-note">
        Showing {maxPainHistoryChartData.length} saved analysis snapshots.
        These are sample-data records, not live market movements.
      </p>
    </>
  )}
</section>

       

<section className="panel max-pain-history-table-panel">
  <div className="panel-heading">
    <div>
      <h3>Max Pain History Records</h3>
      <p>Details of previously saved analysis snapshots</p>
    </div>
    <span className="small-tag">
      {maxPainHistory.length} RECORDS
    </span>
  </div>

  {maxPainHistory.length === 0 ? (
    <p className="empty-history">
      No Max Pain records available.
    </p>
  ) : (
    <div className="max-pain-history-table-wrapper">
      <table className="max-pain-history-table">
        <thead>
          <tr>
            <th>Snapshot</th>
            <th>Date & Time</th>
            <th>Max Pain</th>
            <th>ATM Strike</th>
            <th>Distance</th>
          </tr>
        </thead>

        <tbody>
          {maxPainHistory.map((item, index) => (
            <tr key={item._id}>
              <td>#{maxPainHistory.length - index}</td>
              <td>{formatDate(item.createdAt)}</td>
              <td className="max-pain-table-value">
                {formatNumber(item.maxPainStrike)}
              </td>
              <td>{formatNumber(item.atmStrike)}</td>
              <td>{formatNumber(item.maxPainDistance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>

<section className="strike-analysis-grid">
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <h3>Options Chain</h3>
              <p>Search and filter sample strike prices</p>
            </div>
            <div className="table-actions">
              <span className="small-tag">
                {filteredOptions.length} OF {market.optionChain.length} STRIKES
              </span>
              <button
                className="export-button"
                onClick={exportOptionsCSV}
                disabled={sortedOptions.length === 0}
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="filter-toolbar">
            <div className="filter-search">
              <Search size={17} />
              <input
                type="number"
                placeholder="Search strike price..."
                value={strikeSearch}
                onChange={(event) => setStrikeSearch(event.target.value)}
              />
            </div>

            <div className="filter-range">
              <input
                type="number"
                placeholder="Min strike"
                value={minStrike}
                onChange={(event) => setMinStrike(event.target.value)}
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max strike"
                value={maxStrike}
                onChange={(event) => setMaxStrike(event.target.value)}
              />
            </div>

            <button className="reset-filter-button" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>

          <div className="sort-toolbar">
            <label htmlFor="chain-sort">Sort by</label>
            <select
              id="chain-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="STRIKE_ASC">Strike: Low to High</option>
              <option value="STRIKE_DESC">Strike: High to Low</option>
              <option value="CALL_DESC">Call OI: Highest First</option>
              <option value="CALL_ASC">Call OI: Lowest First</option>
              <option value="PUT_DESC">Put OI: Highest First</option>
              <option value="PUT_ASC">Put OI: Lowest First</option>
            </select>
          </div>

          <div className="option-filter-tabs">
            <button
              className={optionFilter === "ALL" ? "selected" : ""}
              onClick={() => setOptionFilter("ALL")}
            >
              All Options
            </button>
            <button
              className={optionFilter === "CALL" ? "selected" : ""}
              onClick={() => setOptionFilter("CALL")}
            >
              Call OI
            </button>
            <button
              className={optionFilter === "PUT" ? "selected" : ""}
              onClick={() => setOptionFilter("PUT")}
            >
              Put OI
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {optionFilter !== "PUT" && (
                    <th colSpan="3" className="call-heading">CALL OPTIONS</th>
                  )}
                  <th className="strike-heading">STRIKE</th>
                  {optionFilter !== "CALL" && (
                    <th colSpan="3" className="put-heading">PUT OPTIONS</th>
                  )}
                </tr>
                <tr>
                  {optionFilter !== "PUT" && (
                    <>
                      <th>OI</th>
                      <th>CHANGE OI</th>
                      <th>LTP</th>
                    </>
                  )}
                  <th>PRICE</th>
                  {optionFilter !== "CALL" && (
                    <>
                      <th>LTP</th>
                      <th>CHANGE OI</th>
                      <th>OI</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredOptions.length === 0 ? (
                  <tr>
                    <td colSpan={optionFilter === "ALL" ? 7 : 4} className="no-results">
                      No strike prices match your filters.
                    </td>
                  </tr>
                ) : (
                  sortedOptions.map((item) => (
                    <tr key={item.strikePrice}>
                      {optionFilter !== "PUT" && (
                        <>
                          <td>{formatNumber(item.call.oi)}</td>
                          <td className={item.call.changeInOi >= 0 ? "positive" : "negative"}>
                            {formatNumber(item.call.changeInOi)}
                          </td>
                          <td>{item.call.ltp}</td>
                        </>
                      )}
                      <td className="strike-value">{formatNumber(item.strikePrice)}</td>
                      {optionFilter !== "CALL" && (
                        <>
                          <td>{item.put.ltp}</td>
                          <td className={item.put.changeInOi >= 0 ? "positive" : "negative"}>
                            {formatNumber(item.put.changeInOi)}
                          </td>
                          <td>{formatNumber(item.put.oi)}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </section>
        </section>

        <section className="panel history-panel">
          <div className="panel-heading">
            <div>
              <h3>Recent Analysis History</h3>
              <p>Previous analyses saved in MongoDB</p>
            </div>
            <div className="history-heading-actions">
              <button
                className="export-history-button"
                onClick={exportHistoryCSV}
                disabled={history.length === 0}
              >
                Export CSV
              </button>
              <button
                className="clear-history-button"
                onClick={clearAllHistory}
                disabled={history.length === 0}
              >
                Clear All
              </button>
              <Clock size={20} />
            </div>
          </div>

          {history.length === 0 ? (
            <p className="empty-history">
              No analysis history yet. Generate your first analysis.
            </p>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div className="history-item" key={item._id}>
                  <div>
                    <strong>{item.index}</strong>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>

                  <div className="history-values">
                    <span>PCR: {item.pcr}</span>
                    <strong
                      className={`outlook-text ${item.outlook.toLowerCase()}`}
                    >
                      {item.outlook}
                    </strong>

                    <button
                      className="history-delete-button"
                      onClick={() => deleteAnalysis(item._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer>
          <span>OptionLens · NIFTY 50 Options Analyzer</span>
          <span>Educational demonstration only · Not financial advice</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
