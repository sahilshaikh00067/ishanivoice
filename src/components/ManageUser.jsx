import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, KeyRound, Pencil, Trash2, Users, Wallet, RotateCw } from "lucide-react";
import { BASE } from "./api";

const ManageUser = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "", password: "", role: "", credit: "", addCredit: "",
    vc_username: "", vc_password: "", vc_caller_id: "", vc_plan_id: "", vc_call_type: "",
  });

  const navigate = useNavigate();
  const role = sessionStorage.getItem("role");
  const loggedUserId = sessionStorage.getItem("user_id");

  useEffect(() => { loadUsers(); }, []);

  // ==============================
  // LOAD USERS — LIVE FROM BACKEND
  // ==============================
  const loadUsers = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${BASE}/list-users/?user_id=${loggedUserId}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      setUsers([]);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  // ==============================
  // EDIT OPEN
  // ==============================
  const handleEditOpen = (user) => {
    setEditUser(user);
    setEditForm({
      username: user.username || "",
      password: "",
      role: user.role || "user",
      credit: user.credit || 0,
      addCredit: "",
      vc_username: user.vc_username || "",
      vc_password: user.vc_password || "",
      vc_caller_id: user.vc_caller_id || "",
      vc_plan_id: user.vc_plan_id || "2",
      vc_call_type: user.vc_call_type || "2",
    });
  };

  // ==============================
  // SAVE EDIT — calls Django backend, then refreshes list
  // ==============================
  const handleEditSave = async () => {
    try {
      const addCredit = Number(editForm.addCredit || 0);

      const res = await fetch(`${BASE}/update-user/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editUser.id,
          username: editForm.username,
          password: editForm.password || undefined,
          role: editForm.role,

          add_credit: addCredit,
          admin_id: loggedUserId,

          vc_username: editForm.vc_username,
          vc_password: editForm.vc_password,
          vc_caller_id: editForm.vc_caller_id,
          vc_plan_id: editForm.vc_plan_id,
          vc_call_type: editForm.vc_call_type,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        alert("User Updated Successfully ✅");
        setEditUser(null);
        loadUsers();
      } else {
        alert("Update Failed ❌");
      }
    } catch (err) {
      alert("Network Error ❌");
    }
  };

  // ==============================
  // RESET PASSWORD
  // ==============================
  const handleResetPassword = async (user) => {
    const newPass = prompt("Enter new password");
    if (!newPass) return;
    try {
      const res = await fetch(`${BASE}/reset-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, password: newPass }),
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Password Reset ✅");
        loadUsers();
      }
    } catch (err) {
      alert("Error ❌");
    }
  };

  // ==============================
  // TOGGLE STATUS
  // ==============================
  const toggleActive = async (id) => {
    try {
      const res = await fetch(`${BASE}/toggle-status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        loadUsers();
      }
    } catch (err) {
      alert("Error ❌");
    }
  };

  // ==============================
  // DELETE USER
  // ==============================
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Delete user "${user.username}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(user.id);
      const res = await fetch(`${BASE}/delete-user/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, admin_id: loggedUserId }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      } else {
        alert(data.message || "Delete Failed ❌");
      }
    } catch (err) {
      alert("Network Error ❌");
    }
    setDeletingId(null);
  };

  const getSubUserCount = (username) => users.filter((u) => u.parent === username).length;

  return (
    <div className="min-h-screen bg-[#f4f5f8] p-3 md:p-6 overflow-x-hidden">
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(16,24,40,0.05)] overflow-hidden">

        {/* HEADER */}
        <div className="px-5 md:px-7 py-6 border-b border-slate-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-[46px] h-[46px] rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <Users size={22} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-[19px] font-[700] text-slate-900 leading-tight">Manage Users</h1>
                <p className="text-[13px] text-slate-500 mt-0.5">View, edit and manage all user accounts</p>
              </div>
            </div>
            {role !== "user" && (
              <button onClick={() => navigate("/adduser")}
                className="h-[42px] px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 duration-200 text-white text-[13.5px] font-semibold flex items-center gap-2 shadow-sm">
                <UserPlus size={16} /> Add User
              </button>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-2 text-[13.5px] text-slate-700">
              <span>Show</span>
              <select className="w-[68px] h-[38px] border border-slate-300 rounded-lg px-2 bg-white outline-none text-[13.5px]">
                <option>10</option><option>25</option><option>50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[13.5px] text-slate-700">Search:</span>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search user" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[180px] md:w-[240px] h-[38px] border border-slate-300 rounded-lg bg-white pl-9 pr-3 outline-none text-[13.5px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" />
              </div>
              <button onClick={loadUsers} className="w-[38px] h-[38px] rounded-lg border border-slate-300 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300">
                <RotateCw size={15} />
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50">
                  {["Sr", "Username", "Credit", "Status", "Date", "Role", "Sub User", "VC Username", "Action"].map((head, i) => (
                    <th key={i} className="px-3 py-3.5 border-b border-r border-slate-200 text-left text-[12.5px] font-[700] text-slate-600 whitespace-nowrap">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-12 text-[14px] text-slate-500">Loading...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-12 text-[14px] text-slate-500">No data available in table</td></tr>
                ) : filteredUsers.map((u, index) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3.5 border-b border-r border-slate-100 text-[13px] text-slate-700">{index + 1}</td>
                    <td className="px-3 py-3.5 border-b border-r border-slate-100 text-[13px] text-slate-900 font-medium">{u.username}</td>
                    <td className="px-3 py-3.5 border-b border-r border-slate-100">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 h-[30px]">
                        <Wallet size={13} className="text-indigo-600" />
                        <span className="text-[12.5px] font-[700] text-indigo-700">₹ {Number(u.credit || 0)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 border-b border-r border-slate-100">
                      <button onClick={() => toggleActive(u.id)}
                        className={`px-3.5 h-[28px] rounded-full text-white text-[11.5px] font-semibold ${u.status === "Active" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}>
                        {u.status || "Active"}
                      </button>
                    </td>
                    <td className="px-3 py-3.5 border-b border-r border-slate-100 text-[13px] text-slate-600 whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-3 py-3.5 border-b border-r border-slate-100 text-[13px] text-slate-700 capitalize">{u.role}</td>
                    <td className="px-3 py-3.5 border-b border-r border-slate-100 text-[13px] text-slate-700">{getSubUserCount(u.username)}</td>
                    <td className="px-3 py-3.5 border-b border-r border-slate-100 text-[13px] text-slate-700">{u.vc_username || "-"}</td>
                    <td className="px-3 py-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleResetPassword(u)} title="Reset Password"
                          className="w-[32px] h-[32px] rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => handleEditOpen(u)} title="Edit User"
                          className="w-[32px] h-[32px] rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteUser(u)} title="Delete User" disabled={deletingId === u.id}
                          className="w-[32px] h-[32px] rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 disabled:opacity-50 flex items-center justify-center">
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
      </div>

      {/* EDIT MODAL */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="w-full max-w-[520px] bg-white rounded-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-[19px] font-[700] text-slate-900 mb-5">Edit User</h2>
            <div className="space-y-4">
              <input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="Username" className="modalInput" />
              <input value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Password (leave blank to keep unchanged)" type="password" className="modalInput" />
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="modalInput">
                <option value="user">User</option>
                <option value="reseller">Reseller</option>
                <option value="admin">Admin</option>
              </select>
              <input value={editForm.credit || 0} disabled placeholder="Current Credit" className="modalInput bg-slate-50 text-slate-400" />
              <input type="number" value={editForm.addCredit} onChange={(e) => setEditForm({ ...editForm, addCredit: e.target.value })}
                placeholder="Add Credit" className="modalInput" />

              <hr className="border-slate-200" />
              <p className="text-[12.5px] font-semibold text-indigo-600 uppercase tracking-wide">VoiceChannel Credentials</p>

              <input value={editForm.vc_username} onChange={(e) => setEditForm({ ...editForm, vc_username: e.target.value })}
                placeholder="VC Username" className="modalInput" />
              <input value={editForm.vc_password} onChange={(e) => setEditForm({ ...editForm, vc_password: e.target.value })}
                placeholder="VC Password" type="password" className="modalInput" />
              <input value={editForm.vc_caller_id} onChange={(e) => setEditForm({ ...editForm, vc_caller_id: e.target.value })}
                placeholder="Caller ID" className="modalInput" />
              <div className="flex gap-3">
                <select value={editForm.vc_plan_id} onChange={(e) => setEditForm({ ...editForm, vc_plan_id: e.target.value })}
                  className="modalInput">
                  <option value="1">Plan 15 pulse</option>
                  <option value="2">Plan 30 pulse</option>
                  <option value="3">Plan 45 pulse</option>
                </select>
                <select value={editForm.vc_call_type} onChange={(e) => setEditForm({ ...editForm, vc_call_type: e.target.value })}
                  className="modalInput">
                  <option value="2">Transactional</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditUser(null)}
                className="h-[42px] px-5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[13.5px]">Cancel</button>
              <button onClick={handleEditSave}
                className="h-[42px] px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13.5px] shadow-sm">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modalInput{width:100%;height:46px;border:1px solid #cbd5e1;border-radius:10px;padding:0 14px;outline:none;background:#ffffff;font-size:13.5px;color:#0f172a;transition:0.2s;}
        .modalInput::placeholder{color:#94a3b8;}
        .modalInput:focus{border:1px solid #4f46e5;box-shadow:0 0 0 4px rgba(79,70,229,0.08);}
      `}</style>
    </div>
  );
};

export default ManageUser;