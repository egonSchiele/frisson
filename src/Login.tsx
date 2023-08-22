import React from "react";
import Auth from "./Auth";
import { Routes, Route } from "react-router-dom";
import Library from "./Library";
import { setCookie } from "./utils";

function AuthApp() {
  const [error, setError] = React.useState(null);
  async function submitLogin(email, password) {
    await submitBase("/auth/login", email, password);
  }

  async function submitRegister(email, password) {
    await submitBase("/auth/register", email, password);
  }
  async function submitBase(url, email, password) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message);
      return;
    } else {
      setError(null);
      const { userid, token } = json;

      setCookie("userid", userid, 14);
      setCookie("token", token, 14);
      window.location.href = "/";
    }
  }
  const login = (
    <Auth
      title={"Sign in to your account"}
      primary={"Sign in"}
      secondary={"Register"}
      primaryAction={submitLogin}
      secondaryAction="/register"
      error={error}
    />
  );

  const register = (
    <Auth
      title={"Register"}
      primary={"Register"}
      secondary={"Sign in"}
      primaryAction={submitRegister}
      secondaryAction="/login"
      error={error}
    />
  );

  return (
    <div>
      <Routes>
        <Route path="/login" element={login} />
        <Route path="/register" element={register} />
        <Route path="/login.html" element={login} />
        <Route path="/register.html" element={register} />
      </Routes>
    </div>
  );
}

export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <AuthApp />
    </div>
  );
}
