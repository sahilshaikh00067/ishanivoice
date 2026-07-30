import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  FiPhoneCall,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiPlay,
  FiCalendar,
  FiCheck,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiRadio,
} from "react-icons/fi";
import { BASE } from "./api";

ChartJS.register(ArcElement, Tooltip, Legend);

/* =========================================================
   DESIGN TOKENS — "Broadcast Console"
   A control-room aesthetic for a voice campaign system:
   graphite chassis, brass/amber signal meters, mono readouts.
   ========================================================= */
const T = {
  void: "#0A0A0D",
  panel: "#151519",
  panelRaised: "#1B1C21",
  hairline: "#2A2B31",
  hairlineSoft: "#212227",
  brass: "#D9A356",
  brassBright: "#F0C078",
  steel: "#7C97B8",
  crimson: "#E1523D",
  gold: "#C9A227",
  sage: "#6FBF8C",
  ivory: "#F2EDE4",
  muted: "#8B8880",
  mutedFaint: "#5C5A56",
};

// subtle film-grain, applied as a low-opacity overlay for a tactile, expensive finish
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

const statusClass = {
  done: "bg-[#6FBF8C1a] text-[#6FBF8C] ring-1 ring-inset ring-[#6FBF8C33]",
  running: "bg-[#D9A3561a] text-[#D9A356] ring-1 ring-inset ring-[#D9A35633]",
  failed: "bg-[#E1523D1a] text-[#E1523D] ring-1 ring-inset ring-[#E1523D33]",
  scheduled: "bg-[#7C97B81a] text-[#7C97B8] ring-1 ring-inset ring-[#7C97B833]",
  pending: "bg-[#7C97B81a] text-[#7C97B8] ring-1 ring-inset ring-[#7C97B833]",
};

const statusDot = {
  done: "bg-[#6FBF8C] shadow-[0_0_8px_#6FBF8C]",
  running: "bg-[#D9A356] shadow-[0_0_8px_#D9A356]",
  failed: "bg-[#E1523D] shadow-[0_0_8px_#E1523D]",
  scheduled: "bg-[#7C97B8] shadow-[0_0_8px_#7C97B8]",
  pending: "bg-[#7C97B8] shadow-[0_0_8px_#7C97B8]",
};

