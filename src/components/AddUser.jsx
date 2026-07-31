import React, { useState } from "react";
import { BASE } from "../components/api";
import {
  User,
  Lock,
  Mail,
  Phone,
  Building2,
  MapPin,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const AddUser = () => {

  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    mobile: "",
    company: "",
    city: "",
    role: "User",
  });

  const [submitting, setSubmitting] = useState(false);

  // ── PREMIUM POPUP (replaces alert()) ──
  const [popup, setPopup] = useState(false);
  const [popupType, setPopupType] = useState("success");
  const [popupMsg, setPopupMsg] = useState("");

  const showPopup = (t, m) => { setPopupType(t); setPopupMsg(m); setPopup(true); };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const currentUser = JSON.parse(
    sessionStorage.getItem("user")
  );

  // ✅ SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`${BASE}/create-user/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          role: form.role.toLowerCase(),
          parent: currentUser?.username || null,
        }),
      });

      if (!res.ok) {
        showPopup("error", "Server Error");
        setSubmitting(false);
        return;
      }

      const data = await res.json();

      if (data.status !== "success") {
        showPopup("error", data.message || "Error");
        setSubmitting(false);
        return;
      }

      showPopup("success", "User Added Successfully");

      // ✅ RESET
      setForm({
        username: "",
        password: "",
        email: "",
        mobile: "",
        company: "",
        city: "",
        role: "User",
      });
    } catch (err) {
      console.log(err);
      showPopup("error", "Network Error, please check your connection");
    }
    setSubmitting(false);
  };

  const fields = [
    { name: "username", label: "Username", type: "text", icon: User, placeholder: "e.g. ABCD" },
    { name: "password", label: "Password", type: "password", icon: Lock, placeholder: "Minimum 2 characters" },
    { name: "email", label: "Email Address", type: "email", icon: Mail, placeholder: "name@company.com" },
    { name: "mobile", label: "Mobile Number", type: "text", icon: Phone, placeholder: "10-digit mobile number" },
    { name: "company", label: "Company Name", type: "text", icon: Building2, placeholder: "Company or business name" },
    { name: "city", label: "City", type: "text", icon: MapPin, placeholder: "e.g. Mumbai" },
  ];

  return (

    <div className="min-h-screen bg-[#f4f5f8] p-4 md:p-8">

      {/* BREADCRUMB */}
      <div className="max-w-[1100px] mx-auto mb-4 flex items-center gap-2 text-[13px] text-slate-500">
        <span>Users</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium">Add New</span>
      </div>

      {/* MAIN CARD */}
      <div className="max-w-[1100px] mx-auto bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(16,24,40,0.05)] overflow-hidden">

        {/* HEADER */}
        <div className="px-7 py-6 border-b border-slate-200 flex items-center gap-4">

          <div className="w-[46px] h-[46px] rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <UserPlus size={22} className="text-indigo-600" />
          </div>

          <div>
            <h1 className="text-[19px] font-[700] text-slate-900 leading-tight">
              Add User
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Create a new Reseller or User account under your organization
            </p>
          </div>

        </div>

        {/* BODY */}
        <div className="p-7">

          <form onSubmit={handleSubmit}>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">

              {fields.map(({ name, label, type, icon: Icon, placeholder }) => (
                <div key={name}>
                  <label className="block mb-1.5 text-[13px] font-medium text-slate-700">
                    {label}
                  </label>
                  <div className="flex items-center h-[44px] rounded-lg border border-slate-300 bg-white px-3 gap-2.5 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50">
                    <Icon size={16} className="text-slate-400 shrink-0" />
                    <input
                      type={type}
                      name={name}
                      value={form[name]}
                      placeholder={placeholder}
                      onChange={handleChange}
                      className="w-full h-full bg-transparent outline-none text-[14px] text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              ))}

              {/* ROLE — segmented toggle */}
              <div>
                <label className="block mb-1.5 text-[13px] font-medium text-slate-700">
                  User Role
                </label>
                <div className="h-[44px] rounded-lg border border-slate-300 bg-slate-50 p-1 flex gap-1">
                  {["User", "Reseller"].map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setForm((f) => ({ ...f, role: r }))}
                      className={`flex-1 rounded-md text-[13.5px] font-medium transition ${
                        form.role === r
                          ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* BUTTON */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="h-[44px] px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 duration-200 disabled:opacity-60 text-white text-[14px] font-semibold shadow-sm flex items-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Adding User..." : "Add User"}
              </button>
            </div>

          </form>

        </div>

      </div>

      {/* PREMIUM POPUP — replaces alert() */}
      {popup && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-[320px] rounded-2xl p-6 text-center shadow-xl border border-slate-200">
            <div className="flex justify-center mb-4">
              {popupType === "error"
                ? <AlertCircle size={44} className="text-red-500" />
                : <CheckCircle2 size={44} className="text-emerald-500" />}
            </div>
            <h2 className="text-[18px] font-bold text-slate-900 mb-1">{popupType === "error" ? "Something went wrong" : "Success"}</h2>
            <p className="text-[14px] text-slate-500">{popupMsg}</p>
            <button
              onClick={() => setPopup(false)}
              className={`mt-5 px-6 h-[38px] rounded-lg text-white text-[14px] font-semibold w-full ${popupType === "error" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >OK</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddUser;