import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Dashboard.css";
import RadarPlotModal from "../components/RadarPlotModal";
import AeroButton from "../components/ui/AeroButton";
import AeroBadge from "../components/ui/AeroBadge";
import {
  FaCalendarAlt,
  FaFileCode,
  FaExpand,
  FaDownload,
  FaSyncAlt,
  FaInfoCircle,
  FaSearch,
  FaSatelliteDish,
  FaCrosshairs,
} from "react-icons/fa";

export default function Dashboard() {
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [radarFiles, setRadarFiles] = useState([]);
  const [plotType, setPlotType] = useState("PPI");
  const [variable, setVariable] = useState("DBZ");
  const [selectedFile, setSelectedFile] = useState("");
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch available dates on mount
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/radar/dates")
      .then((res) => {
        setAvailableDates(res.data);
        if (res.data.length > 0 && !selectedDate) {
          // Auto-select latest or first date
          loadDateFiles(res.data[0]);
        }
      })
      .catch((err) => console.error("Error fetching dates:", err));
  }, []);

  const loadDateFiles = (date) => {
    setSelectedDate(date);
    setSelectedFile("");
    setImageLoading(true);

    axios
      .get(`http://localhost:5000/api/radar/files/${date}`)
      .then((res) => {
        setRadarFiles(res.data);
        if (res.data.length > 0) {
          setSelectedFile(res.data[0]);
        } else {
          setImageLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching files:", err);
        setImageLoading(false);
      });
  };

  const handleDateChange = (e) => {
    loadDateFiles(e.target.value);
  };

  const handleFileSelect = (file) => {
    if (file !== selectedFile) {
      setSelectedFile(file);
      setImageLoading(true);
      setImageError(false);
    }
  };

  const handlePlotTypeChange = (type) => {
    if (type !== plotType) {
      setPlotType(type);
      setImageLoading(true);
      setImageError(false);
    }
  };

  const handleVariableChange = (v) => {
    if (v !== variable) {
      setVariable(v);
      setImageLoading(true);
      setImageError(false);
    }
  };

  const getImageUrl = () => {
    if (!selectedDate || !selectedFile) return null;
    return `http://localhost:5000/api/radar/plot/${selectedDate}/${selectedFile}/${plotType}/${variable}`;
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageError(false);
    setImageLoading(false);
  };

  const handleDownload = () => {
    const url = getImageUrl();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `AEROSCOPE_${selectedDate}_${selectedFile}_${plotType}_${variable}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Variable scientific metadata
  const variableDetails = {
    DBZ: {
      name: "Reflectivity Factor (dBZ)",
      desc: "Hydrometeor density & rainfall rate estimation",
      unit: "-10 to 75 dBZ",
      color: "#00ff9d",
    },
    VEL: {
      name: "Doppler Radial Velocity (m/s)",
      desc: "Wind velocity towards/away from radar core",
      unit: "±32 m/s",
      color: "#00f0ff",
    },
    ZDR: {
      name: "Differential Reflectivity (dB)",
      desc: "Hydrometeor oblateness & precipitation phase",
      unit: "-2 to +6 dB",
      color: "#a78bfa",
    },
    KDP: {
      name: "Specific Differential Phase (°/km)",
      desc: "Rainfall rate independent of beam attenuation",
      unit: "0 to 10 °/km",
      color: "#fbbf24",
    },
  };

  const filteredFiles = radarFiles.filter((f) =>
    f.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const currentUrl = getImageUrl();

  return (
    <div className="aero-dashboard">
      {/* Top Scientific Telemetry Ribbon */}
      <div className="dashboard-telemetry-ribbon">
        <div className="telemetry-pills-group">
          <div className="telemetry-pill">
            <span className="pill-label">STATION</span>
            <span className="pill-value">MAHABALESHWAR (17.92°N 73.65°E)</span>
          </div>

          <div className="telemetry-pill">
            <span className="pill-label">DATE</span>
            <span className="pill-value">{selectedDate || "NO DATE"}</span>
          </div>

          <div className="telemetry-pill">
            <span className="pill-label">SCAN GEOMETRY</span>
            <span className="pill-value">{plotType} (ELEV: 0.5°)</span>
          </div>

          <div className="telemetry-pill">
            <span className="pill-label">CHANNEL</span>
            <span
              className="pill-value"
              style={{ color: variableDetails[variable]?.color || "#00f0ff" }}
            >
              {variable} // {variableDetails[variable]?.name}
            </span>
          </div>

          <div className="telemetry-pill">
            <span className="pill-label">RADAR RANGE</span>
            <span className="pill-value">250 KM</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AeroBadge variant="online" pulse={true}>
            DWR TELEMETRY ACTIVE
          </AeroBadge>
        </div>
      </div>

      {/* Main Split Cockpit Grid */}
      <div className="dashboard-cockpit-grid">
        {/* LEFT: Controls & NetCDF File Navigator */}
        <aside className="dashboard-controls-rail">
          {/* Panel 1: Scan Controls */}
          <div className="aero-panel aero-panel-cut" style={{ padding: "18px" }}>
            <span className="hud-corner-bracket top-left" />
            <span className="hud-corner-bracket top-right" />
            <span className="hud-corner-bracket bottom-left" />
            <span className="hud-corner-bracket bottom-right" />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
                borderBottom: "1px solid rgba(0, 240, 255, 0.15)",
                paddingBottom: "8px",
              }}
            >
              <span
                className="display-font"
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#f0f6fc",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FaCrosshairs style={{ color: "var(--aero-cyan, #00f0ff)" }} />
                SCAN CONTROLS
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#64748b",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                SYS://PARAM
              </span>
            </div>

            {/* Date Selector */}
            <div style={{ marginBottom: "16px" }}>
              <label
                className="aero-label"
                style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <FaCalendarAlt style={{ color: "var(--aero-cyan, #00f0ff)" }} />
                <span>Observation Date</span>
              </label>
              <select
                className="custom-date-select"
                value={selectedDate}
                onChange={handleDateChange}
              >
                <option value="">-- Select Observation Date --</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </div>

            {/* Scan Type Toggle (PPI vs RHI) */}
            <div style={{ marginBottom: "16px" }}>
              <label className="aero-label" style={{ marginBottom: "6px" }}>
                <span>Scan Type (Geometry)</span>
              </label>
              <div className="scan-type-toggle">
                <button
                  type="button"
                  className={`scan-type-btn ${plotType === "PPI" ? "active" : ""}`}
                  onClick={() => handlePlotTypeChange("PPI")}
                >
                  <FaSatelliteDish /> PPI (Azimuth)
                </button>
                <button
                  type="button"
                  className={`scan-type-btn ${plotType === "RHI" ? "active" : ""}`}
                  onClick={() => handlePlotTypeChange("RHI")}
                >
                  <FaSatelliteDish /> RHI (Vertical)
                </button>
              </div>
            </div>

            {/* Polarimetric Variable 4-Pill Grid */}
            <div>
              <label
                className="aero-label"
                style={{
                  marginBottom: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Polarimetric Variable</span>
                <span style={{ color: variableDetails[variable]?.color, fontFamily: "var(--font-mono)" }}>
                  [{variableDetails[variable]?.unit}]
                </span>
              </label>

              <div className="variable-selector-grid">
                {Object.entries(variableDetails).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    className={`var-pill-btn ${variable === key ? "active" : ""}`}
                    style={{ "--active-color": val.color }}
                    onClick={() => handleVariableChange(key)}
                  >
                    <span className="var-code" style={{ color: variable === key ? val.color : undefined }}>
                      {key}
                    </span>
                    <span className="var-desc">{val.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Panel 2: NetCDF File Navigator */}
          <div className="aero-panel aero-panel-cut" style={{ padding: "18px" }}>
            <span className="hud-corner-bracket top-left" />
            <span className="hud-corner-bracket top-right" />
            <span className="hud-corner-bracket bottom-left" />
            <span className="hud-corner-bracket bottom-right" />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
                borderBottom: "1px solid rgba(0, 240, 255, 0.15)",
                paddingBottom: "8px",
              }}
            >
              <span
                className="display-font"
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#f0f6fc",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FaFileCode style={{ color: "var(--aero-cyan, #00f0ff)" }} />
                RADAR SCANS
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--aero-cyan, #00f0ff)",
                  fontFamily: "var(--font-mono, monospace)",
                  padding: "2px 6px",
                  background: "rgba(0, 240, 255, 0.1)",
                  borderRadius: "3px",
                }}
              >
                {radarFiles.length} FILES
              </span>
            </div>

            {/* File Search input */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Filter NetCDF file..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="file-navigator-search"
              />
              <FaSearch
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "10px",
                  color: "#64748b",
                  fontSize: "0.75rem",
                }}
              />
            </div>

            {/* Selectable File List */}
            <div className="radar-files-scroll-list">
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file, idx) => (
                  <div
                    key={file}
                    className={`radar-file-row ${selectedFile === file ? "selected" : ""}`}
                    onClick={() => handleFileSelect(file)}
                    title={file}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      <span className="file-indicator" />
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {file}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.65rem", color: "#64748b", marginLeft: "4px" }}>
                      #{idx + 1}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    color: "#64748b",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.78rem",
                  }}
                >
                  {selectedDate ? "No matching .nc files" : "Select an observation date"}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT: Main Scientific Plot Viewport */}
        <main className="scientific-plot-viewport">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          {/* Plot Toolbar */}
          <div className="plot-hud-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                className="display-font"
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "0.08em",
                }}
              >
                RADAR SCIENTIFIC PLOT
              </span>
              {selectedFile && (
                <AeroBadge variant="cyan" pulse={false} style={{ fontSize: "0.68rem" }}>
                  {plotType} • {variable}
                </AeroBadge>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {currentUrl && !imageError && (
                <>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="aero-btn aero-btn-outline"
                    style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                    title="Expand to Fullscreen View"
                  >
                    <FaExpand style={{ marginRight: "4px" }} /> FULL-RES
                  </button>

                  <button
                    onClick={handleDownload}
                    className="aero-btn aero-btn-outline"
                    style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                    title="Export Plot as PNG"
                  >
                    <FaDownload style={{ marginRight: "4px" }} /> EXPORT
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Plot Image Container */}
          <div className="plot-image-container">
            {selectedDate && selectedFile ? (
              <>
                {/* Radar Plot Loader */}
                {imageLoading && (
                  <div className="radar-plot-loader">
                    <div className="loader-radar-reticle" />
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "0.82rem",
                        color: "var(--aero-cyan, #00f0ff)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      ACQUIRING RADAR ECHOES...
                    </span>
                  </div>
                )}

                {/* Actual Backend Radar PNG */}
                <img
                  src={currentUrl}
                  alt={`Radar Plot: ${selectedDate} ${selectedFile} ${plotType} ${variable}`}
                  className="main-radar-plot-img"
                  style={{
                    display: imageLoading || imageError ? "none" : "block",
                  }}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  onClick={() => setModalOpen(true)}
                  title="Click to view full-resolution plot"
                />

                {/* Error State */}
                {imageError && !imageLoading && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px",
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#ef4444",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    <FaInfoCircle style={{ fontSize: "2rem" }} />
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                      Plot image not found on radar server
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", maxWidth: "420px" }}>
                      Requested: {selectedFile.replace(/\.nc$/, "")}_{plotType}_{variable}.png
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "14px",
                  color: "#64748b",
                  fontFamily: "var(--font-mono, monospace)",
                  textAlign: "center",
                  padding: "40px 20px",
                }}
              >
                <FaSatelliteDish style={{ fontSize: "3rem", color: "rgba(0, 240, 255, 0.25)" }} />
                <div style={{ fontSize: "0.95rem", color: "var(--aero-text-secondary, #94a3b8)" }}>
                  Select an observation date and NetCDF scan file to display radar reflectivity
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  MAHABALESHWAR CLOUD OBSERVATORY (17.9237°N, 73.6586°E)
                </div>
              </div>
            )}
          </div>

          {/* Bottom Telemetry Legend Footer */}
          <div
            style={{
              marginTop: "12px",
              paddingTop: "10px",
              borderTop: "1px solid rgba(0, 240, 255, 0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.72rem",
              color: "#64748b",
            }}
          >
            <div>
              ACTIVE FILE: <span style={{ color: "#ffffff" }}>{selectedFile || "None"}</span>
            </div>
            <div>
              {variableDetails[variable]?.name} • {variableDetails[variable]?.desc}
            </div>
          </div>
        </main>
      </div>

      {/* Fullscreen High-Resolution Modal */}
      <RadarPlotModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        imageUrl={currentUrl}
        date={selectedDate}
        filename={selectedFile}
        plotType={plotType}
        variable={variable}
      />
    </div>
  );
}