const FILTERS = ["Today", "Yesterday", "7 Days", "30 Days"];

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("Today");
  const [allCampaigns, setAllCampaigns] = useState([]);

  const [total, setTotal] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [failed, setFailed] = useState(0);
  const [invalid, setInvalid] = useState(0);
  const [noAnswer, setNoAnswer] = useState(0);
  const [pct, setPct] = useState(0);
  const [pending, setPending] = useState(0);
  const [recent, setRecent] = useState([]);
  const [queueStats, setQueueStats] = useState({ running: 0, pending: 0, scheduled: 0, done: 0, total: 0 });

  // ==============================
  // LOAD FROM API
  // ==============================
  const loadDash = async () => {
    try {
      const userId = sessionStorage.getItem("user_id");
      const res = await fetch(`${BASE}/get-campaigns/?user_id=${userId}`);
      const data = await res.json();
      setAllCampaigns(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
      setAllCampaigns([]);
    }
  };

  useEffect(() => {
    loadDash();
    const interval = setInterval(loadDash, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // ==============================
  // FILTER
  // ==============================
  const filterCampaigns = (campaigns) => {
    const now = new Date();
    return campaigns.filter((r) => {
      const d = new Date(r.created_at);
      if (activeFilter === "Today") return d.toDateString() === now.toDateString();
      if (activeFilter === "Yesterday") {
        const y = new Date(); y.setDate(y.getDate() - 1);
        return d.toDateString() === y.toDateString();
      }
      if (activeFilter === "7 Days") {
        const p = new Date(); p.setDate(p.getDate() - 7);
        return d >= p;
      }
      if (activeFilter === "30 Days") {
        const p = new Date(); p.setDate(p.getDate() - 30);
        return d >= p;
      }
      return true;
    });
  };

  // ==============================
  // PROCESS STATS
  // ==============================
  useEffect(() => {
    const filtered = filterCampaigns(allCampaigns);

    let t = 0, a = 0, na = 0, f = 0, inv = 0;

    filtered.forEach((r) => {
      t += r.total || 0;
      a += r.success || 0;
      na += r.no_answer || 0;
      f += r.failed || 0;
      inv += r.invalid || 0;
    });

    const pend = Math.max(0, t - a - na - f - inv);

    setTotal(t);
    setAnswered(a);
    setNoAnswer(na);
    setFailed(f);
    setInvalid(inv);
    setPending(pend);
    setPct(t > 0 ? Math.round((a / t) * 100) : 0);

    setQueueStats({
      running: filtered.filter((r) => r.status === "running").length,
      pending: filtered.filter((r) => r.status === "pending").length,
      scheduled: filtered.filter((r) => r.status === "scheduled").length,
      done: filtered.filter((r) => r.status === "done").length,
      total: filtered.length,
    });

    setRecent([...filtered].sort((a, b) => b.id - a.id).slice(0, 6));
  }, [allCampaigns, activeFilter]);

  // ==============================
  // DONUT DATA — recalibrated to the console palette
  // ==============================
  const donutData = {
    labels: ["Answered", "No Answer", "Invalid", "Failed"],
    datasets: [
      {
        data: [
          answered || 0.01,
          noAnswer || 0.01,
          invalid || 0.01,
          failed || 0.01,
        ],
        backgroundColor: [T.brass, T.steel, T.gold, T.crimson],
        borderColor: T.panel,
        borderWidth: 3,
        hoverOffset: 8,
        borderRadius: 6,
        spacing: 3,
      },
    ],
  };

  const donutOptions = {
    cutout: "78%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: T.panelRaised,
        titleColor: T.ivory,
        bodyColor: T.muted,
        borderColor: T.hairline,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        titleFont: { size: 11, weight: "600", family: "'Space Grotesk', sans-serif" },
        bodyFont: { size: 11, family: "'IBM Plex Mono', monospace" },
        callbacks: {
          label: (ctx) => " " + ctx.label + ": " + Math.round(ctx.raw),
        },
      },
    },
    animation: { duration: 700, easing: "easeOutQuart" },
  };

  // ==============================
  // METRIC CARDS — recolored as console meter modules
  // ==============================
  const metrics = [
    {
      label: "Total Calls", value: total,
      Icon: FiPhoneCall, accent: T.brass,
      barW: "80%",
      badge: "+12%", trend: "up",
    },
    {
      label: "Answered", value: answered,
      Icon: FiCheckCircle, accent: T.sage,
      barW: total > 0 ? `${Math.round((answered / total) * 100)}%` : "0%",
      badge: "+8%", trend: "up",
    },
    {
      label: "No Answer",
      value: noAnswer,
      Icon: FiPhoneCall,
      accent: T.steel,
      barW: total > 0 ? `${Math.round((noAnswer / total) * 100)}%` : "0%",
      badge: "25%",
      trend: "flat",
    },
    {
      label: "Failed", value: failed,
      Icon: FiXCircle, accent: T.crimson,
      barW: total > 0 ? `${Math.round((failed / total) * 100)}%` : "0%",
      badge: "-3%", trend: "down",
    },
    {
      label: "Invalid", value: invalid,
      Icon: FiAlertTriangle, accent: T.gold,
      barW: total > 0 ? `${Math.round((invalid / total) * 100)}%` : "0%",
      badge: "0%", trend: "flat",
    },
  ];

  const activeIndex = FILTERS.indexOf(activeFilter);

  return (
    <div className="font-body relative" style={{ background: T.void }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        .font-body { font-family: 'Inter', sans-serif; }
        .console-panel {
          background: linear-gradient(180deg, ${T.panel} 0%, ${T.panelRaised} 100%);
          border: 1px solid ${T.hairline};
        }
        .console-trim {
          background: linear-gradient(90deg, transparent, ${T.brass}66 20%, ${T.brassBright} 50%, ${T.brass}66 80%, transparent);
        }
        .meter-track {
          background: repeating-linear-gradient(90deg, ${T.hairlineSoft} 0px, ${T.hairlineSoft} 3px, transparent 3px, transparent 5px);
        }
        .glow-brass:hover { box-shadow: 0 0 0 1px ${T.brass}55, 0 18px 40px -18px ${T.brass}44; }
      `}</style>

      {/* film grain finish */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-7">

        {/* TOP BAR */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: T.brass }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: T.brassBright, boxShadow: `0 0 6px ${T.brass}` }} />
              </span>
              <p className="text-[11px] font-semibold tracking-[0.28em] uppercase font-mono" style={{ color: T.muted }}>
                Voice Campaign — Console
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FiRadio size={13} style={{ color: T.brass }} />
              <span className="font-display text-[13px] font-semibold" style={{ color: T.ivory }}>Signal Room</span>
            </div>
          </div>

          {/* Toggle-switch style filter bank */}
          <div
            className="relative grid grid-cols-4 rounded-2xl p-1.5 w-full sm:w-auto console-panel"
            style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)" }}
          >
            <div
              className="absolute top-1.5 bottom-1.5 rounded-xl transition-transform duration-300 ease-out"
              style={{
                width: `calc(25% - 6px)`,
                transform: `translateX(calc(${activeIndex} * 100% + ${activeIndex * 5}px))`,
                left: 6,
                background: `linear-gradient(180deg, ${T.brassBright}, ${T.brass})`,
                boxShadow: `0 2px 10px -2px ${T.brass}99, inset 0 1px 0 rgba(255,255,255,0.25)`,
              }}
            />
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="relative z-10 h-[34px] px-3 sm:px-4 rounded-xl text-[11.5px] font-semibold font-mono whitespace-nowrap transition-colors duration-300"
                style={{ color: activeFilter === f ? T.void : T.muted }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="group relative overflow-hidden console-panel glow-brass rounded-[22px] p-5 flex flex-col gap-4
                shadow-[0_10px_30px_-16px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 ease-out"
            >
              <span className="absolute top-0 left-0 right-0 h-[2px] console-trim" />
              <div className="flex items-center justify-between">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center border"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${m.accent}22, ${T.panel})`,
                    borderColor: `${m.accent}44`,
                    boxShadow: `inset 0 1px 1px rgba(255,255,255,0.06), 0 0 16px -4px ${m.accent}55`,
                  }}
                >
                  <m.Icon style={{ color: m.accent }} size={18} strokeWidth={2} />
                </div>
                <span
                  className="inline-flex items-center gap-1 text-[10.5px] px-2.5 py-1 rounded-full font-semibold font-mono"
                  style={{ background: `${m.accent}18`, color: m.accent }}
                >
                  {m.trend === "up" && <FiTrendingUp size={11} />}
                  {m.trend === "down" && <FiTrendingDown size={11} />}
                  {m.trend === "flat" && <FiMinus size={11} />}
                  {m.badge}
                </span>
              </div>
              <div>
                <div className="font-mono text-[27px] font-semibold leading-none tabular-nums tracking-tight" style={{ color: T.ivory }}>
                  {m.value.toLocaleString()}
                </div>
                <div className="text-[11.5px] mt-1.5 font-medium font-body" style={{ color: T.muted }}>{m.label}</div>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden meter-track">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: m.barW, background: `linear-gradient(90deg, ${m.accent}99, ${m.accent})`, boxShadow: `0 0 8px ${m.accent}88` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* MAIN ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* DONUT CARD */}
          <div className="console-panel rounded-[22px] p-6 relative overflow-hidden shadow-[0_10px_30px_-16px_rgba(0,0,0,0.7)]">
            <span className="absolute top-0 left-0 right-0 h-[2px] console-trim" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-display text-[15px] font-semibold" style={{ color: T.ivory }}>Call Performance</p>
                <p className="text-[11.5px] mt-0.5 font-mono" style={{ color: T.mutedFaint }}>Success rate breakdown</p>
              </div>
              <button
                onClick={loadDash}
                className="w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-500 hover:rotate-180"
                style={{ borderColor: T.hairline, color: T.muted }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.brass; e.currentTarget.style.borderColor = T.brass; e.currentTarget.style.boxShadow = `0 0 14px -2px ${T.brass}77`; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.hairline; e.currentTarget.style.boxShadow = "none"; }}
              >
                <FiRefreshCw size={14} />
              </button>
            </div>

            {/* Chart */}
            <div className="relative flex items-center justify-center my-3">
              <div className="absolute w-[210px] h-[210px] rounded-full blur-2xl opacity-30" style={{ background: T.brass }} />
              <div style={{ width: 190, height: 190 }} className="relative">
                <Doughnut data={donutData} options={donutOptions} />
              </div>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="font-mono text-[28px] font-semibold tabular-nums" style={{ color: T.ivory, textShadow: `0 0 18px ${T.brass}55` }}>{pct}%</span>
                <span className="text-[10px] font-medium tracking-[0.2em] uppercase font-mono mt-0.5" style={{ color: T.mutedFaint }}>Success Rate</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-5">
              {[
                { label: "Answered", val: answered, color: T.brass },
                { label: "No Answer", val: noAnswer, color: T.steel },
                { label: "Invalid", val: invalid, color: T.gold },
                { label: "Failed", val: failed, color: T.crimson },
              ].map((l) => (
                <div
                  key={l.label}
                  className="flex items-center gap-2 rounded-full pl-2.5 pr-3 py-1.5 border"
                  style={{ background: T.panelRaised, borderColor: T.hairline }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                  <span className="text-[11px] font-medium font-body" style={{ color: T.muted }}>{l.label}</span>
                  <span className="text-[11px] font-semibold font-mono tabular-nums" style={{ color: T.ivory }}>{l.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QUEUE CARD */}
          <div className="console-panel rounded-[22px] p-6 relative overflow-hidden shadow-[0_10px_30px_-16px_rgba(0,0,0,0.7)]">
            <span className="absolute top-0 left-0 right-0 h-[2px] console-trim" />
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-[15px] font-semibold" style={{ color: T.ivory }}>Live Queue</p>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: T.sage }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: T.sage, boxShadow: `0 0 6px ${T.sage}` }} />
                  </span>
                </div>
                <p className="text-[11.5px] mt-0.5 font-mono" style={{ color: T.mutedFaint }}>Real-time campaign status</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {[
                { label: "Running", val: queueStats.running, color: T.brass, Icon: FiPlay },
                { label: "Pending", val: queueStats.pending, color: T.steel, Icon: FiRefreshCw },
                { label: "Scheduled", val: queueStats.scheduled, color: T.gold, Icon: FiCalendar },
                { label: "Completed", val: queueStats.done, color: T.sage, Icon: FiCheck },
              ].map((q) => (
                <div key={q.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] flex items-center gap-2 font-medium font-body" style={{ color: T.muted }}>
                      <q.Icon size={13} style={{ color: T.mutedFaint }} /> {q.label}
                    </span>
                    <span className="text-[13px] font-semibold font-mono tabular-nums" style={{ color: T.ivory }}>{q.val}</span>
                  </div>
                  <div className="h-[6px] rounded-full overflow-hidden meter-track">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: queueStats.total > 0 ? `${Math.round((q.val / queueStats.total) * 100)}%` : "0%",
                        background: `linear-gradient(90deg, ${q.color}99, ${q.color})`,
                        boxShadow: `0 0 8px ${q.color}88`,
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="mt-1 pt-5 border-t flex items-end justify-between" style={{ borderColor: T.hairline }}>
                <div>
                  <p className="text-[10.5px] font-medium font-mono tracking-wide uppercase" style={{ color: T.mutedFaint }}>Total Campaigns</p>
                  <p className="font-mono text-[27px] font-semibold tabular-nums mt-0.5" style={{ color: T.ivory }}>{queueStats.total}</p>
                </div>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center border"
                  style={{ background: T.panelRaised, borderColor: T.hairline }}
                >
                  <FiPhoneCall style={{ color: T.brass }} size={17} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT CAMPAIGNS TABLE */}
        <div className="console-panel rounded-[22px] p-6 relative overflow-hidden shadow-[0_10px_30px_-16px_rgba(0,0,0,0.7)]">
          <span className="absolute top-0 left-0 right-0 h-[2px] console-trim" />
          <div className="mb-5">
            <p className="font-display text-[15px] font-semibold" style={{ color: T.ivory }}>Recent Campaigns</p>
            <p className="text-[11.5px] mt-0.5 font-mono" style={{ color: T.mutedFaint }}>Latest activity</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {[
                    "Campaign",
                    "Total",
                    "Answered",
                    "No Answer",
                    "Invalid",
                    "Failed",
                    "Voice File",
                    "Status",
                    "Date"
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-semibold uppercase tracking-wider pb-3 pr-4 whitespace-nowrap border-b font-mono"
                      style={{ color: T.mutedFaint, borderColor: T.hairline }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-[12px] py-10 font-body" style={{ color: T.mutedFaint }}>
                      No campaigns found
                    </td>
                  </tr>
                ) : (
                  recent.map((c) => {
                    const d = new Date(c.created_at);
                    const dateStr =
                      d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
                      " " +
                      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                    const vf = (c.voice_file_id || "—").split("/").pop().replace(".wav", "");
                    const sc = statusClass[c.status] || "bg-[#8B88801a] text-[#8B8880] ring-1 ring-inset ring-[#8B888033]";
                    const dot = statusDot[c.status] || "bg-[#8B8880]";
                    const initial = (c.name || "U").trim().charAt(0).toUpperCase();

                    return (
                      <tr key={c.id} className="group">
                        <td className="py-3.5 pr-4 border-b rounded-l-xl transition-colors" style={{ borderColor: T.hairlineSoft }}>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-semibold font-mono shrink-0"
                              style={{ background: T.panelRaised, borderColor: `${T.brass}44`, color: T.brass }}
                            >
                              {initial}
                            </div>
                            <span className="text-[12.5px] font-semibold font-body max-w-[130px] truncate" style={{ color: T.ivory }}>
                              {c.name || "Untitled"}
                            </span>
                          </div>
                        </td>
                        {/* TOTAL */}
                        <td className="py-3.5 pr-4 text-[12.5px] font-mono tabular-nums border-b" style={{ color: T.muted, borderColor: T.hairlineSoft }}>
                          {c.total || 0}
                        </td>

                        {/* ANSWERED */}
                        <td className="py-3.5 pr-4 text-[12.5px] font-semibold font-mono tabular-nums border-b" style={{ color: T.sage, borderColor: T.hairlineSoft }}>
                          {c.success || 0}
                        </td>

                        {/* NO ANSWER */}
                        <td className="py-3.5 pr-4 text-[12.5px] font-semibold font-mono tabular-nums border-b" style={{ color: T.steel, borderColor: T.hairlineSoft }}>
                          {c.no_answer || 0}
                        </td>

                        {/* INVALID */}
                        <td className="py-3.5 pr-4 text-[12.5px] font-semibold font-mono tabular-nums border-b" style={{ color: T.gold, borderColor: T.hairlineSoft }}>
                          {c.invalid || 0}
                        </td>

                        {/* FAILED */}
                        <td className="py-3.5 pr-4 text-[12.5px] font-semibold font-mono tabular-nums border-b" style={{ color: T.crimson, borderColor: T.hairlineSoft }}>
                          {c.failed || 0}
                        </td>
                        <td className="py-3.5 pr-4 text-[11.5px] font-mono border-b" style={{ color: T.mutedFaint, borderColor: T.hairlineSoft }}>{vf}</td>
                        <td className="py-3.5 pr-4 border-b" style={{ borderColor: T.hairlineSoft }}>
                          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-semibold font-mono ${sc}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-[11.5px] whitespace-nowrap tabular-nums border-b rounded-r-xl font-mono" style={{ color: T.mutedFaint, borderColor: T.hairlineSoft }}>{dateStr}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}