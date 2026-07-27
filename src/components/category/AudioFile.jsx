import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Trash2, Info, Phone, ShieldCheck, UploadCloud, Download, Music, Loader2 } from "lucide-react";
import { BASE } from "../api";

// =====================================
// CLOUDINARY CONFIG — fill these 2 values
// (Dashboard → Cloud name, Settings → Upload → your unsigned preset)
// =====================================
const CLOUDINARY_CLOUD_NAME = "x1s3wisn";
const CLOUDINARY_UPLOAD_PRESET = "voice_uploads";

// Cloudinary treats audio files under the "video" resource type
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

// Direct browser -> Cloudinary upload with live progress, no backend proxy involved
function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", CLOUDINARY_UPLOAD_URL);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } catch {
          reject(new Error("Invalid response from hosting"));
        }
      } else {
        reject(new Error("Upload failed — check Cloudinary preset/cloud name"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

export default function AudioFile() {

  // ── VOICE FILE STATES ──
  const [friendlyName, setFriendlyName] = useState("");
  const [mediaUrl,     setMediaUrl]     = useState("");   // OBD server filename e.g. Today.wav
  const [audioFile,    setAudioFile]    = useState(null); // actual selected audio file
  const [mediaList,    setMediaList]    = useState([]);
  const [loadingList,  setLoadingList]  = useState(false);
  const [approvingId,  setApprovingId]  = useState(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

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
  const userRole = () => sessionStorage.getItem("role"); // "admin" | "reseller" | "user"
  const isAdmin  = userRole() === "admin";

  useEffect(() => { loadMedia(); loadCallerIds(); }, []);

  // ==============================
  // VOICE FILES
  // ==============================
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
    if (!file.type.startsWith("audio/")) {
      showPopup("error", "Please select a valid audio file");
      return;
    }
    setAudioFile(file);
  };

  const handleFileSelect = (e) => pickFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  // ==============================
  // UPLOAD — direct to Cloudinary, then just tell backend the URL
  // ==============================
  const handleUpload = async () => {
    if (!friendlyName.trim()) { showPopup("error", "Please enter a name"); return; }
    if (!mediaUrl.trim())     { showPopup("error", "Please enter voice filename (e.g. Today.wav)"); return; }
    if (!audioFile)           { showPopup("error", "Please select the audio file to upload"); return; }

    setAudioUploading(true);
    setUploadProgress(0);

    try {
      // 1) Fast direct upload straight from the browser to Cloudinary's CDN
      const hostedUrl = await uploadToCloudinary(audioFile, setUploadProgress);

      // 2) Tell our backend the file's already hosted — instant save, no re-upload
      const res = await fetch(`${BASE}/upload-media/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId(),
          name: friendlyName,
          voice_file: mediaUrl,
          media_url: hostedUrl,
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        showPopup("success", "Voice file uploaded! It will be available for sending after admin approval.");
        setMediaUrl(""); setFriendlyName(""); setAudioFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
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
  // RENDER
  // ==============================
  return (
    <>
      <div className="w-full">

        {/* ═══════════════════════════════
            SECTION 1 — VOICE FILES
        ════════════════════════════════ */}
        <h1 className="text-[28px] font-bold text-[#1d2756] mb-4">Upload Voice File</h1>

        {/* APPROVAL NOTICE (shown to non-admins) */}
        {!isAdmin && (
          <div className="bg-purple-50 border border-purple-300 rounded-2xl px-5 py-4 mb-6 flex gap-3">
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

        {/* NAME INPUT */}
        <div className="mb-3">
          <input
            type="text" value={friendlyName}
            onChange={(e) => setFriendlyName(e.target.value)}
            placeholder="Audio Name (e.g. Diwali Campaign)"
            className="w-full max-w-[540px] h-[50px] border border-gray-300 rounded-xl px-4 outline-none focus:border-pink-400 text-[15px] transition-colors"
          />
        </div>

        {/* FILENAME INPUT (must match OBD server filename) */}
        <div className="mb-4">
          <input
            type="text" value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Voice filename Only .wav & .mp3 form e.g. abc.wav , xyz.mp3"
            className="w-full max-w-[540px] h-[50px] border border-gray-300 rounded-xl px-4 outline-none focus:border-pink-400 text-[14px] transition-colors"
          />
        </div>

        {/* DRAG & DROP FILE UPLOAD */}
        <div className="mb-6">
          <label className="text-[13px] font-semibold text-gray-500 mb-2 block">Upload Audio File</label>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`max-w-[540px] rounded-2xl border-2 border-dashed cursor-pointer px-6 py-6 flex items-center gap-4 transition-all duration-300
              ${dragActive ? "border-pink-400 bg-pink-50 scale-[1.01]" : "border-gray-300 bg-[#fafafa] hover:border-pink-300 hover:bg-pink-50/40"}`}
          >
            <div className="w-11 h-11 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
              <UploadCloud size={20} className="text-pink-500" />
            </div>
            <div className="flex-1 min-w-0">
              {audioFile ? (
                <p className="text-[13px] text-gray-700 font-semibold flex items-center gap-1 truncate">
                  <Music size={14} className="shrink-0" /> {audioFile.name}
                </p>
              ) : (
                <>
                  <p className="text-[13px] text-gray-600 font-medium">Click to browse or drag & drop audio here</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">MP3 or WAV files</p>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap mb-8">
          <button
            onClick={handleUpload}
            disabled={audioUploading}
            className="bg-gradient-to-r from-pink-400 to-pink-500 disabled:opacity-60 text-white px-6 py-3 rounded-full text-[16px] font-semibold hover:scale-105 duration-300 shadow-md flex items-center gap-2"
          >
            {audioUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
            {audioUploading ? `Uploading... ${uploadProgress}%` : "Save Voice File"}
          </button>

          {/* PROGRESS BAR */}
          {audioUploading && (
            <div className="flex-1 min-w-[180px] max-w-[300px] h-[8px] bg-pink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* VOICE FILES TABLE */}
        <div className="border border-pink-300 bg-white rounded-2xl mb-10 overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b">
            <h2 className="text-[20px] font-bold text-gray-700">Saved Voice Files</h2>
            <button onClick={loadMedia} className="text-pink-500 text-[13px] underline">🔄 Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">#</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">Name</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">Voice File</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">Audio</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">Status</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold text-gray-500 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr><td colSpan="6" className="text-center py-6 text-gray-400">Loading...</td></tr>
                ) : mediaList.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-6 text-gray-400">No files yet — add one above</td></tr>
                ) : mediaList.map((f, i) => (
                  <tr key={f.id} className="border-b hover:bg-gray-50">
                    <td className="px-5 py-3 text-[13px] text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 text-[14px] font-medium text-gray-700">{f.name}</td>
                    <td className="px-5 py-3 text-[13px] text-gray-500">{f.voice_file_id}</td>
                    <td className="px-5 py-3">
                      {f.media_url ? (
                        <div className="flex items-center gap-2">
                          <audio controls src={f.media_url} className="h-[32px] max-w-[220px]" />
                          <a
                            href={f.media_url}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="text-pink-500 hover:text-pink-600"
                            title="Download"
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[12px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-3 py-1 rounded-full font-semibold ${
                        f.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {f.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {isAdmin && f.status !== "Approved" && (
                          <button
                            onClick={() => handleApproveMedia(f.id)}
                            disabled={approvingId === f.id}
                            className="bg-green-100 text-green-600 px-3 h-[32px] rounded-lg text-[12px] font-semibold flex items-center gap-1 hover:bg-green-200 duration-200 disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} />
                            {approvingId === f.id ? "..." : "Approve"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMedia(f.id)}
                          className="bg-red-100 text-red-500 w-[32px] h-[32px] rounded-lg flex items-center justify-center hover:bg-red-200 duration-200"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════════════════════════════
            SECTION 2 — CALLER IDs
        ════════════════════════════════ */}
        <h1 className="text-[28px] font-bold text-[#1d2756] mb-4">Manage Caller IDs</h1>

        <div className="bg-green-50 border border-green-300 rounded-2xl px-5 py-4 mb-6 flex gap-3">
          <Phone size={22} className="text-green-600 mt-1 shrink-0" />
          <div>
            <p className="text-[15px] font-bold text-green-700 mb-1">Caller ID Setup</p>
            <p className="text-[13px] text-green-600 leading-6">
              Add caller IDs here as admin. These will show in the dropdown on the Campaign page.<br />
              Example: <strong>+918071943020</strong>
            </p>
          </div>
        </div>

        {/* CALLER ID INPUTS */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text" value={callerName}
            onChange={(e) => setCallerName(e.target.value)}
            placeholder="Label (e.g. Main Number)"
            className="h-[50px] w-[240px] border border-gray-300 rounded-xl px-4 outline-none focus:border-green-400 text-[14px]"
          />
          <input
            type="text" value={callerNumber}
            onChange={(e) => setCallerNumber(e.target.value)}
            placeholder="Number (e.g. +918071943020)"
            className="h-[50px] w-[260px] border border-gray-300 rounded-xl px-4 outline-none focus:border-green-400 text-[14px]"
          />
          <button
            onClick={handleAddCaller}
            className="bg-gradient-to-r from-green-400 to-green-500 text-white px-6 h-[50px] rounded-xl text-[15px] font-semibold hover:scale-105 duration-300 shadow-md"
          >
            + Add Caller ID
          </button>
        </div>

        {/* CALLER IDs TABLE */}
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
        </div>

        {/* INSTRUCTIONS */}
        <div className="bg-white border border-pink-200 rounded-2xl">
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
        </div>

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