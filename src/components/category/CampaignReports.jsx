import React, { useEffect, useState } from "react";
import { RotateCw, ChevronDown, X, Search, Download, ChevronsUpDown } from "lucide-react";
import { BASE } from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const OutboundReports = () => {
  // ---- Generate Report filters ----
  const [reportType, setReportType] = useState("");
  const [campaign, setCampaign] = useState(""); // "" = All Campaign
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [campaignsList, setCampaignsList] = useState([]);
  const [generating, setGenerating] = useState(false);

  const reportTypes = ["Call Detail Report", "Summary Report", "Disposition Report"];

  // ---- Download Reports table (built client-side, no extra backend needed) ----
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);
  const [page, setPage] = useState(1);
  let reqCounter = 17800;

  useEffect(() => {
    loadCampaignsList();
  }, []);

  const loadCampaignsList = async () => {
    try {
      const userId = sessionStorage.getItem("user_id");
      const res = await fetch(`${BASE}/get-campaigns/?user_id=${userId}`);
      const data = await res.json();
      setCampaignsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      setCampaignsList([]);
    }
  };

  const inRange = (createdAt) => {
    if (!startDate && !endDate) return true;
    const d = new Date(createdAt);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate)) return false;
    return true;
  };

  // ==============================
  // GENERATE REPORT — pulls real data from your existing endpoints
  // ==============================
  const handleGenerateReport = async () => {
    if (!reportType) {
      alert("Please select Report Type");
      return;
    }

    setGenerating(true);
    try {
      let sheetRows = [];
      let campaignLabel = "All Campaign";

      if (!campaign) {
        // ---- All Campaign: summary from /get-campaigns/ (already loaded) ----
        const filtered = campaignsList.filter((r) => inRange(r.created_at));
        if (filtered.length === 0) {
          alert("No campaign data found for this date range");
          setGenerating(false);
          return;
        }
        sheetRows = filtered.map((r) => ({
          Date: new Date(r.created_at).toLocaleDateString(),
          Name: r.name,
          "Caller ID": r.caller_id || "-",
          Total: r.total || 0,
          Answered: r.success || 0,
          "No Answer": r.no_answer || 0,
          Failed: r.failed || 0,
          Invalid: r.invalid || 0,
          Status: r.status || "",
          "Job ID": r.job_id || "-",
        }));
      } else {
        // ---- Specific campaign: pull real detail ----
        const selected = campaignsList.find((c) => String(c.id) === String(campaign));
        campaignLabel = selected?.name || `Campaign ${campaign}`;

        const res = await fetch(`${BASE}/get-campaign-detail/?campaign_id=${campaign}`);
        const detail = await res.json();

        if (detail.status === "pending") {
          alert("Campaign is still pending. Report will be available after completion.");
          setGenerating(false);
          return;
        }

        if (reportType === "Disposition Report") {
          if (!detail.dispositions || detail.dispositions.length === 0) {
            alert("No disposition data found. Upload the disposition report for this campaign first.");
            setGenerating(false);
            return;
          }
          sheetRows = detail.dispositions.map((d) => ({
            Number: d.mobile,
            Date: d.call_date,
            "Dial Time": d.dial_time,
            "Answer Time": d.answered_time || "-",
            "End Time": d.end_time,
            "Duration(s)": d.duration,
            "Call Status": d.call_status,
            Disposition: d.disposition,
            Retry: d.retry,
            Pulse: d.pulse,
            DTMF: d.dtmf_input || "-",
          }));
        } else {
          // Call Detail Report / Summary Report -> Number + Status list
          const results = detail.results || [];
          if (results.length === 0) {
            alert("No report data found for this campaign");
            setGenerating(false);
            return;
          }
          sheetRows = results.map((r) => ({ Number: r.number, Status: r.status }));
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      reqCounter += 1;
      const now = new Date();
      const newRequest = {
        id: reqCounter,
        request_date: now.toLocaleString(),
        start_date: startDate ? new Date(startDate).toLocaleString() : "-",
        end_date: endDate ? new Date(endDate).toLocaleString() : "-",
        report_type: reportType,
        campaign_name: campaignLabel,
        status: "Report Generated",
        blob,
        fileName: `${campaignLabel.replace(/\s+/g, "_")}_${reportType.replace(/\s+/g, "_")}.xlsx`,
      };

      setRequests((prev) => [newRequest, ...prev]);
      setPage(1);
    } catch (err) {
      console.log(err);
      alert("Something went wrong while generating the report ❌");
    }
    setGenerating(false);
  };

  const handleDownload = (row) => {
    if (row.status !== "Report Generated" || !row.blob) {
      alert("Report is still processing. Please wait.");
      return;
    }
    saveAs(row.blob, row.fileName);
  };

  const filteredRequests = requests.filter(
    (r) =>
      (r.campaign_name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(r.id).includes(search) ||
      (r.report_type || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filteredRequests.length / showEntries) || 1;
  const paginated = filteredRequests.slice((page - 1) * showEntries, page * showEntries);

  return (
    <div className="min-h-screen bg-[#eef0f5] p-3 md:p-5">
      {/* TABS */}
      <div className="flex items-center gap-1">
        <div className="px-5 py-2.5 bg-[#3d4b94] text-white text-[14px] font-[600] rounded-t-lg">
          Reports
        </div>

      </div>

      {/* GENERATE REPORT CARD */}
      <div className="bg-white rounded-b-lg rounded-tr-lg border border-[#e2e5ec] shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eee]">
          <h2 className="text-[14px] font-[600] text-black">Outbound Reports</h2>
          <div className="flex items-center gap-2 text-[12px] text-gray-500">
            <RotateCw size={15} className="cursor-pointer" onClick={loadCampaignsList} />
            <span>Dashboard &gt; Voice &gt; Reports &gt; Detail Report &gt; Version: v1.0</span>
          </div>
        </div>

        <div className="px-5 py-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
          {/* LEFT COLUMN */}
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <label className="w-[110px] text-[13px] text-gray-600 shrink-0">Select Report</label>
              <div className="relative flex-1">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full h-[38px] appearance-none border border-[#dcdfe6] rounded-md bg-[#f7f8fa] px-3 pr-16 text-[13px] outline-none"
                >
                  <option value="">Select Report Type</option>
                  {reportTypes.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400">
                  {reportType && <X size={13} className="cursor-pointer" onClick={() => setReportType("")} />}
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="w-[110px] text-[13px] text-gray-600 shrink-0">Select Campaign</label>
              <div className="relative flex-1">
                <select
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  className="w-full h-[38px] appearance-none border border-[#dcdfe6] rounded-md bg-[#f7f8fa] px-3 pr-16 text-[13px] outline-none"
                >
                  <option value="">All Campaign</option>
                  {campaignsList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400">
                  {campaign && <X size={13} className="cursor-pointer" onClick={() => setCampaign("")} />}
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <label className="w-[80px] text-[13px] text-gray-600 shrink-0">Start Date</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 h-[38px] border border-[#dcdfe6] rounded-md bg-[#f7f8fa] px-3 text-[13px] outline-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-[80px] text-[13px] text-gray-600 shrink-0">End Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 h-[38px] border border-[#dcdfe6] rounded-md bg-[#f7f8fa] px-3 text-[13px] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="px-5 pb-6">
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="h-[40px] px-6 rounded-md bg-[#3d4b94] hover:bg-[#323d78] disabled:opacity-50 text-white text-[13px] font-[600]"
          >
            {generating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* DOWNLOAD REPORTS CARD */}
      <div className="bg-white rounded-lg border border-[#e2e5ec] shadow-sm mt-4">
        <div className="px-5 py-4 border-b border-[#eee]">
          <h2 className="text-[14px] font-[600] text-black">Download Reports</h2>
        </div>

        <div className="px-5 pt-4 flex items-center justify-end gap-3">
          <span className="text-[13px] text-gray-500">Search:</span>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Enter keyword"
              className="w-[200px] h-[36px] border border-[#dcdfe6] rounded-md pl-8 pr-3 text-[13px] outline-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#f5f6f9]">
                {["Request ID", "Request Date", "Start Date", "End Date", "Report Type", "Campaign Name", "Status", "Download"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left border-b border-[#eee]">
                    <div className="flex items-center gap-1 text-[12px] font-[700] text-gray-700 whitespace-nowrap">
                      {h}
                      {h !== "Download" && <ChevronsUpDown size={12} className="text-gray-300" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-10 text-[13px] text-gray-500">No data available in table</td></tr>
              ) : paginated.map((row) => (
                <tr key={row.id} className="hover:bg-[#fafbfc] duration-150">
                  <td className="px-3 py-3 border-b border-[#f1f1f1] text-[12.5px] text-[#3d4b94] font-[600]">{row.id}</td>
                  <td className="px-3 py-3 border-b border-[#f1f1f1] text-[12.5px] whitespace-nowrap">{row.request_date}</td>
                  <td className="px-3 py-3 border-b border-[#f1f1f1] text-[12.5px] whitespace-nowrap">{row.start_date}</td>
                  <td className="px-3 py-3 border-b border-[#f1f1f1] text-[12.5px] whitespace-nowrap">{row.end_date}</td>
                  <td className="px-3 py-3 border-b border-[#f1f1f1] text-[12.5px]">{row.report_type}</td>
                  <td className="px-3 py-3 border-b border-[#f1f1f1] text-[12.5px]">{row.campaign_name}</td>
                  <td className="px-3 py-3 border-b border-[#f1f1f1] text-[12.5px]">{row.status}</td>
                  <td className="px-3 py-3 border-b border-[#f1f1f1]">
                    <button
                      onClick={() => handleDownload(row)}
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-white ${
                        row.status === "Report Generated" ? "bg-[#2fa84f] hover:bg-[#279144]" : "bg-[#e1483f] hover:bg-[#c93e36]"
                      }`}
                    >
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="px-5 pb-5 flex items-center justify-between flex-wrap gap-3">
          <div className="text-[12.5px] text-gray-500">
            Showing {filteredRequests.length === 0 ? 0 : (page - 1) * showEntries + 1} to{" "}
            {Math.min(page * showEntries, filteredRequests.length)} of {filteredRequests.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="w-[30px] h-[30px] rounded-md border border-[#dcdfe6] text-gray-600 disabled:opacity-40 text-[12px]">«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-[30px] h-[30px] rounded-md border border-[#dcdfe6] text-gray-600 disabled:opacity-40 text-[12px]">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 4).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-[30px] h-[30px] rounded-md text-[12px] ${page === p ? "bg-[#3d4b94] text-white" : "border border-[#dcdfe6] text-gray-600"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-[30px] h-[30px] rounded-md border border-[#dcdfe6] text-gray-600 disabled:opacity-40 text-[12px]">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="w-[30px] h-[30px] rounded-md border border-[#dcdfe6] text-gray-600 disabled:opacity-40 text-[12px]">»</button>
            <select
              value={showEntries}
              onChange={(e) => { setShowEntries(Number(e.target.value)); setPage(1); }}
              className="h-[30px] border border-[#dcdfe6] rounded-md px-2 text-[12px] outline-none ml-1"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutboundReports;