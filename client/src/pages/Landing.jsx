import React, { useState, useEffect } from "react";
import {
  FaTachometerAlt,
  FaUpload,
  FaChartBar,
  FaBalanceScale,
  FaCheck,
  FaSignOutAlt,
  FaBars,
  FaCloudRain,
  FaSatelliteDish,
  FaCompass,
  FaUserAstronaut,
  FaClock,
} from "react-icons/fa";
import Dashboard from "./Dashboard";
import UploadData from "./UploadData";
import ViewPlots from "./ViewPlots";
import ComparePlots from "./ComparePlots";
import RainfallEstimation from "./RainfallEstimation";
import ValidateData from "./ValidateData";
import SoundControl from "../components/SoundControl";
import { rainAudio } from "../utils/audioEngine";
import AtmosphericBackground from "../components/AtmosphericBackground";
import AeroBadge from "../components/ui/AeroBadge";
import logo from "../assets/kjsieit-logo.svg";
import "../index.css";

export default function Landing() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState("");
  const [currentTime, setCurrentTime] = useState({
    utc: "",
    local: "",
  });

  // Lifted state for file management
  const [uploadedFiles, setUploadedFiles] = useState({
    radarFiles: [],
    rainGaugeFiles: [],
    scanType: "RHI",
  });
  const [fileStore] = useState(new Map());

  // Real-time clock tick for UTC & Local time
  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setCurrentTime({
        utc: now.toISOString().substring(11, 19) + " UTC",
        local: now.toLocaleTimeString("en-GB", { hour12: false }) + " IST",
      });
    };
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load file metadata from localStorage on component mount
  useEffect(() => {
    const savedRadarFiles = localStorage.getItem("radarFilesMetadata");
    const savedRainGaugeFiles = localStorage.getItem("rainGaugeFilesMetadata");
    const savedScanType = localStorage.getItem("radarScanType");

    if (savedRadarFiles) {
      try {
        const radarFilesData = JSON.parse(savedRadarFiles);
        setUploadedFiles((prev) => ({ ...prev, radarFiles: radarFilesData }));
      } catch (error) {
        console.error("Error loading radar files from storage:", error);
      }
    }

    if (savedRainGaugeFiles) {
      try {
        const rainGaugeFilesData = JSON.parse(savedRainGaugeFiles);
        setUploadedFiles((prev) => ({
          ...prev,
          rainGaugeFiles: rainGaugeFilesData,
        }));
      } catch (error) {
        console.error("Error loading rain gauge files from storage:", error);
      }
    }

    if (savedScanType) {
      setUploadedFiles((prev) => ({ ...prev, scanType: savedScanType }));
    }
  }, []);

  // Save file metadata to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "radarFilesMetadata",
      JSON.stringify(uploadedFiles.radarFiles)
    );
  }, [uploadedFiles.radarFiles]);

  useEffect(() => {
    localStorage.setItem(
      "rainGaugeFilesMetadata",
      JSON.stringify(uploadedFiles.rainGaugeFiles)
    );
  }, [uploadedFiles.rainGaugeFiles]);

  useEffect(() => {
    localStorage.setItem("radarScanType", uploadedFiles.scanType);
  }, [uploadedFiles.scanType]);

  // Check for authentication token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    if (!token || !username) {
      window.location.href = "/";
    } else {
      setUserName(username);
    }
    // Default to dark mode styling
    document.body.classList.add("dark-mode");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("radarFilesMetadata");
    localStorage.removeItem("rainGaugeFilesMetadata");
    localStorage.removeItem("radarScanType");
    window.location.href = "/";
  };

  const menuItems = [
    { name: "Dashboard", icon: <FaTachometerAlt />, desc: "Radar Telemetry & Plots" },
    { name: "Upload Data", icon: <FaUpload />, desc: "NetCDF & Rain Gauge Files" },
    { name: "View Plots", icon: <FaChartBar />, desc: "Variable Analysis Visualizer" },
    { name: "Compare Plots", icon: <FaBalanceScale />, desc: "Multi-Angle Dual Comparison" },
    { name: "Rainfall Estimation", icon: <FaCloudRain />, desc: "Z-R & Marshall-Palmer AI" },
    { name: "Validate Data", icon: <FaCheck />, desc: "Ground Truth Correlation" },
  ];

  const renderContent = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard />;
      case "Upload Data":
        return (
          <UploadData
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            fileStore={fileStore}
          />
        );
      case "View Plots":
        return (
          <ViewPlots uploadedFiles={uploadedFiles} fileStore={fileStore} />
        );
      case "Compare Plots":
        return (
          <ComparePlots uploadedFiles={uploadedFiles} fileStore={fileStore} />
        );
      case "Rainfall Estimation":
        return (
          <RainfallEstimation
            uploadedFiles={uploadedFiles}
            fileStore={fileStore}
          />
        );
      case "Validate Data":
        return (
          <ValidateData uploadedFiles={uploadedFiles} fileStore={fileStore} />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="landing-container">
      {/* Living Atmospheric Background & Page Transition Beam */}
      <AtmosphericBackground triggerKey={activePage} />

      {/* Atmospheric Scanlines Overlay */}
      <div className="aero-scanlines" />

      {/* LEFT NAVIGATION RAIL */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        {/* Sidebar Header & Brand */}
        <div className="sidebar-top">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              marginBottom: "8px",
            }}
          >
            <button
              className="hamburger"
              onClick={() => {
                rainAudio.playChirp(700, "sine", 0.04);
                setCollapsed(!collapsed);
              }}
              title={collapsed ? "Expand Operations Rail" : "Collapse Rail"}
            >
              <FaBars />
            </button>
            {!collapsed && (
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.68rem",
                  color: "var(--aero-cyan, #00f0ff)",
                  letterSpacing: "0.1em",
                }}
              >
                OPS://RAIL_01
              </span>
            )}
          </div>

          {!collapsed && (
            <div className="logo-container" style={{ flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FaSatelliteDish style={{ color: "var(--aero-cyan, #00f0ff)", fontSize: "1.2rem" }} />
                <span
                  className="display-font"
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: "#ffffff",
                  }}
                >
                  AEROSCOPE
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.65rem",
                  color: "var(--aero-text-secondary, #94a3b8)",
                  letterSpacing: "0.08em",
                  textAlign: "center",
                }}
              >
                MAHABALESHWAR DWR
              </span>
            </div>
          )}
        </div>

        {/* Navigation Rail Items */}
        <nav className="menu" style={{ flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = activePage === item.name;
            return (
              <div
                key={item.name}
                className={`menu-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (activePage !== item.name) {
                    rainAudio.playChirp(840, "sine", 0.05);
                    setActivePage(item.name);
                  }
                }}
                title={collapsed ? `${item.name}: ${item.desc}` : item.desc}
                style={{ position: "relative" }}
              >
                {/* Glowing Vertical Energy Indicator */}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "15%",
                      bottom: "15%",
                      width: "3px",
                      background: "var(--aero-cyan, #00f0ff)",
                      boxShadow: "0 0 10px var(--aero-cyan, #00f0ff)",
                      borderRadius: "0 2px 2px 0",
                    }}
                  />
                )}

                <span
                  className="icon"
                  style={{
                    color: isActive ? "var(--aero-cyan, #00f0ff)" : undefined,
                    filter: isActive ? "drop-shadow(0 0 6px rgba(0, 240, 255, 0.6))" : "none",
                  }}
                >
                  {item.icon}
                </span>

                {!collapsed && (
                  <div style={{ display: "flex", flexDirection: "column", marginLeft: "10px" }}>
                    <span className="label" style={{ margin: 0, fontWeight: isActive ? 700 : 500 }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: isActive ? "var(--aero-cyan, #00f0ff)" : "#64748b",
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "0.02em",
                        textTransform: "none",
                        marginTop: "1px",
                      }}
                    >
                      {item.desc}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: Station Coordinates & Logout */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "14px",
            borderTop: "1px solid var(--aero-border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {!collapsed && (
            <div
              style={{
                padding: "8px 10px",
                background: "rgba(6, 12, 26, 0.6)",
                border: "1px solid rgba(0, 240, 255, 0.12)",
                borderRadius: "6px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.68rem",
                color: "#64748b",
              }}
            >
              <div style={{ color: "var(--aero-cyan, #00f0ff)", fontWeight: 600 }}>
                17.9237°N • 73.6586°E
              </div>
              <div style={{ marginTop: "2px" }}>ALT: 1,353M MSL • S-BAND</div>
            </div>
          )}

          {/* Distinctive Logout Option */}
          <div
            className="menu-item"
            onClick={handleLogout}
            title="Terminate operator session"
            style={{
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              background: "rgba(239, 68, 68, 0.05)",
            }}
          >
            <span className="icon" style={{ color: "#ef4444" }}>
              <FaSignOutAlt />
            </span>
            {!collapsed && (
              <span className="label" style={{ marginLeft: "10px", fontWeight: 600 }}>
                Disconnect
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="main-content">
        {/* TOP CONTROL BAR */}
        <header className="header-bar">
          <div className="header-card">
            {/* Left: Breadcrumbs & Current Module */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <FaCompass style={{ color: "var(--aero-cyan, #00f0ff)", fontSize: "1.1rem" }} />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.68rem",
                    color: "var(--aero-cyan, #00f0ff)",
                    letterSpacing: "0.08em",
                  }}
                >
                  AEROSCOPE // ATMOSPHERIC RESEARCH CENTER
                </div>
                <h1 style={{ fontSize: "1.1rem", marginTop: "2px" }}>
                  {activePage}
                </h1>
              </div>
            </div>

            {/* Right: Live Clocks, Sound, Operator chip */}
            <div className="header-right">
              {/* Dual UTC / IST Time Display */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  background: "rgba(6, 12, 26, 0.7)",
                  border: "1px solid rgba(0, 240, 255, 0.15)",
                  borderRadius: "6px",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.74rem",
                  color: "#94a3b8",
                }}
              >
                <FaClock style={{ color: "var(--aero-cyan, #00f0ff)" }} />
                <span>{currentTime.utc}</span>
                <span style={{ color: "#64748b" }}>|</span>
                <span style={{ color: "#ffffff" }}>{currentTime.local}</span>
              </div>

              {/* Rain Ambience Audio Controller */}
              <SoundControl />

              {/* Operator Call-Sign Chip */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "5px 12px",
                  background: "rgba(10, 18, 38, 0.8)",
                  border: "1px solid rgba(0, 240, 255, 0.25)",
                  borderRadius: "9999px",
                }}
              >
                <FaUserAstronaut style={{ color: "var(--aero-cyan, #00f0ff)", fontSize: "0.85rem" }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.8rem",
                    color: "#ffffff",
                    fontWeight: 600,
                  }}
                >
                  {userName}
                </span>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#00ff9d",
                    boxShadow: "0 0 6px #00ff9d",
                  }}
                />
              </div>

              {/* Quick Logout */}
              <button
                onClick={handleLogout}
                className="aero-btn aero-btn-outline"
                style={{
                  padding: "6px 10px",
                  borderColor: "rgba(239, 68, 68, 0.35)",
                  color: "#ef4444",
                  fontSize: "0.8rem",
                }}
                title="Log Out"
              >
                <FaSignOutAlt />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area with Atmospheric Section Transition */}
        <div className="content-area">
          <div
            key={activePage}
            className="page-card"
            style={{
              animation: "pageSectionTransition 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {renderContent()}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pageSectionTransition {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.995);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
