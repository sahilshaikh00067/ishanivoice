import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { BASE } from "../api";

const CreditHistory = () => {
  const [creditData, setCreditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => { loadCreditData(); }, []);

  const loadCreditData = async () => {
    try {
      setLoading(true);
      const userId = sessionStorage.getItem("user_id");
      const res = await fetch(`${BASE}/credit-history/?user_id=${userId}`);
      const data = await res.json();

      if (!data || data.length === 0) { setCreditData([]); setLoading(false); return; }

      const formatted = data.map((item, index) => ({
        id: index + 1,
        date: new Date(item.created_at).toLocaleString(),
        funds: item.credit || 0,
        creditType:
          item.type === "credit"
            ? "Credit"
            : "Debit",
        remarks: item.remarks || `Credit Credited from Admin To UserName : ${item.username || "User"}`,
      }));

      setCreditData(formatted);
    } catch (err) {
      console.log(err);
      setCreditData([]);
    }
    setLoading(false);
  };

  const filteredData = creditData.filter((item) =>
    item.remarks?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / showEntries);
  const paginated = filteredData.slice((page - 1) * showEntries, page * showEntries);

  const handleExport = () => {
    if (filteredData.length === 0) { alert("No Data Found ❌"); return; }
    const rows = [["Date", "Funds", "Credit Type", "Remarks"].join(",")];
    filteredData.forEach((row) => {
      rows.push([row.date, row.funds, row.creditType, `"${row.remarks}"`].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "credit-report.csv"; a.click();
  };

  return (
    <div className="min-h-screen bg-[#efefef] p-2 md:p-4 overflow-x-hidden">
      <div className="w-full bg-[#f5f5f5] rounded-[28px] border border-[#ef7fa4] overflow-hidden shadow-sm">

        <div className="bg-[#efefef] border-b border-[#dddddd] px-6 md:px-9 py-7">
          <h1 className="text-[22px] md:text-[24px] font-[700] uppercase text-black tracking-wide">Credit History</h1>
        </div>

        <div className="px-5 md:px-9 py-10">
          <div className="flex items-center justify-between flex-wrap gap-5 mb-8">
            <div className="flex items-center gap-3 text-[18px] text-black">
              <span>Show</span>
              <select value={showEntries} onChange={(e) => { setShowEntries(Number(e.target.value)); setPage(1); }}
                className="w-[78px] h-[44px] border border-[#d8d8d8] rounded-[8px] px-3 bg-white outline-none text-[16px]">
                <option value="10">10</option><option value="25">25</option><option value="50">50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <button onClick={handleExport}
                className="bg-[#2dc653] hover:bg-[#25b449] duration-300 text-white px-8 h-[52px] rounded-full flex items-center gap-2 text-[16px] font-semibold">
                <Download size={18} /> Export
              </button>
              <div className="flex items-center gap-3">
                <span className="text-[17px] text-black">Search:</span>
                <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-[190px] md:w-[280px] h-[44px] border border-[#d8d8d8] rounded-[8px] px-3 bg-white outline-none text-[14px]" />
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-[18px] border border-[#e3e3e3] bg-white">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-[#fafafa]">
                  {["Date", "Funds", "Credit Type", "Remarks"].map((h, i) => (
                    <th key={i} className="border-r border-b border-[#e5e5e5] px-5 py-6 text-left text-[16px] font-[700] text-black">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-14 text-[15px]">Loading...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-14 text-[15px]">No data available in table</td></tr>
                ) : paginated.map((item, index) => (
                  <tr key={index} className="hover:bg-[#fafafa]">
                    <td className="border-r border-b border-[#ececec] px-5 py-7 text-[15px] text-black whitespace-nowrap">{item.date}</td>
                    <td className="border-r border-b border-[#ececec] px-5 py-7 text-[15px] text-black whitespace-nowrap">{item.funds}</td>
                    <td className="border-r border-b border-[#ececec] px-5 py-7 text-[15px] text-black whitespace-nowrap">{item.creditType}</td>
                    <td className="border-b border-[#ececec] px-5 py-7 text-[15px] text-black min-w-[600px]">{item.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-5 mt-7">
            <div className="text-[15px] text-black">
              Showing {filteredData.length === 0 ? 0 : (page - 1) * showEntries + 1} to{" "}
              {Math.min(page * showEntries, filteredData.length)} of {filteredData.length} entries
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="bg-[#e36f97] hover:bg-[#d95f89] disabled:opacity-50 text-white px-5 h-[42px] rounded-full flex items-center gap-1 text-[14px] duration-200">
                <ChevronLeft size={15} /> Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="bg-[#e36f97] hover:bg-[#d95f89] disabled:opacity-50 text-white px-5 h-[42px] rounded-full flex items-center gap-1 text-[14px] duration-200">
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditHistory;