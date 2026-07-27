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
} from "react-icons/fi";
import { BASE } from "./api";

ChartJS.register(ArcElement, Tooltip, Legend);

const statusClass = {
  done: "bg-green-100 text-green-700",
  running: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  scheduled: "bg-indigo-100 text-indigo-700",
  pending: "bg-indigo-100 text-indigo-700",
};

const statusDot = {
  done: "bg-green-500",
  running: "bg-yellow-500",
  failed: "bg-red-500",
  scheduled: "bg-indigo-500",
  pending: "bg-indigo-500",
};

const FILTERS = ["Today", "Yesterday", "7 Days", "30 Days"];

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("Today");
  const [allCampaigns, setAllCampaigns] = useState([]);

  const [total, setTotal] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [failed, setFailed] = useState(0);
  const [invalid, setInvalid] = useState(0);
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

    let t = 0, a = 0, f = 0, inv = 0;
    filtered.forEach((r) => {
      t += r.total || 0;
      a += r.success || 0;
      f += r.failed || 0;
      inv += r.invalid || 0;
    });

    const pend = Math.max(0, t - a - f - inv);

    setTotal(t);
    setAnswered(a);
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
  // DONUT DATA
  // ==============================
  const donutData = {
    labels: ["Answered", "Failed", "Invalid", "Pending"],
    datasets: [
      {
        data: [answered || 0.01, failed || 0.01, invalid || 0.01, pending || 0.01],
        backgroundColor: ["#EA7A9A", "#f87171", "#fbbf24", "#e5e7eb"],
        borderWidth: 0,
        hoverOffset: 6,
        borderRadius: 6,
        spacing: 2,
      },
    ],
  };

  const donutOptions = {
    cutout: "76%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#ffffff",
        bodyColor: "#d1d5db",
        padding: 10,
        cornerRadius: 10,
        titleFont: { size: 11, weight: "600" },
        bodyFont: { size: 11 },
        callbacks: {
          label: (ctx) => " " + ctx.label + ": " + Math.round(ctx.raw),
        },
      },
    },
    animation: { duration: 700, easing: "easeOutQuart" },
  };

  // ==============================
  // METRIC CARDS
  // ==============================
  const metrics = [
    {
      label: "Total Calls", value: total,
      Icon: FiPhoneCall, iconColor: "text-[#EA7A9A]",
      iconBg: "from-pink-50 to-white border-pink-100",
      barColor: "bg-gradient-to-r from-[#EA7A9A] to-[#f4a6bf]",
      barW: "80%",
      badge: "+12%", badgeBg: "bg-pink-50 text-pink-600", trend: "up",
    },
    {
      label: "Answered", value: answered,
      Icon: FiCheckCircle, iconColor: "text-green-500",
      iconBg: "from-green-50 to-white border-green-100",
      barColor: "bg-gradient-to-r from-green-400 to-green-300",
      barW: total > 0 ? `${Math.round((answered / total) * 100)}%` : "0%",
      badge: "+8%", badgeBg: "bg-green-50 text-green-600", trend: "up",
    },
    {
      label: "Failed", value: failed,
      Icon: FiXCircle, iconColor: "text-red-500",
      iconBg: "from-red-50 to-white border-red-100",
      barColor: "bg-gradient-to-r from-red-400 to-red-300",
      barW: total > 0 ? `${Math.round((failed / total) * 100)}%` : "0%",
      badge: "-3%", badgeBg: "bg-red-50 text-red-500", trend: "down",
    },
    {
      label: "Invalid", value: invalid,
      Icon: FiAlertTriangle, iconColor: "text-yellow-500",
      iconBg: "from-yellow-50 to-white border-yellow-100",
      barColor: "bg-gradient-to-r from-yellow-400 to-yellow-300",
      barW: total > 0 ? `${Math.round((invalid / total) * 100)}%` : "0%",
      badge: "0%", badgeBg: "bg-yellow-50 text-yellow-600", trend: "flat",
    },
  ];

  const activeIndex = FILTERS.indexOf(activeFilter);

  return (
    <div className="font-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="flex flex-col gap-5 pb-6">

        {/* TOP BAR */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA7A9A]" />
              <p className="text-[11px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
                Voice Campaign
              </p>
            </div>
          </div>

          {/* Sliding pill filter */}
          <div className="relative grid grid-cols-4 bg-gray-100/80 rounded-full p-1 w-full sm:w-auto">
            <div
              className="absolute top-1 bottom-1 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_10px_-2px_rgba(15,23,42,0.10)] transition-transform duration-300 ease-out"
              style={{
                width: `calc(25% - 4px)`,
                transform: `translateX(calc(${activeIndex} * 100% + ${activeIndex * 4}px))`,
                left: 2,
              }}
            />
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`relative z-10 h-[34px] px-3 sm:px-4 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors duration-300
                  ${activeFilter === f ? "text-[#EA7A9A]" : "text-gray-400 hover:text-gray-600"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="group bg-white border border-gray-100 rounded-[28px] p-5 flex flex-col gap-4
                shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_24px_-14px_rgba(15,23,42,0.12)]
                hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(15,23,42,0.05),0_22px_36px_-16px_rgba(15,23,42,0.16)]
                transition-all duration-300 ease-out"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${m.iconBg} border flex items-center justify-center
                    shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] group-hover:scale-105 transition-transform duration-300`}
                >
                  <m.Icon className={m.iconColor} size={18} strokeWidth={2} />
                </div>
                <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold ${m.badgeBg}`}>
                  {m.trend === "up" && <FiTrendingUp size={11} />}
                  {m.trend === "down" && <FiTrendingDown size={11} />}
                  {m.trend === "flat" && <FiMinus size={11} />}
                  {m.badge}
                </span>
              </div>
              <div>
                <div className="font-display text-[29px] font-extrabold text-gray-800 leading-none tabular-nums tracking-tight">
                  {m.value.toLocaleString()}
                </div>
                <div className="text-[12px] text-gray-400 mt-1.5 font-medium">{m.label}</div>
              </div>
              <div className="h-[4px] rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${m.barColor} transition-all duration-700`} style={{ width: m.barW }} />
              </div>
            </div>
          ))}
        </div>

        {/* MAIN ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* DONUT CARD */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6
            shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_24px_-14px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-display text-[15px] font-bold text-gray-800">Call Performance</p>
                <p className="text-[11.5px] text-gray-400 mt-0.5">Success rate breakdown</p>
              </div>
              <button
                onClick={loadDash}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400
                  hover:bg-[#EA7A9A] hover:text-white hover:border-[#EA7A9A] hover:rotate-180 transition-all duration-500"
              >
                <FiRefreshCw size={14} />
              </button>
            </div>

            {/* Chart */}
            <div className="relative flex items-center justify-center my-3">
              <div className="absolute w-[210px] h-[210px] rounded-full bg-pink-100/40 blur-2xl" />
              <div style={{ width: 190, height: 190 }} className="relative">
                <Doughnut data={donutData} options={donutOptions} />
              </div>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="font-display text-[30px] font-extrabold text-gray-800 tabular-nums">{pct}%</span>
                <span className="text-[10.5px] text-gray-400 font-medium tracking-wide uppercase">Success Rate</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-5">
              {[
                { label: "Answered", val: answered, color: "#EA7A9A" },
                { label: "Failed", val: failed, color: "#f87171" },
                { label: "Invalid", val: invalid, color: "#fbbf24" },
                { label: "Pending", val: pending, color: "#d1d5db" },
              ].map((l) => (
                <div
                  key={l.label}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full pl-2.5 pr-3 py-1.5"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[11px] text-gray-500 font-medium">{l.label}</span>
                  <span className="text-[11px] font-bold text-gray-700 tabular-nums">{l.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QUEUE CARD */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6
            shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_24px_-14px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-[15px] font-bold text-gray-800">Live Queue</p>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                  </span>
                </div>
                <p className="text-[11.5px] text-gray-400 mt-0.5">Real-time campaign status</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {[
                { label: "Running", val: queueStats.running, color: "bg-gradient-to-r from-[#EA7A9A] to-[#f4a6bf]", Icon: FiPlay },
                { label: "Pending", val: queueStats.pending, color: "bg-gradient-to-r from-indigo-400 to-indigo-300", Icon: FiRefreshCw },
                { label: "Scheduled", val: queueStats.scheduled, color: "bg-gradient-to-r from-blue-400 to-blue-300", Icon: FiCalendar },
                { label: "Completed", val: queueStats.done, color: "bg-gradient-to-r from-green-400 to-green-300", Icon: FiCheck },
              ].map((q) => (
                <div key={q.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12.5px] text-gray-500 flex items-center gap-2 font-medium">
                      <q.Icon size={13} className="text-gray-400" /> {q.label}
                    </span>
                    <span className="text-[13.5px] font-bold text-gray-800 tabular-nums">{q.val}</span>
                  </div>
                  <div className="h-[5px] rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${q.color} transition-all duration-700`}
                      style={{ width: queueStats.total > 0 ? `${Math.round((q.val / queueStats.total) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}

              <div className="mt-1 pt-5 border-t border-gray-100 flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Total Campaigns</p>
                  <p className="font-display text-[29px] font-extrabold text-gray-800 tabular-nums mt-0.5">{queueStats.total}</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex items-center justify-center">
                  <FiPhoneCall className="text-gray-400" size={17} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT CAMPAIGNS TABLE */}
        <div className="bg-white border border-gray-100 rounded-[28px] p-6
          shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_24px_-14px_rgba(15,23,42,0.12)]">
          <div className="mb-5">
            <p className="font-display text-[15px] font-bold text-gray-800">Recent Campaigns</p>
            <p className="text-[11.5px] text-gray-400 mt-0.5">Latest activity</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {["Campaign", "Total", "Answered", "Failed", "Voice File", "Status", "Date"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10.5px] text-gray-400 font-semibold uppercase tracking-wider pb-3 pr-4 whitespace-nowrap border-b border-gray-100"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-[12px] text-gray-400 py-10">
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
                    const sc = statusClass[c.status] || "bg-gray-100 text-gray-500";
                    const dot = statusDot[c.status] || "bg-gray-400";
                    const initial = (c.name || "U").trim().charAt(0).toUpperCase();

                    return (
                      <tr key={c.id} className="group">
                        <td className="py-3.5 pr-4 border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors rounded-l-xl">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">
                              {initial}
                            </div>
                            <span className="text-[12.5px] font-semibold text-gray-700 max-w-[130px] truncate">
                              {c.name || "Untitled"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-[12.5px] text-gray-600 tabular-nums border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors">{c.total || 0}</td>
                        <td className="py-3.5 pr-4 text-[12.5px] text-green-600 font-semibold tabular-nums border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors">{c.success || 0}</td>
                        <td className="py-3.5 pr-4 text-[12.5px] text-red-500 font-semibold tabular-nums border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors">{c.failed || 0}</td>
                        <td className="py-3.5 pr-4 text-[11.5px] text-gray-400 border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors">{vf}</td>
                        <td className="py-3.5 pr-4 border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-semibold ${sc}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-[11.5px] text-gray-400 whitespace-nowrap tabular-nums border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors rounded-r-xl">{dateStr}</td>
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


