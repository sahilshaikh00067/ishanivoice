import React, { useState } from "react";
import {
  User,
  Lock,
  Mail,
  Phone,
  Building2,
  MapPin,
  ShieldCheck,
  UserPlus,
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

    try {

      const res = await fetch(
        "http://127.0.0.1:8000/api/create-user/",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username: form.username,
            password: form.password,
            role: form.role.toLowerCase(),
            parent:
              currentUser?.username || null,
          }),
        }
      );

      if (!res.ok) {

        alert("Server Error ❌");

        return;

      }

      const data = await res.json();

      if (data.status !== "success") {

        alert(
          data.message || "Error ❌"
        );

        return;

      }

      // ✅ SAVE
      const newUser = {

        id: data.user_id,

        username: form.username,

        password: form.password,

        role: form.role.toLowerCase(),

        parent:
          currentUser?.username,

        status: "Active",

        // ✅ IMPORTANT
        credit: 0,

      };

      const oldUsers =
        JSON.parse(
          localStorage.getItem("users")
        ) || [];

      localStorage.setItem(
        "users",
        JSON.stringify([
          newUser,
          ...oldUsers,
        ])
      );

      alert(
        "User Added Successfully ✅"
      );

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

      alert(
        "Network Error ❌"
      );

    }

  };

  return (

    <div className="min-h-screen bg-[#f8f8f8] p-4 md:p-7">

      {/* MAIN CARD */}
      <div className="max-w-[1300px] mx-auto bg-white rounded-[30px] border border-[#ef7fa4] overflow-hidden shadow-sm">

        {/* HEADER */}
        <div className="px-8 py-7 border-b border-[#f5c8d5] bg-[#fffafb]">

          <div className="flex items-center gap-4">

            <div className="w-[62px] h-[62px] rounded-2xl bg-[#fff0f4] border border-[#ef7fa4] flex items-center justify-center">

              <UserPlus
                size={28}
                className="text-[#EA7A9A]"
              />

            </div>

            <div>

              <h1 className="text-[30px] font-[700] text-[#EA7A9A]">
                Add User
              </h1>

              <p className="text-[14px] text-gray-500 mt-1">
                Create reseller or user account
              </p>

            </div>

          </div>

        </div>

        {/* BODY */}
        <div className="p-8">

          <form
            onSubmit={handleSubmit}
          >

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {/* USERNAME */}
              <div>

                <label className="label">
                  Username
                </label>

                <div className="inputBox">

                  <User
                    size={18}
                    className="icon"
                  />

                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    placeholder="Enter Username"
                    onChange={handleChange}
                    className="input"
                  />

                </div>

              </div>

              {/* PASSWORD */}
              <div>

                <label className="label">
                  Password
                </label>

                <div className="inputBox">

                  <Lock
                    size={18}
                    className="icon"
                  />

                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    placeholder="Enter Password"
                    onChange={handleChange}
                    className="input"
                  />

                </div>

              </div>

              {/* EMAIL */}
              <div>

                <label className="label">
                  Email Address
                </label>

                <div className="inputBox">

                  <Mail
                    size={18}
                    className="icon"
                  />

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    placeholder="Enter Email Address"
                    onChange={handleChange}
                    className="input"
                  />

                </div>

              </div>

              {/* MOBILE */}
              <div>

                <label className="label">
                  Mobile Number
                </label>

                <div className="inputBox">

                  <Phone
                    size={18}
                    className="icon"
                  />

                  <input
                    type="text"
                    name="mobile"
                    value={form.mobile}
                    placeholder="Enter Mobile Number"
                    onChange={handleChange}
                    className="input"
                  />

                </div>

              </div>

              {/* COMPANY */}
              <div>

                <label className="label">
                  Company Name
                </label>

                <div className="inputBox">

                  <Building2
                    size={18}
                    className="icon"
                  />

                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    placeholder="Enter Company Name"
                    onChange={handleChange}
                    className="input"
                  />

                </div>

              </div>

              {/* CITY */}
              <div>

                <label className="label">
                  City
                </label>

                <div className="inputBox">

                  <MapPin
                    size={18}
                    className="icon"
                  />

                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    placeholder="Enter City"
                    onChange={handleChange}
                    className="input"
                  />

                </div>

              </div>

              {/* ROLE */}
              <div>

                <label className="label">
                  User Role
                </label>

                <div className="inputBox">

                  <ShieldCheck
                    size={18}
                    className="icon"
                  />

                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="input bg-transparent"
                  >

                    <option value="User">
                      User
                    </option>

                    <option value="Reseller">
                      Reseller
                    </option>

                  </select>

                </div>

              </div>

            </div>

            {/* BUTTON */}
            <div className="mt-8 flex justify-end">

              <button
                type="submit"
                className="h-[56px] px-10 rounded-2xl bg-[#EA7A9A] hover:bg-[#e3688b] duration-300 text-white text-[16px] font-semibold shadow-sm"
              >

                Add User

              </button>

            </div>

          </form>

        </div>

      </div>

      {/* CSS */}
      <style>{`

        .label{
          display:block;
          margin-bottom:10px;
          font-size:14px;
          font-weight:600;
          color:#EA7A9A;
        }

        .inputBox{
          width:100%;
          height:58px;
          border:1px solid #ef7fa4;
          border-radius:18px;
          background:#fffafb;
          display:flex;
          align-items:center;
          padding:0 18px;
          transition:0.3s;
        }

        .inputBox:focus-within{
          border:1px solid #EA7A9A;
          background:white;
          box-shadow:0 0 0 4px rgba(234,122,154,0.10);
        }

        .icon{
          color:#EA7A9A;
          min-width:18px;
        }

        .input{
          width:100%;
          height:100%;
          border:none;
          outline:none;
          background:transparent;
          padding-left:14px;
          font-size:15px;
          color:#111827;
        }

        .input::placeholder{
          color:#9ca3af;
        }

      `}</style>

    </div>
  );
};

export default AddUser;