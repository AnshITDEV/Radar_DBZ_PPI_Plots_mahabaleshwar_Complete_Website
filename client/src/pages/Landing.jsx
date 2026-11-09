import React, { useState, useEffect } from "react";
import {
  FaTachometerAlt,
  FaUpload,
  FaChartBar,
  FaBalanceScale,
  FaCheck,
  FaSignOutAlt,
  FaBars,
  FaMoon,
  FaSun,
  FaCloudRain,
} from "react-icons/fa";
import Dashboard from "./Dashboard";
import UploadData from "./UploadData";
import ViewPlots from "./ViewPlots";
import ComparePlots from "./ComparePlots";
import RainfallEstimation from "./RainfallEstimation";
import ValidateData from "./ValidateData";
import logo from "../assets/kjsieit-logo.svg";
import "../index.css";

export default function Landing() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // Lifted state for file management
  const [uploadedFiles, setUploadedFiles] = useState({
    radarFiles: [],
    rainGaugeFiles: [],
    scanType: "RHI",
  });
  const [fileStore] = useState(new Map());

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

  // Check for token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    if (!token || !username) {
      // Redirect to login if not logged in
      window.location.href = "/";
    } else {
      setUserName(username);
    }
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.body.classList.add("dark-mode");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    // Also clear file-related localStorage
    localStorage.removeItem("radarFilesMetadata");
    localStorage.removeItem("rainGaugeFilesMetadata");
    localStorage.removeItem("radarScanType");
    window.location.href = "/";
  };

  const menuItems = [
    { name: "Dashboard", icon: <FaTachometerAlt /> },
    { name: "Upload Data", icon: <FaUpload /> },
    { name: "View Plots", icon: <FaChartBar /> },
    { name: "Compare Plots", icon: <FaBalanceScale /> },
    { name: "Rainfall Estimation", icon: <FaCloudRain /> },
    { name: "Validate Data", icon: <FaCheck /> },
    { name: "Logout", icon: <FaSignOutAlt /> },
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
    <div className={`landing-container ${darkMode ? "dark-mode" : ""}`}>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-top">
          <button
            className="hamburger"
            onClick={() => setCollapsed(!collapsed)}
          >
            <FaBars />
          </button>
          {!collapsed && (
            <div className="logo-container">
              <img src={logo} alt="Logo" className="logo" />
            </div>
          )}
        </div>

        <nav className="menu">
          {menuItems.map((item) =>
            item.name === "Logout" ? (
              <div key={item.name} className="menu-item" onClick={handleLogout}>
                <span className="icon">{item.icon}</span>
                {!collapsed && <span className="label">{item.name}</span>}
              </div>
            ) : (
              <div
                key={item.name}
                className={`menu-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => setActivePage(item.name)}
              >
                <span className="icon">{item.icon}</span>
                {!collapsed && <span className="label">{item.name}</span>}
              </div>
            )
          )}
        </nav>
      </aside>

      <main className="main-content">
        <header className="header-bar">
          <div className="header-card">
            <h1>Validation of Radar Data With Rain Gauge Data Using AI</h1>
            <div className="header-right">
              <span className="user-id">{userName}</span>
              <button className="theme-toggle-btn" onClick={toggleDarkMode}>
                {darkMode ? <FaSun /> : <FaMoon />}
              </button>
            </div>
          </div>
        </header>
        <div className="content-area">
          <div className="page-card">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
}
