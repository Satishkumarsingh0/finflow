import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { transactionsApi, partiesApi } from "../api/apiClient";
import { formatCurrency } from "../utils/formatters";
import Loader from "../components/common/Loader";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  GitCommitHorizontal,
  RefreshCw,
  Maximize2,
  X,
} from "lucide-react";

// ── Chart dimensions ─────────────────────────────────────────────────────────
const CHART_H = 240; // compact card height (≈70% of original ~340)
const EXPANDED_H = "74vh"; // height inside the fullscreen modal

// ── Finflow Chart Theme ──────────────────────────────────────────────────────
const CHART_COLORS = {
  in: "#23734e",
  out: "#c2622a",
  balance: "#1e5e8e",
  accent: "#d5ff69",
  muted: "#66a085",
  grid: "#e8eee9",
  text: "#3a5047",
  textMuted: "#7a9d8d",
};

const BASE = {
  chart: {
    style: { fontFamily: "'DM Sans', -apple-system, sans-serif" },
    backgroundColor: "#ffffff",
    borderRadius: 12,
    spacing: [14, 16, 12, 12],
    height: CHART_H,
  },
  title: { text: "" },
  credits: { enabled: false },
  legend: {
    itemStyle: {
      color: CHART_COLORS.text,
      fontSize: "11px",
      fontWeight: "500",
    },
    itemHoverStyle: { color: "#0f2820" },
    margin: 10,
  },
  tooltip: {
    backgroundColor: "#0f2820",
    borderColor: "#235044",
    borderRadius: 10,
    shadow: false,
    style: { color: "#e8f5ee", fontSize: "12px" },
    shared: true,
  },
  xAxis: {
    labels: { style: { color: CHART_COLORS.textMuted, fontSize: "11px" } },
    lineColor: CHART_COLORS.grid,
    tickColor: CHART_COLORS.grid,
    gridLineColor: CHART_COLORS.grid,
  },
  yAxis: {
    gridLineColor: CHART_COLORS.grid,
    labels: { style: { color: CHART_COLORS.textMuted, fontSize: "11px" } },
    title: { text: "" },
  },
};

