import React, { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { BASE } from "./api";

const ScheduleReport = () => {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("Date range");
  const [page, setPage] = useState(1);

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const filters = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Last Month"];

  useEffect(() => { loadScheduleData(); }, [selectedFilter]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      const userId = sessionStorage.getItem("user_id");
      const res = await fetch(`${BASE}/get-campaigns/?user_id=${userId}`);
      const data = await res.json();

      if (!data || data.length === 0) { setScheduleData([]); setLoading(false); return; }

      const now = new Date();

      // Filter only scheduled campaigns
      const scheduledOnly = data.filter(item => item.status === "scheduled");

      const filtered = scheduledOnly.filter((item) => {
        const d = new Date(item.created_at);
        if (selectedFilter === "Today") return d.toDateString() === now.toDateString();
        if (selectedFilter === "Yesterday") {
          const y = new Date(); y.setDate(y.getDate() - 1);
          return d.toDateString() === y.toDateString();
        }
        if (selectedFilter === "Last 7 Days") { const p = new Date(); p.setDate(p.getDate() - 7); return d >= p; }
        if (selectedFilter === "Last 30 Days") { const p = new Date(); p.setDate(p.getDate() - 30); return d >= p; }
        if (selectedFilter === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (selectedFilter === "Last Month") {
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        }
        return true;
      });

      const formatted = filtered.map((item, index) => ({
        id: item.id,
        date: new Date(item.created_at).toLocaleDateString(),
        name: item.name || `Campaign ${index + 1}`,
        scheduleDate: item.scheduled_at
          ? new Date(item.scheduled_at).toLocaleString()
          : new Date(item.created_at).toLocaleString(),
        status: item.status || "scheduled",
        jobId: item.job_id || "-",
        total: item.total || 0,
        success: item.success || 0,
        failed: item.failed || 0,
        invalid: item.invalid || 0,
        callerId: item.caller_id || "-",
      }));

      setScheduleData(formatted);
    } catch (err) {
      console.log(err);
      setScheduleData([]);
    }
    setLoading(false);
  };

  const loadDetail = async (campaignId) => {
    try {
      const res = await fetch(`${BASE}/get-campaign-detail/?campaign_id=${campaignId}`);
      const data = await res.json();
      setDetailData(data);
      setShowDetail(true);
    } catch (err) {
      alert("Error loading detail ❌");
    }
  };

  const filteredData = scheduleData.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / showEntries);
  const paginated = filteredData.slice((page - 1) * showEntries, page * showEntries);

  return (
    <div className="min-h-screen bg-[#efefef] p-2 md:p-4 overflow-x-hidden">
      <div className="w-full bg-[#f5f5f5] rounded-[28px] border border-[#ef7fa4] overflow-hidden shadow-sm">

        <div className="bg-[#efefef] border-b border-[#dddddd] px-6 md:px-9 py-7">
          <h1 className="text-[22px] md:text-[24px] font-[700] uppercase text-black tracking-wide">Schedule Report</h1>
        </div>

        <div className="px-5 md:px-9 py-10">

          {/* FILTER */}
          <div className="mb-7 flex items-center gap-4 flex-wrap">
            <div className="relative inline-block">
              <button onClick={() => setFilterOpen(!filterOpen)}
                className="h-[48px] px-6 rounded-full bg-[#e17097] hover:bg-[#d95f89] duration-300 text-white flex items-center gap-3 text-[16px] font-semibold">
                <CalendarDays size={18} /> {selectedFilter} <ChevronDown size={16} />
              </button>
              {filterOpen && (
                <div className="absolute left-0 top-[58px] w-[200px] bg-white border border-[#e5e5e5] rounded-[14px] shadow-lg overflow-hidden z-50">
                  {filters.map((item, i) => (
                    <div key={i} onClick={() => { setSelectedFilter(item); setFilterOpen(false); }}
                      className="px-5 py-3 hover:bg-pink-50 cursor-pointer text-[14px]">{item}</div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={loadScheduleData}
              className="h-[48px] px-5 rounded-full bg-gray-200 text-gray-700 text-[14px] font-medium hover:bg-gray-300">
              🔄 Refresh
            </button>
          </div>

          {/* TOP */}
          <div className="flex items-center justify-between flex-wrap gap-5 mb-7">
            <div className="flex items-center gap-3 text-[18px] text-black">
              <span>Show</span>
              <select value={showEntries} onChange={(e) => { setShowEntries(Number(e.target.value)); setPage(1); }}
                className="w-[78px] h-[44px] border border-[#d8d8d8] rounded-[8px] px-3 bg-white outline-none text-[16px]">
                <option value="10">10</option><option value="25">25</option><option value="50">50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[17px] text-black">Search:</span>
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-[190px] md:w-[280px] h-[44px] border border-[#d8d8d8] rounded-[8px] px-3 bg-white outline-none text-[14px]" />
            </div>
          </div>

          {/* TABLE */}
          <div className="w-full overflow-x-auto rounded-[18px] border border-[#e3e3e3] bg-white">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-[#fafafa]">
                  {["Date", "Name", "Scheduled At", "Total", "Success", "Status", "Action"].map((head, i) => (
                    <th key={i} className="border-r border-b border-[#e5e5e5] px-5 py-6 text-left">
                      <div className="flex items-center justify-between text-[16px] font-[700] text-black whitespace-nowrap">
                        {head} <ChevronsUpDown size={15} className="text-[#cfcfcf]" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-14 text-[15px]">Loading...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-14 text-[15px]">No scheduled campaigns found</td></tr>
                ) : paginated.map((item, index) => (
                  <tr key={index} className="hover:bg-[#fafafa]">
                    <td className="border-r border-b border-[#ececec] px-5 py-7 text-[15px] text-black whitespace-nowrap">{item.date}</td>
                    <td className="border-r border-b border-[#ececec] px-5 py-7 text-[15px] text-black whitespace-nowrap">{item.name}</td>
                    <td className="border-r border-b border-[#ececec] px-5 py-7 text-[15px] text-black whitespace-nowrap">{item.scheduleDate}</td>
                    <td className="border-r border-b border-[#ececec] px-5 py-7 text-[15px] text-black whitespace-nowrap">{item.total}</td>
                    <td className="border-r border-b border-[#ececec] px-5 py-7 text-[15px] text-green-600 font-semibold whitespace-nowrap">{item.success}</td>
                    <td className="border-r border-b border-[#ececec] px-5 py-7 whitespace-nowrap">
                      <span className={`px-4 py-2 rounded-full text-[13px] font-semibold text-white ${
                        item.status === "done" ? "bg-[#2dc653]"
                        : item.status === "scheduled" ? "bg-[#3d2d83]"
                        : item.status === "running" ? "bg-blue-500"
                        : "bg-orange-400"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="border-b border-[#ececec] px-5 py-7 whitespace-nowrap">
                      <button
                        onClick={() => loadDetail(item.id)}
                        className="bg-[#e17097] hover:bg-[#d95f89] duration-300 text-white px-5 h-[42px] rounded-full text-[14px] font-semibold">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between flex-wrap gap-5 mt-7">
            <div className="text-[15px] text-black">
              Showing {filteredData.length === 0 ? 0 : (page - 1) * showEntries + 1} to{" "}
              {Math.min(page * showEntries, filteredData.length)} of {filteredData.length} entries
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="bg-[#e17097] hover:bg-[#d95f89] disabled:opacity-50 text-white px-5 h-[42px] rounded-full flex items-center gap-1 text-[14px] duration-200">
                <ChevronLeft size={15} /> Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="bg-[#e17097] hover:bg-[#d95f89] disabled:opacity-50 text-white px-5 h-[42px] rounded-full flex items-center gap-1 text-[14px] duration-200">
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* DETAIL MODAL */}
      {showDetail && detailData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] w-full max-w-[700px] max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-[#fafafa]">
              <h2 className="text-[20px] font-bold">Campaign Detail — {detailData.name}</h2>
              <button onClick={() => setShowDetail(false)} className="text-[24px] text-gray-500">×</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  ["Total", detailData.total],
                  ["Success", detailData.success],
                  ["Failed", detailData.failed],
                  ["Invalid", detailData.invalid],
                  ["Caller ID", detailData.caller_id],
                  ["Job ID", detailData.job_id || "-"],
                  ["Status", detailData.status],
                  ["Scheduled At", detailData.scheduled_at ? new Date(detailData.scheduled_at).toLocaleString() : "-"],
                ].map(([label, val], i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[12px] text-gray-500">{label}</p>
                    <p className="text-[16px] font-bold">{val}</p>
                  </div>
                ))}
              </div>

              {detailData.results && detailData.results.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full min-w-[400px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[13px] font-bold border-b">Number</th>
                        <th className="px-4 py-3 text-left text-[13px] font-bold border-b">Status</th>
                        <th className="px-4 py-3 text-left text-[13px] font-bold border-b">Job ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.results.slice(0, 100).map((r, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-[13px]">{r.number}</td>
                          <td className="px-4 py-2 text-[13px]">
                            <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                              r.status === "sent" ? "bg-green-100 text-green-700"
                              : r.status === "pending" ? "bg-blue-100 text-blue-700"
                              : r.status === "invalid" ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-600"
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-2 text-[13px]">{r.job_id || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleReport;