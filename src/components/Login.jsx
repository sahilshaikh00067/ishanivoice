import { Formik } from "formik";
import { useState } from "react";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import { User, Lock } from "lucide-react";
import { BASE } from "../components/api";
import login from "../assets/Images/login.png";
import loginback from "../assets/Images/loginback.jpg";


function Login() {

  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  const validationSchema = Yup.object({
    username: Yup.string()
      .min(3, "Username too short")
      .required("Username is required"),

    password: Yup.string()
      .min(3, "Min 3 characters")
      .required("Password is required"),
  });

  return (

    <div className="min-h-screen flex flex-col md:flex-row">

      {/* LEFT — ILLUSTRATION */}
      <div
        className="hidden md:flex md:w-1/2 bg-cover bg-center bg-no-repeat items-center justify-center"
        style={{
          backgroundImage: `url(${loginback})`,
        }}
      >
        <img
          src={login}
          alt="Login"
          className="w-[65%] h-auto object-contain"
        />
      </div>

      {/* RIGHT — LOGIN FORM */}
      <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center bg-[#fafafa] px-6 py-10">
        <div className="w-full max-w-[420px]">

          <Formik
            initialValues={{ username: "", password: "" }}
            validationSchema={validationSchema}

            onSubmit={async (values, { setSubmitting }) => {

              try {

                const res = await fetch(`${BASE}/login/`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(values),
                });

                const data = await res.json();

                console.log("LOGIN RESPONSE:", data);

                if (data.status === "success") {

                  sessionStorage.clear();

                  sessionStorage.setItem("user_id", data.user_id);

                  sessionStorage.setItem(
                    "user",
                    JSON.stringify({
                      id: data.user_id,
                      username: values.username,
                      role: data.role,
                      credit: data.credit,
                    })
                  );

                  sessionStorage.setItem("role", data.role);

                  setMessage("Login successful ✅");

                  setTimeout(() => {
                    navigate("/voicecampaign");
                  }, 500);

                } else {

                  setMessage("Invalid username or password ❌");

                }

              } catch (err) {

                console.log(err);
                setMessage("Server error ❌");

              }

              setSubmitting(false);

            }}
          >

            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit,
              isSubmitting,
            }) => (

              <form onSubmit={handleSubmit}>

                {/* USERNAME */}
                <div className="mb-5">
                  <div className="flex items-center h-[39px] border border-slate-600 rounded-sm px-4 gap-3 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50">
                    <User size={18} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      name="username"
                      placeholder="UserId"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.username}
                      className="w-full h-full bg-transparent outline-none text-[15px] text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                  {errors.username && touched.username && (
                    <p className="text-red-500 text-[12px] mt-1.5">{errors.username}</p>
                  )}
                </div>

                {/* PASSWORD */}
                <div className="mb-6">
                  <div className="flex items-center h-[39px] border border-slate-600 rounded-sm px-4 gap-3 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50">
                    <Lock size={18} className="text-slate-400 shrink-0" />
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.password}
                      className="w-full h-full bg-transparent outline-none text-[15px] text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                  {errors.password && touched.password && (
                    <p className="text-red-500 text-[12px] mt-1.5">{errors.password}</p>
                  )}
                </div>

                {/* MESSAGE */}
                {message && (
                  <p className={`text-center text-[13px] mb-4 ${message.includes("✅") ? "text-emerald-600" : "text-red-500"}`}>
                    {message}
                  </p>
                )}

                {/* BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[37px] rounded-sm bg-[#3F51B5] hover:bg-[#4859bb] disabled:opacity-60 text-white text-[16px] font-semibold tracking-wide transition"
                >
                  {isSubmitting ? "Signing in..." : "LOGIN"}
                </button>

                {/* FORGOT PASSWORD */}
                <div className="mt-5 text-center">
                  <span className="text-[#3F51B5] text-[14px] font-semibold cursor-pointer hover:underline">
                    FORGOT PASSWORD?
                  </span>
                </div>

              </form>

            )}

          </Formik>

        </div>
      </div>

    </div>

  );
}

export default Login;