// Build expanded version: override chart.height for the modal
const expandedBase = (height) => ({
  ...BASE,
  chart: { ...BASE.chart, height, spacing: [20, 24, 20, 24] },
  legend: {
    ...BASE.legend,
    itemStyle: { ...BASE.legend.itemStyle, fontSize: "13px" },
  },
  tooltip: {
    ...BASE.tooltip,
    style: { ...BASE.tooltip.style, fontSize: "13px" },
  },
  xAxis: {
    ...BASE.xAxis,
    labels: { style: { color: CHART_COLORS.textMuted, fontSize: "12px" } },
  },
  yAxis: {
    ...BASE.yAxis,
    labels: { style: { color: CHART_COLORS.textMuted, fontSize: "12px" } },
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function groupByMonth(transactions) {
  const map = {};
  transactions.forEach((tx) => {
    if (!tx.transactionDate) return;
    const key = tx.transactionDate.slice(0, 7);
    if (!map[key]) map[key] = { received: 0, transferred: 0 };
    if (tx.direction === "received") map[key].received += tx.amount || 0;
    if (tx.direction === "transferred") map[key].transferred += tx.amount || 0;
  });
  return map;
}

function monthLabel(yyyymm) {
  const [y, m] = yyyymm.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

const DATE_PRESETS = [
  { id: "all", label: "All Time" },
  { id: "this_year", label: "This Year" },
  { id: "last_6m", label: "Last 6 Months" },
  { id: "this_month", label: "This Month" },
];

// ── ChartCard wrapper ─────────────────────────────────────────────────────────
function ChartCard({ icon: Icon, title, desc, options, onExpand }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-icon-box">
          <Icon size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
        <button
          className="chart-expand-btn"
          onClick={onExpand}
          title="Expand chart"
          aria-label="Expand chart"
          type="button"
        >
          <Maximize2 size={14} />
        </button>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

// ── Expand Modal ──────────────────────────────────────────────────────────────
function ChartModal({ chart, onClose }) {
  // Re-render with a tall version of the same options
  const expandedOptions = useMemo(() => {
    if (!chart) return null;
    const b = expandedBase(EXPANDED_H);
    return { ...chart.options, chart: { ...chart.options.chart, ...b.chart } };
  }, [chart]);

  // Escape key closes modal
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!chart) return null;
  return (
    <div
      className="chart-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="chart-modal-inner animate-slide-up">
        <div className="chart-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="chart-icon-box">
              <chart.icon size={16} />
            </div>
            <div>
              <h3>{chart.title}</h3>
              <p>{chart.desc}</p>
            </div>
          </div>
          <button
            className="chart-modal-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="chart-modal-body">
          <HighchartsReact highcharts={Highcharts} options={expandedOptions} />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [datePreset, setDatePreset] = useState("this_year");
  const [expandedChart, setExpandedChart] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [txs, pts] = await Promise.all([
        transactionsApi.getAll(),
        partiesApi.getAll(),
      ]);
      setTransactions(txs);
      setParties(pts);
    } catch (err) {
      setError(err.message || "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Date filter ────────────────────────────────────────────────────────────
  const filteredTx = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      if (!tx.transactionDate) return datePreset === "all";
      const d = tx.transactionDate.slice(0, 10);
      if (datePreset === "all") return true;
      if (datePreset === "this_month") {
        const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        return d.startsWith(m);
      }
      if (datePreset === "this_year")
        return d.startsWith(String(now.getFullYear()));
      if (datePreset === "last_6m") {
        const cutoff = new Date(now);
        cutoff.setMonth(now.getMonth() - 6);
        return new Date(d) >= cutoff;
      }
      return true;
    });
  }, [transactions, datePreset]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let received = 0,
      transferred = 0;
    filteredTx.forEach((t) => {
      if (t.direction === "received") received += t.amount || 0;
      if (t.direction === "transferred") transferred += t.amount || 0;
    });
    return {
      received,
      transferred,
      net: received - transferred,
      count: filteredTx.length,
    };
  }, [filteredTx]);

  // ── Chart 1: Monthly Cashflow Column ──────────────────────────────────────
  const monthlyCashflow = useMemo(() => {
    const grouped = groupByMonth(filteredTx);
    const months = Object.keys(grouped).sort();
    return {
      ...BASE,
      chart: { ...BASE.chart, type: "column" },
      xAxis: { ...BASE.xAxis, categories: months.map(monthLabel) },
      yAxis: {
        ...BASE.yAxis,
        title: {
          text: "Amount (₹)",
          style: { color: CHART_COLORS.textMuted, fontSize: "10px" },
        },
      },
      plotOptions: { column: { borderRadius: 4, groupPadding: 0.1 } },
      series: [
        {
          name: "Money Received",
          data: months.map((m) => Math.round(grouped[m].received)),
          color: CHART_COLORS.in,
        },
        {
          name: "Money Transferred",
          data: months.map((m) => Math.round(grouped[m].transferred)),
          color: CHART_COLORS.out,
        },
      ],
      tooltip: { ...BASE.tooltip, valuePrefix: "₹", valueDecimals: 0 },
    };
  }, [filteredTx]);

  // ── Chart 2: In vs Out Donut ───────────────────────────────────────────────
  const inOutPie = useMemo(
    () => ({
      ...BASE,
      chart: { ...BASE.chart, type: "pie" },
      plotOptions: {
        pie: {
          innerSize: "58%",
          borderWidth: 3,
          borderColor: "#ffffff",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b><br>{point.percentage:.1f}%",
            style: { fontSize: "11px", color: CHART_COLORS.text },
            distance: 15,
          },
        },
      },
      series: [
        {
          name: "Cash Flow",
          data: [
            {
              name: "Received",
              y: Math.round(kpis.received),
              color: CHART_COLORS.in,
            },
            {
              name: "Transferred",
              y: Math.round(kpis.transferred),
              color: CHART_COLORS.out,
            },
          ],
        },
      ],
      tooltip: {
        ...BASE.tooltip,
        pointFormat:
          "<b>{point.name}</b><br>₹{point.y:,.0f} ({point.percentage:.1f}%)",
      },
    }),
    [kpis],
  );

  // ── Chart 3: Cumulative Net Balance Area ───────────────────────────────────
  const netBalance = useMemo(() => {
    const grouped = groupByMonth(filteredTx);
    const months = Object.keys(grouped).sort();
    let running = 0;
    const netLine = months.map((m) => {
      running += grouped[m].received - grouped[m].transferred;
      return Math.round(running);
    });
    return {
      ...BASE,
      chart: { ...BASE.chart, type: "area" },
      xAxis: { ...BASE.xAxis, categories: months.map(monthLabel) },
      plotOptions: {
        area: {
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, "rgba(35,115,78,0.22)"],
              [1, "rgba(35,115,78,0.01)"],
            ],
          },
          lineWidth: 2.5,
          marker: { radius: 3, fillColor: "#23734e" },
          threshold: 0,
          negativeFillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, "rgba(194,98,42,0.01)"],
              [1, "rgba(194,98,42,0.22)"],
            ],
          },
        },
      },
      series: [
        {
          name: "Cumulative Net Balance",
          data: netLine,
          color: CHART_COLORS.in,
          negativeColor: CHART_COLORS.out,
        },
      ],
      tooltip: { ...BASE.tooltip, valuePrefix: "₹", valueDecimals: 0 },
    };
  }, [filteredTx]);

  // ── Chart 4: Top Parties Horizontal Bar ───────────────────────────────────
  const topParties = useMemo(() => {
    const aggMap = {};
    filteredTx.forEach((tx) => {
      const name = tx.party?.name || "Direct / General";
      if (!aggMap[name]) aggMap[name] = { received: 0, transferred: 0 };
      if (tx.direction === "received") aggMap[name].received += tx.amount || 0;
      if (tx.direction === "transferred")
        aggMap[name].transferred += tx.amount || 0;
    });
    const sorted = Object.entries(aggMap)
      .map(([name, v]) => ({ name, total: v.received + v.transferred, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
    return {
      ...BASE,
      chart: { ...BASE.chart, type: "bar" },
      xAxis: {
        ...BASE.xAxis,
        categories: sorted.map((p) => p.name),
        labels: {
          style: {
            color: CHART_COLORS.text,
            fontSize: "11px",
            fontWeight: "500",
          },
        },
      },
      yAxis: {
        ...BASE.yAxis,
        title: {
          text: "₹ Amount",
          style: { fontSize: "10px", color: CHART_COLORS.textMuted },
        },
      },
      plotOptions: { bar: { borderRadius: 3, groupPadding: 0.06 } },
      series: [
        {
          name: "Received",
          data: sorted.map((p) => Math.round(p.received)),
          color: CHART_COLORS.in,
        },
        {
          name: "Transferred",
          data: sorted.map((p) => Math.round(p.transferred)),
          color: CHART_COLORS.out,
        },
      ],
      tooltip: { ...BASE.tooltip, valuePrefix: "₹", valueDecimals: 0 },
    };
  }, [filteredTx]);

  // ── Chart 5: Payment Mode Donut ───────────────────────────────────────────
  const paymentMode = useMemo(() => {
    const modeColors = {
      "Bank Transfer": "#1e5e8e",
      UPI: "#23734e",
      Cash: "#c2622a",
      Cheque: "#7e4dad",
      Card: "#1a6d7e",
    };
    const modes = {};
    filteredTx.forEach((tx) => {
      modes[tx.mode] = (modes[tx.mode] || 0) + (tx.amount || 0);
    });
    return {
      ...BASE,
      chart: { ...BASE.chart, type: "pie" },
      plotOptions: {
        pie: {
          innerSize: "52%",
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f}%",
            style: {
              color: CHART_COLORS.text,
              fontSize: "11px",
              fontWeight: "500",
            },
            connectorColor: "#c8d9d0",
            distance: 12,
          },
        },
      },
      series: [
        {
          name: "Volume",
          data: Object.entries(modes).map(([name, y]) => ({
            name,
            y: Math.round(y),
            color: modeColors[name] || "#66a085",
          })),
        },
      ],
      tooltip: {
        ...BASE.tooltip,
        pointFormat:
          "<b>{point.name}</b><br>₹{point.y:,.0f} ({point.percentage:.1f}%)",
      },
    };
  }, [filteredTx]);

  // ── Chart 6: Daily Net Spline ─────────────────────────────────────────────
  const dailyTrend = useMemo(() => {
    const dayMap = {};
    filteredTx.forEach((tx) => {
      const day = tx.transactionDate?.slice(0, 10);
      if (!day) return;
      if (!dayMap[day]) dayMap[day] = 0;
      dayMap[day] +=
        tx.direction === "received" ? tx.amount || 0 : -(tx.amount || 0);
    });
    const days = Object.keys(dayMap).sort().slice(-60);
    return {
      ...BASE,
      chart: { ...BASE.chart, type: "spline" },
      xAxis: {
        ...BASE.xAxis,
        categories: days.map((d) =>
          new Date(d).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
        ),
        tickInterval: Math.max(1, Math.floor(days.length / 8)),
      },
      plotOptions: {
        spline: {
          lineWidth: 2,
          marker: { radius: 0 },
          states: { hover: { lineWidth: 3 } },
        },
      },
      series: [
        {
          name: "Daily Net Flow",
          data: days.map((d) => Math.round(dayMap[d])),
          color: CHART_COLORS.in,
          negativeColor: CHART_COLORS.out,
          zones: [
            { value: 0, color: CHART_COLORS.out },
            { color: CHART_COLORS.in },
          ],
        },
      ],
      tooltip: { ...BASE.tooltip, valuePrefix: "₹", valueDecimals: 0 },
    };
  }, [filteredTx]);

  // ── Chart 7 (NEW): Step Line — Cumulative In vs Out ───────────────────────
  const stepLine = useMemo(() => {
    // Sorted chronologically
    const sorted = [...filteredTx].sort((a, b) =>
      (a.transactionDate || "").localeCompare(b.transactionDate || ""),
    );
    let cumIn = 0,
      cumOut = 0;
    const inData = [],
      outData = [];
    sorted.forEach((tx) => {
      const d = tx.transactionDate?.slice(0, 10);
      if (!d) return;
      if (tx.direction === "received") {
        cumIn += tx.amount || 0;
        inData.push([d, Math.round(cumIn)]);
      }
      if (tx.direction === "transferred") {
        cumOut += tx.amount || 0;
        outData.push([d, Math.round(cumOut)]);
      }
    });
    return {
      ...BASE,
      chart: { ...BASE.chart, type: "line" },
      xAxis: {
        ...BASE.xAxis,
        type: "category",
        labels: {
          style: { color: CHART_COLORS.textMuted, fontSize: "10px" },
          rotation: -30,
        },
      },
      yAxis: {
        ...BASE.yAxis,
        title: {
          text: "Cumulative ₹",
          style: { fontSize: "10px", color: CHART_COLORS.textMuted },
        },
      },
      plotOptions: {
        line: {
          step: "left", // ← makes it a step line
          lineWidth: 2.5,
          marker: { radius: 0, symbol: "circle" },
          states: { hover: { lineWidth: 3, marker: { radius: 4 } } },
        },
      },
      series: [
        { name: "Cumulative Inflow", data: inData, color: CHART_COLORS.in },
        { name: "Cumulative Outflow", data: outData, color: CHART_COLORS.out },
      ],
      tooltip: {
        ...BASE.tooltip,
        pointFormat:
          '<span style="color:{point.color}">●</span> {series.name}: <b>₹{point.y:,.0f}</b><br/>',
        valueDecimals: 0,
        shared: false,
      },
    };
  }, [filteredTx]);

  // ── Chart meta list for modal ─────────────────────────────────────────────
  const CHARTS = useMemo(
    () => [
      {
        id: "cashflow",
        icon: BarChart3,
        title: "Monthly Cashflow",
        desc: "Inflow vs outflow by month",
        options: monthlyCashflow,
      },
      {
        id: "inout",
        icon: PieChart,
        title: "Cash Flow Split",
        desc: "Received vs transferred proportion",
        options: inOutPie,
      },
      {
        id: "net",
        icon: TrendingUp,
        title: "Cumulative Net Balance",
        desc: "Running net position — green = surplus, red = deficit",
        options: netBalance,
      },
      {
        id: "parties",
        icon: BarChart3,
        title: "Top Parties by Volume",
        desc: "Highest-value customers & vendors",
        options: topParties,
      },
      {
        id: "mode",
        icon: PieChart,
        title: "Payment Mode Breakdown",
        desc: "Volume share by payment channel",
        options: paymentMode,
      },
      {
        id: "daily",
        icon: Activity,
        title: "Daily Net Cash Flow",
        desc: "Day-by-day net movement · last 60 days",
        options: dailyTrend,
      },
      {
        id: "step",
        icon: GitCommitHorizontal,
        title: "Step Line: Cumulative In vs Out",
        desc: "Stepwise cumulative inflow and outflow over time",
        options: stepLine,
      },
    ],
    [
      monthlyCashflow,
      inOutPie,
      netBalance,
      topParties,
      paymentMode,
      dailyTrend,
      stepLine,
    ],
  );

  const openExpand = (chartId) =>
    setExpandedChart(CHARTS.find((c) => c.id === chartId) || null);
  const closeExpand = useCallback(() => setExpandedChart(null), []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="analytics-page animate-fade-in">
        {/* Controls Strip */}
        <div className="analytics-controls">
          <div className="analytics-preset-tabs">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`filter-tab ${datePreset === p.id ? "active" : ""}`}
                onClick={() => setDatePreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button className="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={13} className={loading ? "spinning" : ""} />{" "}
            Refresh
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="stats-grid">
          <div className="stat in">
            <p>Total Received</p>
            <strong>{formatCurrency(kpis.received)}</strong>
            <span>{kpis.count} transactions</span>
          </div>
          <div className="stat out">
            <p>Total Transferred</p>
            <strong>{formatCurrency(kpis.transferred)}</strong>
            <span>Outflow in period</span>
          </div>
          <div className={`stat ${kpis.net >= 0 ? "balance" : ""}`}>
            <p>Net Position</p>
            <strong>{formatCurrency(kpis.net)}</strong>
            <span>{kpis.net >= 0 ? "Net surplus" : "Net deficit"}</span>
          </div>
          <div className="stat">
            <p>Active Parties</p>
            <strong>{parties.length}</strong>
            <span>Customers & vendors</span>
          </div>
        </div>

        {loading ? (
          <Loader message="Compiling charts & analytics…" />
        ) : error ? (
          <div className="form-alert error">
            <p>{error}</p>
            <button className="secondary" onClick={loadData}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Row 1: Monthly Cashflow + In vs Out Donut */}
            <div className="chart-grid-2">
              <ChartCard
                icon={BarChart3}
                title="Monthly Cashflow"
                desc="Inflow vs outflow by month"
                options={monthlyCashflow}
                onExpand={() => openExpand("cashflow")}
              />
              <ChartCard
                icon={PieChart}
                title="Cash Flow Split"
                desc="Received vs transferred proportion"
                options={inOutPie}
                onExpand={() => openExpand("inout")}
              />
            </div>

            {/* Row 2: Cumulative Net Balance (full width) */}
            <ChartCard
              icon={TrendingUp}
              title="Cumulative Net Balance"
              desc="Running net position — green = surplus, red = deficit"
              options={netBalance}
              onExpand={() => openExpand("net")}
            />

            {/* Row 3: Top Parties + Mode Donut */}
            <div className="chart-grid-2">
              <ChartCard
                icon={BarChart3}
                title="Top Parties by Volume"
                desc="Highest-value customers & vendors"
                options={topParties}
                onExpand={() => openExpand("parties")}
              />
              <ChartCard
                icon={PieChart}
                title="Payment Mode Breakdown"
                desc="Volume share by payment channel"
                options={paymentMode}
                onExpand={() => openExpand("mode")}
              />
            </div>

            {/* Row 4: Step Line (full width — new chart) */}
            <ChartCard
              icon={GitCommitHorizontal}
              title="Step Line: Cumulative In vs Out"
              desc="Stepwise cumulative inflow and outflow — see exactly when funds were received or paid"
              options={stepLine}
              onExpand={() => openExpand("step")}
            />

            {/* Row 5: Daily Net Spline (full width) */}
            <ChartCard
              icon={Activity}
              title="Daily Net Cash Flow"
              desc="Day-by-day net movement · last 60 days (green = net in, red = net out)"
              options={dailyTrend}
              onExpand={() => openExpand("daily")}
            />
          </>
        )}
      </div>

      {/* Expand Modal */}
      <ChartModal chart={expandedChart} onClose={closeExpand} />
    </>
  );
}
