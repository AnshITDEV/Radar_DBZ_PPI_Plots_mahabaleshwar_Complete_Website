import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import "./Dashboard.css";

// Create a context for dark mode (you might want to move this to a separate file later)
const DarkModeContext = React.createContext();

export default function Dashboard() {
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [radarFiles, setRadarFiles] = useState([]);
  const [plotType, setPlotType] = useState("PPI");
  const [variable, setVariable] = useState("DBZ");
  const [selectedFile, setSelectedFile] = useState("");
  const [imageError, setImageError] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Check for dark mode on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
    } else {
      setDarkMode(false);
    }
  }, []);

  // Listen for dark mode changes
  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem("theme");
      setDarkMode(savedTheme === "dark");
    };

    window.addEventListener("storage", handleStorageChange);

    // Also check when the component is focused
    const handleFocus = () => {
      const savedTheme = localStorage.getItem("theme");
      setDarkMode(savedTheme === "dark");
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/radar/dates")
      .then((res) => setAvailableDates(res.data))
      .catch((err) => console.error("Error fetching dates:", err));
  }, []);

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSelectedFile("");

    axios
      .get(`http://localhost:5000/api/radar/files/${date}`)
      .then((res) => {
        setRadarFiles(res.data);
        if (res.data.length > 0) {
          setSelectedFile(res.data[0]);
        }
      })
      .catch((err) => console.error("Error fetching files:", err));
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const getImageUrl = () => {
    if (!selectedDate || !selectedFile) return null;
    return `http://localhost:5000/api/radar/plot/${selectedDate}/${selectedFile}/${plotType}/${variable}`;
  };

  const handleImageError = () => {
    console.error("Failed to load image");
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  return (
    <div className={`dashboard-container ${darkMode ? "dark-mode" : ""}`}>
      <div className="dashboard-header">
        <h2>Dashboard</h2>
      </div>

      <div className="dashboard-content">
        <div className="controls-section">
          <div className="dashboard-card">
            <h3>Plot Controls</h3>
            <div className="selector-group">
              <div className="selector-item">
                <label>Date:</label>
                <select value={selectedDate} onChange={handleDateChange}>
                  <option value="">-- Select Date --</option>
                  {availableDates.map((date) => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
              </div>

              <div className="selector-item">
                <label>Plot Type:</label>
                <select
                  value={plotType}
                  onChange={(e) => setPlotType(e.target.value)}
                >
                  <option value="PPI">PPI</option>
                  <option value="RHI">RHI</option>
                </select>
              </div>

              <div className="selector-item">
                <label>Variable:</label>
                <select
                  value={variable}
                  onChange={(e) => setVariable(e.target.value)}
                >
                  <option value="DBZ">DBZ</option>
                  <option value="VEL">VEL</option>
                  <option value="ZDR">ZDR</option>
                  <option value="KDP">KDP</option>
                </select>
              </div>
            </div>
          </div>

          <div className="dashboard-card files-section">
            <h3>Radar Files for {selectedDate || "..."}</h3>
            <div className="files-list">
              {radarFiles.length > 0 ? (
                radarFiles.map((file) => (
                  <div
                    key={file}
                    className={`file-item ${
                      selectedFile === file ? "selected" : ""
                    }`}
                    onClick={() => handleFileSelect(file)}
                  >
                    {file}
                  </div>
                ))
              ) : (
                <div className="file-item no-files">No files available</div>
              )}
            </div>
          </div>
        </div>

        <div className="plot-section">
          <div className="dashboard-card plot-container">
            <h3>Radar Plot</h3>
            <div className="image-wrapper">
              {selectedDate && selectedFile ? (
                <div className="image-container">
                  <img
                    src={getImageUrl()}
                    alt="Radar Plot"
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                  />
                  {imageError && (
                    <div className="error-message">Failed to load image</div>
                  )}
                </div>
              ) : (
                <div className="placeholder-message">
                  Select a date and radar file to see the plot
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
