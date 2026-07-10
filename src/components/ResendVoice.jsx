// ===============================
// ResendVoice.jsx
// ===============================
import React, { useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { BASE } from "./api";

export const ResendVoice = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [resending, setResending] = useState(null); // store campaign id being resent

  const handleGetCampaign = async () => {
    if (!fromDate || !toDate) { alert("Please Select Date ❌"); return; }
    try {
      setLoading(true);
      const userId = sessionStorage.getItem("user_id");
      const res = await fetch(`${BASE}/get-campaigns/?user_id=${userId}`);
      const data = await res.json();

      const filtered = data.filter((r) => {
        const d = new Date(r.created_at);
        return d >= new Date(fromDate) && d <= new Date(toDate + "T23:59:59");
      });

      if (filtered.length > 0) {
        setCampaigns(filtered);
        alert(`✅ ${filtered.length} Campaign Found`);
      } else {
        setCampaigns([]);
        alert("No Campaign Found ❌");
      }
    } catch (err) {
      console.log(err);
      alert("Server Error ❌");
    }
    setLoading(false);
  };

  const handleResend = async (campaign) => {
    if (!window.confirm(`Resend campaign "${campaign.name}"?`)) return;
    try {
      setResending(campaign.id);
      const userId = sessionStorage.getItem("user_id");

      // Extract numbers from stored results
      const numbers = campaign.results
        ? campaign.results.map(r => r.number).filter(Boolean)
        : [];

      if (numbers.length === 0) {
        alert("No numbers found in this campaign ❌");
        setResending(null);
        return;
      }

      // Use voice_file_id or media_file_id — both returned from backend
      const mediaFileId = campaign.voice_file_id || campaign.media_file_id || "";

      if (!mediaFileId) {
        alert("Voice File ID not found in this campaign ❌");
        setResending(null);
        return;
      }

      const res = await fetch(`${BASE}/send-bulk-voice/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          numbers: numbers,
          media_file_id: mediaFileId,
          caller_id: campaign.caller_id || "",
          plan_id: campaign.plan_id || "2",
          call_type: campaign.call_type || "2",
          campaign_name: `Resend - ${campaign.name}`,
        }),
      });

      const data = await res.json();
      alert(data.status === "done"
        ? `🚀 Resend Successful!\nTotal: ${data.total} | Success: ${data.success} | Failed: ${data.failed}`
        : `❌ Failed: ${data.message || ""}`
      );
    } catch (err) {
      alert("Error ❌");
    }
    setResending(null);
  };

  return (
    <div className="min-h-screen bg-[#efefef] p-3 md:p-5">
      <div className="w-full bg-[#f3f3f3] rounded-[22px] border border-[#ef7fa4] overflow-hidden shadow-sm">
        <div className="bg-[#ececec] border-b border-[#e5e5e5] px-4 md:px-7 py-6">
          <h1 className="text-[18px] md:text-[24px] font-[700] text-black uppercase">Resend Voice</h1>
        </div>
        <div className="px-4 md:px-7 py-10">
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <label className="block text-[15px] md:text-[16px] text-[#6f6f6f] mb-3 font-medium">FromDate</label>
              <div className="relative">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="w-[300px] md:w-[305px] h-[58px] rounded-[16px] border border-[#bfbfbf] bg-white px-5 pr-12 text-[18px] font-[500] outline-none" />
                <CalendarDays size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-black" />
              </div>
            </div>
            <div>
              <label className="block text-[15px] md:text-[16px] text-[#6f6f6f] mb-3 font-medium">ToDate</label>
              <div className="relative">
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="w-[300px] md:w-[305px] h-[58px] rounded-[16px] border border-[#bfbfbf] bg-white px-5 pr-12 text-[18px] font-[500] outline-none" />
                <CalendarDays size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-black" />
              </div>
            </div>
            <button onClick={handleGetCampaign} disabled={loading}
              className="w-[190px] h-[130px] rounded-[28px] overflow-hidden bg-[#e17097] hover:bg-[#da5f89] duration-300 flex items-center justify-center">
              <div className="flex w-full h-full">
                <div className="flex-1 flex flex-col items-center justify-center text-white">
                  <span className="text-[18px] md:text-[20px] font-[700] leading-[35px]">{loading ? "Loading..." : "Get"}</span>
                  <span className="text-[18px] md:text-[20px] font-[700] leading-[35px]">Campaign</span>
                </div>
                <div className="w-[60px] bg-[#d85c87] flex items-center justify-center">
                  <Search size={28} className="text-white" />
                </div>
              </div>
            </button>
          </div>

          {campaigns.length > 0 && (
            <div className="mt-8 overflow-x-auto rounded-[14px] border border-[#e2e2e2] bg-white">
              <table className="w-full min-w-[700px]">
                <thead className="bg-[#fafafa]">
                  <tr>
                    {["Name", "Total", "Success", "Failed", "Invalid", "Date", "Action"].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[13px] font-bold border-b">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-[13px]">{c.name}</td>
                      <td className="px-4 py-3 text-[13px]">{c.total}</td>
                      <td className="px-4 py-3 text-[13px] text-green-600 font-semibold">{c.success}</td>
                      <td className="px-4 py-3 text-[13px] text-red-500 font-semibold">{c.failed}</td>
                      <td className="px-4 py-3 text-[13px] text-orange-500 font-semibold">{c.invalid}</td>
                      <td className="px-4 py-3 text-[13px]">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleResend(c)}
                          disabled={resending === c.id}
                          className="bg-[#e17097] text-white px-4 py-2 rounded-full text-[12px] disabled:opacity-50"
                        >
                          {resending === c.id ? "Sending..." : "Resend"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResendVoice;