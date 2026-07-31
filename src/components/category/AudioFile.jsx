import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  AlertCircle, CheckCircle2, Trash2, Info, Phone, ShieldCheck,
  UploadCloud, Download, Music, Loader2, Play, Pause, Volume2,
  MoreVertical, Filter, Search, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { BASE } from "../api";

// =====================================
// CLOUDINARY CONFIG — fill these 2 values
// =====================================
const CLOUDINARY_CLOUD_NAME = "x1s3wisn";
const CLOUDINARY_UPLOAD_PRESET = "voice_uploads";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", CLOUDINARY_UPLOAD_URL);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText).secure_url); }
        catch { reject(new Error("Invalid response from hosting")); }
      } else reject(new Error("Upload failed — check Cloudinary preset/cloud name"));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

const fmtTime = (s) => {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

// ── Row audio player (Play column) ──
function RowPlayer({ src, onDuration }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
    setPlaying(!playing);
  };

  const seek = (e) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
    setCurrent(Number(e.target.value));
  };

  return (
    <div className="flex items-center gap-2 min-w-[220px]">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={(e) => { setDuration(e.target.duration); onDuration?.(e.target.duration); }}
        onTimeUpdate={(e) => setCurrent(e.target.currentTime)}
        onEnded={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        className="w-7 h-7 rounded-full bg-gray-800 text-white flex items-center justify-center shrink-0"
      >
        {playing ? <Pause size={12} /> : <Play size={12} className="ml-[1px]" />}
      </button>

      <span className="text-[12px] text-gray-500 whitespace-nowrap">
        {fmtTime(current)} / {fmtTime(duration)}
      </span>

      <input
        type="range"
        min={0}
        max={duration || 0}
        value={current}
        onChange={seek}
        className="w-[80px] accent-gray-700"
      />

      <button
        onClick={() => { const a = audioRef.current; if (a) { a.muted = !muted; setMuted(!muted); } }}
        className="text-gray-500 hover:text-gray-700 shrink-0"
      >
        <Volume2 size={16} />
      </button>

      <button className="text-gray-400 hover:text-gray-600 shrink-0">
        <MoreVertical size={16} />
      </button>
    </div>
  );
}

