import React, { useEffect, useState } from "react";
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Eye,
} from "lucide-react";
import { BASE } from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const CampaignReoprts = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("Today");
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filters = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Last Month"];

  useEffect(() => { loadReports(); }, [selectedFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const userId = sessionStorage.getItem("user_id");
      const res = await fetch(`${BASE}/get-campaigns/?user_id=${userId}`);
      const data = await res.json();

      if (!data || data.length === 0) { setEntries([]); setLoading(false); return; }

      const now = new Date();

      const filtered = data.filter((r) => {
        const d = new Date(r.created_at);
        if (selectedFilter === "Today") return d.toDateString() === now.toDateString();
        if (selectedFilter === "Yesterday") {
          const y = new Date(); y.setDate(y.getDate() - 1);
          return d.toDateString() === y.toDateString();
        }
        if (selectedFilter === "Last 7 Days") {
          const p = new Date(); p.setDate(p.getDate() - 7); return d >= p;
        }
        if (selectedFilter === "Last 30 Days") {
          const p = new Date(); p.setDate(p.getDate() - 30); return d >= p;
        }
        if (selectedFilter === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (selectedFilter === "Last Month") {
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        }
        return true;
      });

      const formatted = filtered.map((r, i) => ({
        id: r.id,
        date: new Date(r.created_at).toLocaleDateString(),
        name: r.name || `Campaign ${i + 1}`,
        totalCount: r.total || 0,
        process: r.success || 0,
        pending: r.failed || 0,
        invalid: r.invalid || 0,
        jobId: r.job_id || "",
        status: r.status || "",
        callerId: r.caller_id || "",
      }));

      setEntries(formatted);
      setPage(1);
    } catch (err) {
      console.log(err);
      setEntries([]);
    }
    setLoading(false);
  };

const loadDetail = async (campaignId) => {
  try {
    setDetailLoading(true);

    const res = await fetch(
      `${BASE}/get-campaign-detail/?campaign_id=${campaignId}`
    );

    const data = await res.json();

    console.log("DETAIL DATA =>", data);

    setDetailData(data);
    setShowDetail(true);
  } catch (err) {
    console.log(err);
    alert("Error loading detail ❌");
  }

  setDetailLoading(false);
};

  const downloadReport = () => {
    if (!detailData?.responses?.length) {
      alert("No response data found");
      return;
    }

    const excelData = detailData.responses.map((r) => ({
      Number: r.mobile,
      PressKey: r.dtmf,
      CallResponse:
        r.dtmf === "1"
          ? "Interested"
          : r.dtmf === "2"
            ? "Call Back"
            : r.dtmf === "3"
              ? "Not Interested"
              : `Pressed ${r.dtmf}`,
      Status: "Answered",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Campaign Report"
    );

    const excelBuffer = XLSX.write(
      workbook,
      {
        bookType: "xlsx",
        type: "array",
      }
    );

    const file = new Blob(
      [excelBuffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    saveAs(
      file,
      `${detailData.name}_report.xlsx`
    );
  };

  const filteredEntries = entries.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEntries.length / showEntries);
  const paginated = filteredEntries.slice((page - 1) * showEntries, page * showEntries);

  return (
    <div className="min-h-screen bg-[#efefef] p-3 md:p-5 overflow-x-hidden">
      <div className="w-full bg-[#f3f3f3] rounded-[20px] border border-[#ef7fa4] overflow-hidden shadow-sm">

        {/* HEADER */}
        <div className="bg-[#ececec] border-b border-[#e5e5e5] px-4 md:px-7 py-5">
          <h1 className="text-[18px] md:text-[24px] font-[700] text-black uppercase">Campaign Report</h1>
        </div>

        <div className="px-3 md:px-6 py-6">

          {/* TOP */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="h-[42px] px-5 rounded-full bg-[#e36f97] text-white flex items-center gap-2 text-[14px] md:text-[16px] font-[500]"
              >
                <CalendarDays size={16} />
                {selectedFilter}
                <ChevronDown size={14} />
              </button>
              {filterOpen && (
                <div className="absolute left-0 top-[52px] bg-white w-[180px] rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                  {filters.map((item, i) => (
                    <div key={i}
                      onClick={() => { setSelectedFilter(item); setFilterOpen(false); }}
                      className="px-4 py-2 hover:bg-pink-50 cursor-pointer text-[14px]"
                    >{item}</div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={loadReports}
              className="h-[42px] px-5 rounded-full bg-gray-200 text-gray-700 text-[14px] font-medium hover:bg-gray-300">
              🔄 Refresh
            </button>
          </div>

          {/* SHOW + SEARCH */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-2 text-[14px] md:text-[16px] text-black">
              <span>Show</span>
              <select
                value={showEntries}
                onChange={(e) => { setShowEntries(Number(e.target.value)); setPage(1); }}
                className="w-[70px] h-[40px] border border-[#d9d9d9] rounded-lg px-2 text-[14px] outline-none bg-white"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] md:text-[16px]">Search:</span>
              <input
                type="text" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-[180px] md:w-[240px] h-[40px] border border-[#d8d8d8] rounded-lg px-3 outline-none bg-white text-[14px]"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="w-full overflow-x-auto rounded-[14px] border border-[#e2e2e2] bg-white">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-[#fafafa]">
                  {["Date", "Name", "Caller ID", "Total", "Answered", "Failed", "Invalid", "Job ID", "View"].map((head, i) => (
                    <th key={i} className="border-r border-b border-[#e6e6e6] px-3 py-4 text-left">
                      <div className="flex items-center gap-1 text-[13px] md:text-[15px] font-[700] text-black whitespace-nowrap">
                        {head}
                        <ChevronsUpDown size={14} className="text-[#d3d3d3]" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-10 text-[15px]">Loading...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-10 text-[15px] text-black">No data available in table</td></tr>
                ) : paginated.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 duration-200">
                    <td className="px-3 py-4 border-b border-[#ececec] text-[13px]">{item.date}</td>
                    <td className="px-3 py-4 border-b border-[#ececec] text-[13px]">{item.name}</td>
                    <td className="px-3 py-4 border-b border-[#ececec] text-[13px]">{item.callerId || "-"}</td>
                    <td className="px-3 py-4 border-b border-[#ececec] text-[13px]">{item.totalCount}</td>
                    <td className="px-3 py-4 border-b border-[#ececec] text-[13px] text-green-600 font-semibold">{item.process}</td>
                    <td className="px-3 py-4 border-b border-[#ececec] text-[13px] text-red-500 font-semibold">{item.pending}</td>
                    <td className="px-3 py-4 border-b border-[#ececec] text-[13px] text-orange-500 font-semibold">{item.invalid}</td>
                    <td className="px-3 py-4 border-b border-[#ececec] text-[13px]">{item.jobId || "-"}</td>
                    <td className="px-3 py-4 border-b border-[#ececec]">
                      <button
                        onClick={() => loadDetail(item.id)}
                        disabled={detailLoading}
                        className="w-[34px] h-[34px] rounded-full bg-pink-100 flex items-center justify-center disabled:opacity-50"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between flex-wrap gap-4 mt-6">
            <div className="text-[13px] md:text-[15px] text-black">
              Showing {filteredEntries.length === 0 ? 0 : (page - 1) * showEntries + 1} to{" "}
              {Math.min(page * showEntries, filteredEntries.length)} of {filteredEntries.length} entries
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-[#e36f97] hover:bg-[#d95f89] disabled:opacity-50 text-white px-5 h-[42px] rounded-full flex items-center gap-1 text-[13px] md:text-[14px] duration-200"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="bg-[#e36f97] hover:bg-[#d95f89] disabled:opacity-50 text-white px-5 h-[42px] rounded-full flex items-center gap-1 text-[13px] md:text-[14px] duration-200"
              >
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
              <h2 className="text-[20px] font-bold">
                Campaign Detail — {detailData.name}
              </h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={downloadReport}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                >
                  Download Excel
                </button>

                <button
                  onClick={() => setShowDetail(false)}
                  className="text-[24px] text-gray-500"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  ["Total", detailData.total],
                  ["Answered", detailData.success],
                  ["Failed", detailData.failed],
                  ["Invalid", detailData.invalid],
                  ["Caller ID", detailData.caller_id],
                  ["Job ID", detailData.job_id || "-"],
                  ["Status", detailData.status],
                  ["Voice File ID", detailData.voice_file_id || detailData.media_file_id || "-"],
                ].map(([label, val], i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[12px] text-gray-500">{label}</p>
                    <p className="text-[16px] font-bold">{val}</p>
                  </div>
                ))}
              </div>

              {detailData.responses && detailData.responses.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold mb-3">
                    IVR / DTMF Responses
                  </h3>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left border-b">
                            Mobile Number
                          </th>
                          <th className="px-4 py-3 text-left border-b">
                            Pressed Key
                          </th>
                          <th className="px-4 py-3 text-left border-b">
                            Response
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {detailData.responses.map((r, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2">
                              {r.mobile}
                            </td>

                            <td className="px-4 py-2 font-bold">
                              {r.dtmf}
                            </td>

                            <td className="px-4 py-2">
                              {r.dtmf === "1"
                                ? "Interested"
                                : r.dtmf === "2"
                                  ? "Call Back"
                                  : r.dtmf === "3"
                                    ? "Not Interested"
                                    : `Pressed ${r.dtmf}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignReoprts;