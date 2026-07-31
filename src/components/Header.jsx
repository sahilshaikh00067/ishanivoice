import { useEffect, useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { BASE } from "./api";

import { FaUserCircle } from "react-icons/fa";
import { PiFileAudioBold } from "react-icons/pi";
import { TbLivePhotoFilled } from "react-icons/tb";
import { ImProfile } from "react-icons/im";
import { TbReport } from "react-icons/tb";
import { MdDashboard } from "react-icons/md";
import { PiPhoneCallFill } from "react-icons/pi";
import { BsFillPeopleFill, BsBellFill } from "react-icons/bs";
import { MdKeyboardArrowDown } from "react-icons/md";
import { FiLogOut, FiKey } from "react-icons/fi";
import profile from "../assets/Images/profile.png";
import obd from "../assets/Images/obd.png";
import slide from "../assets/Images/slide.png"; 

import { XMarkIcon } from "@heroicons/react/24/outline";

const ACCENT = "#3F51B5";

export default function Header() {

  // ✅ OBD icon isi panel ko open/close karta hai
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  // ✅ dropdown ke andar kaunsa section abhi expand hai (accordion)
  const [openSection, setOpenSection] = useState(null);

  const [showProfile, setShowProfile] = useState(false);
  // ✅ header panel (bell + credit + profile) toggle
  const [showHeaderPanel, setShowHeaderPanel] = useState(false);
  // ✅ credit amount reveal on click
  const [showCreditAmount, setShowCreditAmount] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const role =
    sessionStorage
      .getItem("role")
      ?.toLowerCase();

  // ✅ LIVE CREDIT — fetched from backend, not localStorage
  const userId = sessionStorage.getItem("user_id");

  const loadCurrentUser = async () => {
    try {
      const res = await fetch(`${BASE}/list-users/?user_id=${userId}`);
      const data = await res.json();
      const me = Array.isArray(data) ? data.find((u) => String(u.id) === String(userId)) : null;
      setCurrentUser(me || null);
    } catch (err) {
      console.log("Header user fetch error:", err);
    }
  };
  useEffect(() => { loadCurrentUser(); }, []);
  const currentCredit = Number(currentUser?.credit || 0);



  // ✅ LOGOUT
  const handleLogout = () => {

    sessionStorage.clear();

    navigate("/login");

  };

  // ✅ Sidebar sections — dropdown panel isi array se render hota hai.
  const menuSections = [
    // {
    //   key: "dashboard",
    //   label: "Dashboard",
    //   icon: <MdDashboard />,
    //   to: "/dashboard",
    // },
    {
      key: "voicecampaign",
      label: "Voice Campaign",
      icon: <PiPhoneCallFill />,
      children: [
        { label: "Voice Campaign", to: "/voicecampaign" },
      ],
    },
    {
      key: "voicefile",
      label: "Voice File",
      icon: <PiFileAudioBold />,
      children: [
        { label: "Audio File", to: "/audiofile" },
      ],
    },
    {
      key: "managecampaign",
      label: "Manage Campaign",
      icon: <TbReport />,
      children: [
        { label: "My Campaign", to: "/campaignreports" },
      ],
    },
    // {
    //   key: "livereport",
    //   label: "Live Report",
    //   icon: <TbLivePhotoFilled />,
    //   children: [
    //     { label: "Credit History", to: "/credithistory" },
    //   ],
    // },
    ...(role !== "user"
      ? [{
        key: "usermanagement",
        label: "User Management",
        icon: <BsFillPeopleFill />,
        children: [
          { label: "Add User", to: "/adduser" },
          { label: "Manage User", to: "/manageuser" },
        ],
      }]
      : []),
    // {
    //   key: "profile",
    //   label: "Profile",
    //   icon: <ImProfile />,
    //   children: [
    //     { label: "Change Password", to: "/changepassword" },
    //   ],
    // },
  ];

  const toggleSection = (key) => {
    setOpenSection(openSection === key ? null : key);
  };

  const closeSidebarMenu = () => {
    setSidebarMenuOpen(false);
    setOpenSection(null);
  };

  return (

    <div className="bg-[#f5f5f5] min-h-screen overflow-x-hidden">

      {/* HEADER */}
      <header className="bg-[#3F51B5]">

        <nav className="flex items-center justify-between px-4 md:px-6 py-2.5">

          {/* LEFT */}
          <div className="flex items-center gap-3">

            {/* LOGO */}
            <img
              src={slide}
              alt="Menu"
              className=" w-[66px] h-[55px] object-contain"
            />

          </div>

          {/* RIGHT — single icon, clicking it opens the header panel */}
          <div className="flex items-center relative">

            <button
              onClick={() => setShowHeaderPanel(!showHeaderPanel)}
              className="w-[38px] h-[38px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white duration-200"
            >
              <img
                src={profile}
                alt="profile"
                className="w-[28px] h-[28px] rounded-full object-cover"
              />
            </button>

            {/* HEADER PANEL — appears only after clicking the icon */}
            {showHeaderPanel && (

              <div className="absolute right-0 top-[48px] w-[280px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl z-50">

                {/* TOP */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-[14px] font-semibold text-gray-800">
                    Welcome {currentUser?.username || "InfraVoice"}
                  </p>
                  <button
                    onClick={() => setShowHeaderPanel(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-4" />
                  </button>
                </div>

                {/* BELL / NOTIFICATIONS */}
                <div className="flex items-center gap-3 px-4 py-3 text-[14px] text-gray-700 border-b border-gray-100">
                  <span className="relative">
                    <BsBellFill size={16} className="text-[#3F51B5]" />
                    <span className="absolute -top-1 -right-1 w-[7px] h-[7px] rounded-full bg-red-500" />
                  </span>
                  Notifications
                </div>

                {/* CREDITS — click to reveal how much credit is available */}
                <button
                  onClick={() => setShowCreditAmount(!showCreditAmount)}
                  className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                >
                  <span>Credits</span>
                  <span className="font-semibold text-[#3F51B5]">
                    {showCreditAmount ? `₹ ${currentCredit}` : "View"}
                  </span>
                </button>

                {showCreditAmount && (
                  <NavLink
                    to="/credithistory"
                    onClick={() => {
                      setShowHeaderPanel(false);
                      setShowCreditAmount(false);
                    }}
                    className="block px-4 py-2 text-[13px] text-[#3F51B5] hover:underline border-b border-gray-100"
                  >
                    View Credit History
                  </NavLink>
                )}

                {/* CHANGE PASSWORD */}
                <NavLink
                  to="/changepassword"
                  onClick={() => setShowHeaderPanel(false)}
                  className="flex items-center gap-3 px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50"
                >
                  <FiKey size={16} className="text-[#3F51B5]" />
                  Change Password
                </NavLink>

                {/* LOGOUT */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                >
                  <FiLogOut size={16} className="text-[#3F51B5]" />
                  Logout
                </button>

              </div>

            )}

          </div>

        </nav>

      </header>

      {/* MAIN */}
      <div className="flex">

        {/* ✅ LEFT ICON COLUMN — hamesha visible: User, OBD (cloud) */}
        <div className="w-[100px] shrink-0 bg-white border-r border-gray-200 flex flex-col items-center py-5 gap-6 h-[calc(100vh-53px)] relative">

          {/* USER ICON */}
          <button
            onClick={() => setSidebarMenuOpen(!sidebarMenuOpen)}
            className="flex flex-col items-center gap-1 text-[#3F51B5]"
          >
            <FaUserCircle size={22} />
            <span className="text-[11px] font-medium text-gray-700">User</span>
          </button>

          {/* OBD / CLOUD ICON */}
          <div className="relative">

            <button
              onClick={() => setSidebarMenuOpen(!sidebarMenuOpen)}
              className="flex flex-col items-center gap-1"
            >
              <img src={obd} alt="OBD" className="w-6 h-6 object-contain" />
              <span className="text-[11px] font-medium text-gray-700">OBD</span>
            </button>

            {/* ✅ DROPDOWN — ab compact box hai, fixed max-height + scrollbar (scroll type) */}
            {sidebarMenuOpen && (
              <>
                {/* backdrop — bahar click karne pe dropdown band ho jaye */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={closeSidebarMenu}
                />

                <div className="absolute left-[47px] mt-[-125px] w-[220px] max-h-[250px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50">

                  {menuSections.map((section) => (

                    <div key={section.key} className="border-b border-gray-100 last:border-b-0">

                      {section.to ? (
                        <NavLink
                          to={section.to}
                          onClick={closeSidebarMenu}
                          className="flex items-center gap-3 px-4 py-3 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <span className="text-[#3F51B5]">{section.icon}</span>
                          {section.label}
                        </NavLink>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleSection(section.key)}
                            className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-[#3F51B5]">{section.icon}</span>
                              {section.label}
                            </span>
                            <MdKeyboardArrowDown
                              size={16}
                              className={`text-gray-400 transition-transform duration-200 ${openSection === section.key ? "rotate-180" : ""
                                }`}
                            />
                          </button>

                          {openSection === section.key && (
                            <div className="bg-gray-50">
                              {section.children.map((child) => (
                                <NavLink
                                  key={child.to}
                                  to={child.to}
                                  onClick={closeSidebarMenu}
                                  className="block pl-11 pr-4 py-2.5 text-[11px] text-gray-600 hover:text-[#3F51B5] hover:bg-gray-100"
                                >
                                  {child.label}
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                    </div>

                  ))}

                </div>
              </>
            )}

          </div>

        </div>

        {/* RIGHT */}
        <div className="flex-1 p-3 md:p-4 overflow-x-hidden">
          <Outlet />
        </div>

      </div>

    </div>

  );
}