export default function AudioFile() {

  // ── VOICE FILE STATES ──
  const [friendlyName, setFriendlyName] = useState("");
  const [audioFile,    setAudioFile]    = useState(null);
  const [mediaList,    setMediaList]    = useState([]);
  const [loadingList,  setLoadingList]  = useState(false);
  const [approvingId,  setApprovingId]  = useState(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  // ── TABLE — search / pagination ──
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [durations, setDurations] = useState({}); // { [id]: seconds }

  // ── CALLER ID STATES ──
  const [callerName,   setCallerName]   = useState("");
  const [callerNumber, setCallerNumber] = useState("");
  const [callerList,   setCallerList]   = useState([]);
  const [callerLoading, setCallerLoading] = useState(false);

  // ── POPUP ──
  const [popup, setPopup] = useState(false);
  const [msg,   setMsg]   = useState("");
  const [type,  setType]  = useState("");

  const showPopup = (t, m) => { setType(t); setMsg(m); setPopup(true); };

  const userId   = () => sessionStorage.getItem("user_id");
  const userRole = () => sessionStorage.getItem("role");
  const isAdmin  = userRole() === "admin";

  useEffect(() => { loadMedia(); loadCallerIds(); }, []);

  const loadMedia = async () => {
    try {
      setLoadingList(true);
      const res  = await fetch(`${BASE}/get-media-files/?user_id=${userId()}`);
      const data = await res.json();
      setMediaList(Array.isArray(data) ? data : []);
    } catch (err) { console.log(err); }
    setLoadingList(false);
  };

  const pickFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) { showPopup("error", "Please select a valid audio file"); return; }
    setAudioFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileSelect = (e) => pickFile(e.target.files[0]);

  const cancelFile = () => {
    setAudioFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!audioFile)  { showPopup("error", "Please choose the audio file to upload"); return; }
    if (!friendlyName.trim()) { showPopup("error", "Please enter a file name"); return; }
    if (!selectedType) { showPopup("error", "Please select a type"); return; }

    setAudioUploading(true);
    setUploadProgress(0);

    try {
      const hostedUrl = await uploadToCloudinary(audioFile, setUploadProgress);

      const res = await fetch(`${BASE}/upload-media/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId(),
          name: friendlyName,
          voice_file: audioFile.name,
          media_url: hostedUrl,
          type: selectedType,
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        showPopup("success", "Voice file uploaded! It will be available for sending after admin approval.");
        resetForm();
        loadMedia();
      } else {
        showPopup("error", data.message || "Failed");
      }
    } catch (err) {
      console.log(err);
      showPopup("error", err.message || "Upload failed, please try again ❌");
    }

    setAudioUploading(false);
    setUploadProgress(0);
  };

  const resetForm = () => {
    setFriendlyName("");
    setSelectedType("");
    setAudioFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm("Delete this voice file?")) return;
    try {
      const res  = await fetch(`${BASE}/delete-media/`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ media_id: mediaId }),
      });
      const data = await res.json();
      if (data.status === "success") loadMedia();
    } catch { showPopup("error", "Error ❌"); }
  };

  const handleApproveMedia = async (mediaId) => {
    try {
      setApprovingId(mediaId);
      const res  = await fetch(`${BASE}/approve-media/`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ media_id: mediaId, admin_id: userId() }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showPopup("success", "Voice file approved! It will now show on the user's campaign page.");
        loadMedia();
      } else {
        showPopup("error", data.message || "Approve failed");
      }
    } catch { showPopup("error", "Network Error ❌"); }
    setApprovingId(null);
  };

  // ==============================
  // CALLER IDs
  // ==============================
  const loadCallerIds = async () => {
    try {
      setCallerLoading(true);
      const res  = await fetch(`${BASE}/get-caller-ids/?user_id=${userId()}`);
      const data = await res.json();
      setCallerList(Array.isArray(data) ? data : []);
    } catch (err) { console.log(err); }
    setCallerLoading(false);
  };

  const handleAddCaller = async () => {
    if (!callerName.trim())   { showPopup("error", "Please enter a label");        return; }
    if (!callerNumber.trim()) { showPopup("error", "Please enter the caller number"); return; }
    try {
      const res  = await fetch(`${BASE}/add-caller-id/`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ user_id: userId(), name: callerName, number: callerNumber }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showPopup("success", "Caller ID saved!");
        setCallerName(""); setCallerNumber("");
        loadCallerIds();
      } else {
        showPopup("error", data.message || "Failed");
      }
    } catch { showPopup("error", "Network Error ❌"); }
  };

  const handleDeleteCaller = async (id) => {
    if (!window.confirm("Delete this Caller ID?")) return;
    try {
      const res  = await fetch(`${BASE}/delete-caller-id/`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ caller_id: id }),
      });
      const data = await res.json();
      if (data.status === "success") loadCallerIds();
    } catch { showPopup("error", "Error ❌"); }
  };

  // ==============================
  // TABLE — filter + pagination
  // ==============================
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return mediaList;
    const q = searchTerm.toLowerCase();
    return mediaList.filter((f) => (f.name || "").toLowerCase().includes(q));
  }, [mediaList, searchTerm]);

  const totalEntries = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const pageStart = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, totalEntries);

  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const goToPage = (p) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  // ==============================
  // RENDER
  // ==============================
  return (
    <>
      <div className="w-full">

        {/* ═══════════════════════════════
            AUDIO STORE — table
        ════════════════════════════════ */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">

          <div className="px-5 py-2 border-b border-gray-200">
            <h1 className="text-[20px] font-semibold text-[#1d2756]">Audio Store</h1>
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2">
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 bg-[#3F51B5] text-white px-4 h-[34px] rounded-lg text-[14px] font-medium hover:opacity-90"
            >
              <Filter size={14} />
              Clear
            </button>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search keyword"
                className="h-[38px] w-[220px] border border-gray-300 rounded-lg pl-9 pr-3 text-[13px] outline-none focus:border-[#3F51B5]"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-5 py-2 text-left text-[13px] font-semibold text-gray-700">File Name</th>
                  <th className="px-5 py-2 text-left text-[13px] font-semibold text-gray-700">File Duration (In Sec)</th>
                  <th className="px-5 py-2 text-left text-[13px] font-semibold text-gray-700">Status</th>
                  <th className="px-5 py-2 text-left text-[13px] font-semibold text-gray-700">Upload Time</th>
                  <th className="px-5 py-2 text-left text-[13px] font-semibold text-gray-700">Approved Time</th>
                  <th className="px-5 py-2 text-left text-[13px] font-semibold text-gray-700">Play</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr><td colSpan="6" className="text-center py-4 text-gray-400">Loading...</td></tr>
                ) : pagedList.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-4 text-gray-400">No files yet — add one below</td></tr>
                ) : pagedList.map((f) => (
                  <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-2">
                      <p className="text-[14px] font-medium text-[#3F51B5]">{f.voice_file_id || f.name}</p>
                      <p className="text-[12px] text-gray-500">Type - {f.type || "Trans"}</p>
                    </td>
                    <td className="px-5 py-2 text-[13px] text-gray-700">
                      {durations[f.id] ? Math.round(durations[f.id]) : "-"}
                    </td>
                    <td className="px-5 py-2">
                      <span className={`text-[12px] font-medium ${
                        f.status === "Approved" ? "text-green-600" : "text-yellow-600"
                      }`}>
                        {f.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-[13px] text-gray-700 whitespace-nowrap">
                      {f.upload_time || "-"}
                    </td>
                    <td className="px-5 py-2 text-[13px] text-gray-700 whitespace-nowrap">
                      {f.approved_time || "-"}
                    </td>
                    <td className="px-5 py-2">
                      {f.media_url ? (
                        <div className="flex items-center gap-3">
                          <RowPlayer
                            src={f.media_url}
                            onDuration={(d) => setDurations((prev) => ({ ...prev, [f.id]: d }))}
                          />
                          <a
                            href={f.media_url}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 hover:text-[#3F51B5]"
                            title="Download"
                          >
                            <Download size={15} />
                          </a>
                          {isAdmin && f.status !== "Approved" && (
                            <button
                              onClick={() => handleApproveMedia(f.id)}
                              disabled={approvingId === f.id}
                              className="text-green-600 hover:text-green-700"
                              title="Approve"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMedia(f.id)}
                            className="text-red-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-wrap items-center justify-center gap-2 px-5 py-2">
            <span className="text-[13px] text-gray-500 mr-3">
              {totalEntries === 0
                ? "Showing 0 entries"
                : `Showing ${pageStart} to ${pageEnd} of ${totalEntries} entries`}
            </span>

            <button onClick={() => goToPage(1)} className="text-gray-500 hover:text-[#3F51B5] disabled:opacity-30" disabled={currentPage === 1}>
              <ChevronsLeft size={16} />
            </button>
            <button onClick={() => goToPage(currentPage - 1)} className="text-gray-500 hover:text-[#3F51B5] disabled:opacity-30" disabled={currentPage === 1}>
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`w-[30px] h-[30px] rounded-full text-[13px] font-medium ${
                  p === currentPage ? "bg-[#3F51B5] text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}

            <button onClick={() => goToPage(currentPage + 1)} className="text-gray-500 hover:text-[#3F51B5] disabled:opacity-30" disabled={currentPage === totalPages}>
              <ChevronRight size={16} />
            </button>
            <button onClick={() => goToPage(totalPages)} className="text-gray-500 hover:text-[#3F51B5] disabled:opacity-30" disabled={currentPage === totalPages}>
              <ChevronsRight size={16} />
            </button>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="ml-3 h-[30px] border border-gray-300 rounded-lg text-[13px] px-2 outline-none"
            >
              {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

        </div>

        {/* ═══════════════════════════════
            UPLOAD PANEL
        ════════════════════════════════ */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5">

          <p className="text-[15px] font-semibold text-[#1d2756] mb-3">Option 1 : Upload</p>

          {!isAdmin && (
            <div className="bg-purple-50 border border-purple-300 rounded-2xl px-5 py-2 mb-4 flex gap-3">
              <ShieldCheck size={22} className="text-purple-500 mt-1 shrink-0" />
              <div>
                <p className="text-[15px] font-bold text-purple-700 mb-1">Approval Required</p>
                <p className="text-[13px] text-purple-600 leading-6">
                  After uploading, the file will stay in <strong>"Pending"</strong> status. The admin will approve it,
                  and only then will it show on the Campaign page for sending.
                </p>
              </div>
            </div>
          )}

          {/* CHOOSE FILE */}
          <div className="mb-1">
            <label className="text-[13px] text-gray-700 mb-2 block">
              Choose file <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3 max-w-[540px]">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-[#3F51B5] text-white px-5 h-[39px] rounded-lg text-[14px] font-medium hover:opacity-90"
              >
                <UploadCloud size={16} />
                Choose
              </button>
              <button
                onClick={cancelFile}
                className="flex items-center gap-2 bg-gray-200 text-gray-600 px-5 h-[39px] rounded-lg text-[14px] font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {audioFile && (
              <p className="text-[13px] text-gray-700 font-medium mt-1 flex items-center gap-1">
                <Music size={14} /> {audioFile.name}
              </p>
            )}
            <p className="text-[12px] text-gray-400 mt-2">
              <span className="text-red-500">*</span>.wav, .mp3 and .ogg are acceptable.
            </p>
          </div>

          {/* PLAY PREVIEW */}
          <div className="mb-5 mt-3">
            <label className="text-[13px] text-gray-700 mb-2 block">Play</label>
            {previewUrl ? (
              <audio controls src={previewUrl} className="max-w-[540px] w-full h-[39px]" />
            ) : (
              <audio controls className="max-w-[540px] w-full h-[39px] opacity-50 pointer-events-none" />
            )}
          </div>

          {/* FILE NAME */}
          <div className="mb-5">
            <label className="text-[13px] text-gray-700 mb-1 block">File Name</label>
            <input
              type="text"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              className="w-full max-w-[540px] h-[41px] border border-gray-300 rounded-lg px-4 outline-none focus:border-[#3F51B5] text-[14px]"
            />
          </div>

          {/* TYPE */}
          <div className="mb-6">
            <label className="text-[13px] text-gray-700 mb-2 block">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full max-w-[540px] h-[41px] border border-gray-300 rounded-lg px-4 outline-none focus:border-[#3F51B5] text-[14px] bg-white"
            >
              <option value="">Select Type</option>
              <option value="Trans">Trans</option>
            </select>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={audioUploading}
              className="bg-[#3F51B5] disabled:opacity-60 text-white px-8 h-[42px] rounded-lg text-[14px] font-semibold hover:opacity-90 flex items-center gap-2"
            >
              {audioUploading ? <Loader2 size={16} className="animate-spin" /> : null}
              {audioUploading ? `Uploading... ${uploadProgress}%` : "Save"}
            </button>
            <button
              onClick={resetForm}
              className="bg-[#3F51B5] text-white px-8 h-[42px] rounded-lg text-[14px] font-semibold hover:opacity-90"
            >
              New
            </button>
          </div>

          {audioUploading && (
            <div className="mt-4 max-w-[540px] h-[8px] bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3F51B5] rounded-full transition-all duration-200 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

        </div>

        {/* ═══════════════════════════════
            CALLER IDs (unchanged)
        ════════════════════════════════ */}
        {/* <h1 className="text-[28px] font-bold text-[#1d2756] mb-4">Manage Caller IDs</h1>

        <div className="bg-green-50 border border-green-300 rounded-2xl px-5 py-4 mb-6 flex gap-3">
          <Phone size={22} className="text-green-600 mt-1 shrink-0" />
          <div>
            <p className="text-[15px] font-bold text-green-700 mb-1">Caller ID Setup</p>
            <p className="text-[13px] text-green-600 leading-6">
              Add caller IDs here as admin. These will show in the dropdown on the Campaign page.<br />
              Example: <strong>+918071390635</strong>
            </p>
          </div>
        </div> */}

        {/* <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text" value={callerName}
            onChange={(e) => setCallerName(e.target.value)}
            placeholder="Label (e.g. Main Number)"
            className="h-[50px] w-[240px] border border-gray-300 rounded-xl px-4 outline-none focus:border-green-400 text-[14px]"
          />
          <input
            type="text" value={callerNumber}
            onChange={(e) => setCallerNumber(e.target.value)}
            placeholder="Number (e.g. +918071390635)"
            className="h-[50px] w-[260px] border border-gray-300 rounded-xl px-4 outline-none focus:border-green-400 text-[14px]"
          />
          <button
            onClick={handleAddCaller}
            className="bg-gradient-to-r from-green-400 to-green-500 text-white px-6 h-[50px] rounded-xl text-[15px] font-semibold hover:scale-105 duration-300 shadow-md"
          >
            + Add Caller ID
          </button>
        </div>

        <div className="border border-green-300 bg-white rounded-2xl mb-10 overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b">
            <h2 className="text-[20px] font-bold text-gray-700">Saved Caller IDs</h2>
            <button onClick={loadCallerIds} className="text-green-500 text-[13px] underline">🔄 Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">#</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">Label</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">Number</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {callerLoading ? (
                  <tr><td colSpan="4" className="text-center py-6 text-gray-400">Loading...</td></tr>
                ) : callerList.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-6 text-gray-400">No caller IDs yet — add one above</td></tr>
                ) : callerList.map((c, i) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-5 py-3 text-[13px] text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 text-[14px] font-medium text-gray-700">{c.name}</td>
                    <td className="px-5 py-3 text-[14px] font-semibold text-green-600">{c.number}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDeleteCaller(c.id)}
                        className="bg-red-100 text-red-500 w-[32px] h-[32px] rounded-lg flex items-center justify-center hover:bg-red-200 duration-200"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div> */}

        {/* INSTRUCTIONS */}
        {/* <div className="bg-white border border-pink-200 rounded-2xl">
          <div className="px-5 py-4 border-b">
            <h2 className="text-[22px] font-bold text-gray-700">Instructions</h2>
          </div>
          <div className="p-4 space-y-4">
            {[
              { color: "bg-[#ff744f]", bg: "bg-[#f8e4df]", rule: "Rule 1", text: "First upload the audio file on the OBD server, then enter that exact filename here." },
              { color: "bg-[#16b7d7]", bg: "bg-[#a9e3ef]", rule: "Rule 2", text: "Also upload the same audio file here so it can be played and downloaded from this page." },
              { color: "bg-pink-500",  bg: "bg-[#f8edf5]", rule: "Rule 3", text: "The filename must match exactly — capital/small letters must match too." },
              { color: "bg-green-500", bg: "bg-[#e4f3e4]", rule: "Rule 4", text: "Enter the full number for Caller ID, including the country code." },
            ].map((r) => (
              <div key={r.rule} className="flex gap-4">
                <div className={`w-3 h-3 rounded-full ${r.color} mt-6 shrink-0`}></div>
                <div className={`${r.bg} rounded-2xl px-6 py-4 w-full`}>
                  <p className="text-[13px] text-gray-500 mb-1">{r.rule}</p>
                  <p className="text-[16px] font-semibold text-[#202c58]">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div> */}

      </div>

      {/* POPUP */}
      {popup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[320px] rounded-3xl p-6 text-center shadow-2xl">
            <div className="flex justify-center mb-4">
              {type === "error"
                ? <AlertCircle size={55} className="text-red-500" />
                : <CheckCircle2 size={55} className="text-green-500" />}
            </div>
            <h2 className="text-[26px] font-bold mb-2">{type === "error" ? "Error" : "Success"}</h2>
            <p className="text-[16px] text-gray-600">{msg}</p>
            <button
              onClick={() => setPopup(false)}
              className={`mt-5 px-6 py-2 rounded-full text-white text-[15px] font-semibold ${type === "error" ? "bg-red-500" : "bg-green-500"}`}
            >OK</button>
          </div>
        </div>
      )}
    </>
  );
}