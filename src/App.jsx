import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import AdminRoute from "./components/category/AdminRoute";
import CampaignReports from "./components/category/CampaignReports";

import AddUser from "./components/AddUser";
import ManageUser from "./components/ManageUser";
import CreditHistory from "./components/category/CreditHistory";
import Logout from "./components/Logout";
import ChangePassword from "./components/ChangePassword";

import PageNotFound from "./components/PageNotFound";
import AudioFile from "./components/category/AudioFile";
import ResendVoice from "./components/ResendVoice";
import VoiceCampaign from "./components/category/VoiceCampaign";
import ScheduleReport from "./components/ScheduleReport";

function App() {
  const user = JSON.parse(sessionStorage.getItem("user"));

  return (
    <Routes>

      {/* 🔥 DEFAULT */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* 🔓 PUBLIC */}
      <Route path="/login" element={<Login />} />

      {/* 🔒 PROTECTED */}
      <Route element={<AdminRoute />}>

        {/* 🔥 HEADER LAYOUT */}
        <Route element={<Header />}>

          <Route path="/dashboard" element={<Dashboard />} />

          {/* ✅ ALL USERS */}
          <Route path="/voicecampaign" element={<VoiceCampaign />} />
          <Route path="/campaignreports" element={<CampaignReports />} />
          <Route path="/audiofile" element={<AudioFile />} />
          <Route path="/changepassword" element={<ChangePassword />} />
          <Route path="/logout" element={<Logout />} />

          {/* 🔥 ADMIN + RESELLER ONLY */}
          <Route
            path="/adduser"
            element={
              user?.role !== "user"
                ? <AddUser />
                : <Navigate to="/dashboard" />
            }
          />

          <Route
            path="/manageuser"
            element={
              user?.role !== "user"
                ? <ManageUser />
                : <Navigate to="/dashboard" />
            }
          />

          <Route
            path="/credithistory"
            element={
              user?.role !== "user"
                ? <CreditHistory />
                : <Navigate to="/dashboard" />
            }
          />

        </Route>
      </Route>

      {/* ❌ 404 */}
      <Route path="*" element={<PageNotFound />} />

    </Routes>
  );
}

export default App;