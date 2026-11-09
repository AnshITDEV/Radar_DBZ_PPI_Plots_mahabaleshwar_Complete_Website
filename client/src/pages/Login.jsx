import React, { useState, useEffect } from "react";
import { loginUser, registerUser } from "../api/auth";
import RadarCockpitCanvas from "../components/RadarCockpitCanvas";
import CinematicStartup from "../components/CinematicStartup";
import SoundControl from "../components/SoundControl";
import AeroButton from "../components/ui/AeroButton";
import AeroInput from "../components/ui/AeroInput";
import AeroBadge from "../components/ui/AeroBadge";
import logo from "../assets/kjsieit-logo.svg";
import {
  FaShieldAlt,
  FaSatelliteDish,
  FaTerminal,
  FaUserAstronaut,
  FaLock,
  FaEnvelope,
  FaRedoAlt,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replayIntro, setReplayIntro] = useState(false);
  const [startupDone, setStartupDone] = useState(false);

  useEffect(() => {
    // If user is already authenticated, redirect to landing
    const token = localStorage.getItem("token");
    if (token) {
      window.location.href = "/landing";
    }

    const hasSeenIntro = sessionStorage.getItem("aeroscope_startup_completed");
    if (hasSeenIntro) {
      setStartupDone(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (!isLogin && password !== confirmPassword) {
      setMessage("Passwords do not match");
      setIsSuccess(false);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Authenticate existing operator
        const data = await loginUser(loginInput, password);
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("username", data.username);
          setIsSuccess(true);
          setMessage("AUTHENTICATION ACCEPTED • INITIALIZING RADAR CONSOLE...");
          setTimeout(() => {
            window.location.href = "/landing";
          }, 800);
        } else {
          setMessage(data.msg || "Authentication rejected: Invalid credentials");
          setIsSuccess(false);
        }
      } else {
        // Register new operator
        const data = await registerUser(username, email, password);
        if (data.msg) {
          setIsSuccess(true);
          setMessage(data.msg + " • Proceed to System Login");
          setTimeout(() => {
            setIsLogin(true);
            setMessage("Account created successfully. Please login.");
            setPassword("");
            setConfirmPassword("");
          }, 1200);
        } else {
          setMessage("Operator registration failed");
          setIsSuccess(false);
        }
      }
    } catch (err) {
      setMessage("Network Error: " + err.message);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "var(--aero-bg-void, #020409)",
        color: "var(--aero-text-primary, #f0f6fc)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Cinematic Startup Experience */}
      {(!startupDone || replayIntro) && (
        <CinematicStartup
          forceRun={replayIntro}
          onComplete={() => {
            setStartupDone(true);
            setReplayIntro(false);
          }}
        />
      )}

      {/* Atmospheric Scanlines Overlay */}
      <div className="aero-scanlines" />

      {/* Top Cockpit Header Bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 36px",
          borderBottom: "1px solid rgba(0, 240, 255, 0.12)",
          background: "rgba(6, 10, 23, 0.8)",
          backdropFilter: "blur(12px)",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Institutional Accreditation */}
          <img
            src={logo}
            alt="Somaiya University"
            style={{
              height: "36px",
              filter: "brightness(0.9) contrast(1.1)",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              height: "22px",
              width: "1px",
              background: "rgba(0, 240, 255, 0.2)",
            }}
          />
          {/* Aeroscope Brand Insignia */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaSatelliteDish style={{ color: "var(--aero-cyan, #00f0ff)", fontSize: "1.1rem" }} />
            <span
              className="display-font"
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#ffffff",
              }}
            >
              AEROSCOPE
            </span>
            <AeroBadge variant="cyan" pulse={false} style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
              v2.4 DUAL-POL
            </AeroBadge>
          </div>
        </div>

        {/* Right Tools: Rain Ambience & Replay Calibration */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <SoundControl />

          <button
            onClick={() => setReplayIntro(true)}
            className="aero-btn aero-btn-outline aero-btn-capsule"
            style={{ padding: "6px 14px", fontSize: "0.75rem" }}
            title="Replay Cinematic Radar Calibration"
          >
            <FaRedoAlt style={{ marginRight: "6px", fontSize: "0.75rem" }} />
            CALIBRATION
          </button>
        </div>
      </header>

      {/* Main Cockpit Split-Screen */}
      <main
        style={{
          flex: 1,
          display: "flex",
          position: "relative",
          zIndex: 10,
          padding: "24px 36px",
          gap: "40px",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* LEFT COLUMN: Cinematic Radar Scope & Meteorological Telemetry */}
        <section
          style={{
            flex: "1 1 55%",
            maxWidth: "680px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
          }}
        >
          {/* Atmospheric Telemetry Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
              alignSelf: "flex-start",
            }}
          >
            <AeroBadge variant="online">RADAR TRANSMITTER ACTIVE</AeroBadge>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.72rem",
                color: "#64748b",
              }}
            >
              ELEVATION: 0.5° • S-BAND 2.8 GHZ
            </span>
          </div>

          {/* Canvas Interactive Radar */}
          <div
            style={{
              position: "relative",
              padding: "12px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0, 240, 255, 0.05) 0%, rgba(10, 18, 38, 0.6) 70%, transparent 100%)",
              boxShadow: "0 0 50px rgba(0, 240, 255, 0.12)",
            }}
          >
            <RadarCockpitCanvas width={440} height={440} />
          </div>

          {/* Project Identity & Scientific Mission Statement */}
          <div style={{ marginTop: "24px", width: "100%", textAlign: "left" }}>
            <h1
              className="display-font"
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                margin: "0 0 6px 0",
                background: "linear-gradient(90deg, #ffffff 0%, #38f4ff 60%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              MAHABALESHWAR RADAR INTELLIGENCE
            </h1>
            <p
              style={{
                color: "var(--aero-text-secondary, #94a3b8)",
                fontSize: "0.92rem",
                lineHeight: 1.5,
                margin: "0 0 16px 0",
                maxWidth: "580px",
              }}
            >
              Advanced atmospheric observation, dual-polarimetric radar reflectivity
              visualization and machine-learning-driven rainfall intelligence for the
              Western Ghats cloud observatory.
            </p>

            {/* Scientific Telemetry Readout Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.74rem",
              }}
            >
              <div
                style={{
                  background: "rgba(10, 18, 38, 0.6)",
                  border: "1px solid rgba(0, 240, 255, 0.15)",
                  padding: "8px 12px",
                  borderRadius: "4px",
                }}
              >
                <div style={{ color: "#64748b" }}>STATION COORD</div>
                <div style={{ color: "var(--aero-cyan, #00f0ff)", fontWeight: 600 }}>
                  17.9237°N 73.6586°E
                </div>
              </div>

              <div
                style={{
                  background: "rgba(10, 18, 38, 0.6)",
                  border: "1px solid rgba(0, 240, 255, 0.15)",
                  padding: "8px 12px",
                  borderRadius: "4px",
                }}
              >
                <div style={{ color: "#64748b" }}>STATION ALTITUDE</div>
                <div style={{ color: "#ffffff", fontWeight: 600 }}>1,353 M MSL</div>
              </div>

              <div
                style={{
                  background: "rgba(10, 18, 38, 0.6)",
                  border: "1px solid rgba(0, 240, 255, 0.15)",
                  padding: "8px 12px",
                  borderRadius: "4px",
                }}
              >
                <div style={{ color: "#64748b" }}>SCAN RANGE</div>
                <div style={{ color: "#00ff9d", fontWeight: 600 }}>250 KM RADIUS</div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Holographic Cyber Access Terminal */}
        <section
          style={{
            flex: "1 1 45%",
            maxWidth: "460px",
            width: "100%",
          }}
        >
          <div
            className="aero-panel aero-panel-cut"
            style={{
              padding: "36px 32px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 240, 255, 0.12)",
              border: "1px solid rgba(0, 240, 255, 0.25)",
            }}
          >
            {/* HUD Corner Brackets */}
            <span className="hud-corner-bracket top-left" />
            <span className="hud-corner-bracket top-right" />
            <span className="hud-corner-bracket bottom-left" />
            <span className="hud-corner-bracket bottom-right" />

            {/* Terminal Header */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaTerminal style={{ color: "var(--aero-cyan, #00f0ff)" }} />
                  <span
                    className="telemetry-font"
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--aero-cyan, #00f0ff)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    ACCESS_TERMINAL://AUTH_NODE
                  </span>
                </div>
                <AeroBadge variant="online" pulse={true} style={{ fontSize: "0.65rem" }}>
                  SECURE
                </AeroBadge>
              </div>

              <h2
                className="display-font"
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 700,
                  margin: "0 0 4px 0",
                  letterSpacing: "0.06em",
                }}
              >
                {isLogin ? "Operator Authentication" : "Register Operator"}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.82rem",
                  color: "var(--aero-text-secondary, #94a3b8)",
                }}
              >
                {isLogin
                  ? "Enter operator credentials to access the radar intelligence interface."
                  : "Establish new operator credentials for the radar validation portal."}
              </p>
            </div>

            {/* Mode Switch Tabs (LOGIN / REGISTER) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                padding: "4px",
                background: "rgba(6, 12, 26, 0.8)",
                border: "1px solid rgba(0, 240, 255, 0.15)",
                borderRadius: "6px",
                marginBottom: "24px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setMessage("");
                }}
                style={{
                  padding: "9px 0",
                  background: isLogin
                    ? "linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(37, 99, 235, 0.3) 100%)"
                    : "transparent",
                  color: isLogin ? "#ffffff" : "#94a3b8",
                  border: isLogin ? "1px solid rgba(0, 240, 255, 0.5)" : "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "var(--font-display, sans-serif)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  transition: "all 0.25s",
                }}
              >
                System Login
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setMessage("");
                }}
                style={{
                  padding: "9px 0",
                  background: !isLogin
                    ? "linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(37, 99, 235, 0.3) 100%)"
                    : "transparent",
                  color: !isLogin ? "#ffffff" : "#94a3b8",
                  border: !isLogin ? "1px solid rgba(0, 240, 255, 0.5)" : "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "var(--font-display, sans-serif)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  transition: "all 0.25s",
                }}
              >
                New Operator
              </button>
            </div>

            {/* Status / Alert Banner */}
            {message && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  marginBottom: "18px",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-mono, monospace)",
                  background: isSuccess
                    ? "rgba(0, 255, 157, 0.12)"
                    : "rgba(239, 68, 68, 0.12)",
                  border: `1px solid ${
                    isSuccess
                      ? "rgba(0, 255, 157, 0.4)"
                      : "rgba(239, 68, 68, 0.4)"
                  }`,
                  color: isSuccess ? "#00ff9d" : "#ef4444",
                  animation: "fadeIn 0.2s ease",
                }}
              >
                {isSuccess ? <FaCheckCircle /> : <FaExclamationTriangle />}
                <span>{message}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit}>
              {/* Registration Only: Username */}
              {!isLogin && (
                <AeroInput
                  label="Operator Call-Sign (Username)"
                  type="text"
                  placeholder="e.g. radar_analyst_01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  icon={<FaUserAstronaut />}
                />
              )}

              {/* Login Mode: Username or Email */}
              {isLogin && (
                <AeroInput
                  label="Call-Sign or Secure Email"
                  type="text"
                  placeholder="Username or registered email"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  required
                  autoComplete="username"
                  icon={<FaUserAstronaut />}
                />
              )}

              {/* Registration Only: Email */}
              {!isLogin && (
                <AeroInput
                  label="Institutional Email"
                  type="email"
                  placeholder="operator@institute.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  icon={<FaEnvelope />}
                />
              )}

              {/* Password */}
              <AeroInput
                label="Authorization Cipher (Password)"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
              />

              {/* Registration Only: Confirm Password */}
              {!isLogin && (
                <AeroInput
                  label="Confirm Authorization Cipher"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              )}

              {/* Submit Cyber Button */}
              <div style={{ marginTop: "24px" }}>
                <AeroButton
                  type="submit"
                  loading={loading}
                  style={{ width: "100%", padding: "14px" }}
                  icon={<FaShieldAlt />}
                >
                  {isLogin ? "INITIALIZE OPERATOR SESSION" : "REGISTER SYSTEM OPERATOR"}
                </AeroButton>
              </div>

              {/* Toggle text link */}
              <div
                style={{
                  marginTop: "18px",
                  textAlign: "center",
                  fontSize: "0.82rem",
                  color: "var(--aero-text-secondary, #94a3b8)",
                }}
              >
                {isLogin ? "Unregistered researcher or operator? " : "Already registered as an operator? "}
                <span
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setMessage("");
                  }}
                  style={{
                    color: "var(--aero-cyan, #00f0ff)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontWeight: 600,
                  }}
                >
                  {isLogin ? "Request Access" : "Sign In Here"}
                </span>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Cockpit Footer */}
      <footer
        style={{
          padding: "12px 36px",
          borderTop: "1px solid rgba(0, 240, 255, 0.1)",
          background: "rgba(6, 10, 23, 0.7)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.72rem",
          color: "#64748b",
          zIndex: 100,
        }}
      >
        <div>
          RADAR NODE: <span style={{ color: "#ffffff" }}>MAHABALESHWAR DWR</span> | FREQ:{" "}
          <span style={{ color: "var(--aero-cyan, #00f0ff)" }}>2.8 GHz</span>
        </div>
        <div>AEROSCOPE INTELLIGENCE SYSTEM • ALL PROTOCOLS ENCRYPTED</div>
      </footer>
    </div>
  );
}
