import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ViewPlots.css";
import RadarPlotModal from "../components/RadarPlotModal";
import AeroButton from "../components/ui/AeroButton";
import AeroBadge from "../components/ui/AeroBadge";
import {
  FaChartBar,
  FaFileCode,
  FaExpand,
  FaDownload,
  FaSyncAlt,
  FaSatelliteDish,
  FaCrosshairs,
  FaTrashAlt,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSlidersH,
} from "react-icons/fa";

export default function ViewPlots({ uploadedFiles, fileStore }) {
  const [selectedFile, setSelectedFile] = useState("");
  const [plotType, setPlotType] = useState("PPI");
  const [variable, setVariable] = useState("");
  const [availableVariables, setAvailableVariables] = useState([]);
  const [generatedPlotUrl, setGeneratedPlotUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const radarFiles = uploadedFiles?.radarFiles || [];

  // Reset parameters when selected file changes
  useEffect(() => {
    if (selectedFile) {
      setAvailableVariables([]);
      setVariable("");
      if (generatedPlotUrl) {
        URL.revokeObjectURL(generatedPlotUrl);
      }
      setGeneratedPlotUrl("");
      setError("");
    }
  }, [selectedFile]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (generatedPlotUrl) {
        URL.revokeObjectURL(generatedPlotUrl);
      }
    };
  }, [generatedPlotUrl]);

  // Load available variables from selected NetCDF file
  const loadFileVariables = async () => {
    if (!selectedFile) {
      setError("Please select a radar file first");
      return;
    }

    const fileMetadata = radarFiles.find((f) => f.id === selectedFile);
    if (!fileMetadata) {
      setError("Selected file not found in metadata registry");
      return;
    }

    const file = fileStore.get(selectedFile);
    if (!file) {
      setError(
        "File binary not found in browser memory (session refreshed). Please re-upload in the Upload Data module."
      );
      return;
    }

    setLoadingVariables(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://localhost:5000/api/radar/get-variables",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.variables) {
        setAvailableVariables(response.data.variables);
        if (response.data.variables.length > 0) {
          setVariable(response.data.variables[0]);
        }
      } else {
        setError("Could not extract polarimetric variables from NetCDF binary");
      }
    } catch (err) {
      console.error("Error loading variables:", err);
      setError(err.response?.data?.error || "Failed to parse NetCDF variables");
    } finally {
      setLoadingVariables(false);
    }
  };

  // Generate plot using backend Py-ART processing
  const generatePlot = async () => {
    if (!selectedFile) {
      setError("Please select a radar file first");
      return;
    }

    if (!variable) {
      setError("Please load variables and select a polarimetric channel");
      return;
    }

    const fileMetadata = radarFiles.find((f) => f.id === selectedFile);
    if (!fileMetadata) {
      setError("Selected file not found in metadata registry");
      return;
    }

    const file = fileStore.get(selectedFile);
    if (!file) {
      setError(
        "File content not available in browser memory. Please re-upload the file in Upload Data."
      );
      return;
    }

    setLoading(true);
    setError("");

    if (generatedPlotUrl) {
      URL.revokeObjectURL(generatedPlotUrl);
    }
    setGeneratedPlotUrl("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("plotType", plotType);
      formData.append("variable", variable);

      const response = await axios.post(
        "http://localhost:5000/api/radar/generate-plot",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          responseType: "blob",
        }
      );

      const imageUrl = URL.createObjectURL(response.data);
      setGeneratedPlotUrl(imageUrl);
    } catch (err) {
      console.error("Error generating plot:", err);
      setError(err.response?.data?.error || "Py-ART plot generation failed");
    } finally {
      setLoading(false);
    }
  };

  const clearPlot = () => {
    if (generatedPlotUrl) {
      URL.revokeObjectURL(generatedPlotUrl);
    }
    setGeneratedPlotUrl("");
    setError("");
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const selectedFileObj = radarFiles.find((f) => f.id === selectedFile);
  const isInMemory = selectedFile ? fileStore.has(selectedFile) : false;

  const handleDownload = () => {
    if (!generatedPlotUrl) return;
    const a = document.createElement("a");
    a.href = generatedPlotUrl;
    a.download = `AEROSCOPE_PLOT_${selectedFileObj?.name || "RADAR"}_${plotType}_${variable}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="aero-view-plots-console">
      {/* Top Telemetry Header Ribbon */}
      <div className="view-plots-top-ribbon">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <FaChartBar style={{ color: "var(--aero-yellow, #ffd600)", fontSize: "1.2rem" }} />
          <div>
            <h2
              className="display-font"
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                margin: "0 0 2px 0",
                color: "#ffffff",
              }}
            >
              DYNAMIC RADAR PLOT VISUALIZER
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--aero-text-secondary, #94a3b8)",
              }}
            >
              Generate high-resolution PPI and RHI dual-polarimetric radar plots from
              uploaded NetCDF binaries.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AeroBadge variant="yellow" pulse={false}>
            {radarFiles.length} VOLUMES AVAILABLE
          </AeroBadge>
        </div>
      </div>

      {/* Main Cockpit Split Grid */}
      <div className="view-plots-cockpit-grid">
        {/* LEFT: Configuration Console */}
        <aside className="view-plots-controls-rail">
          <div className="aero-panel aero-panel-cut" style={{ padding: "20px" }}>
            <span className="hud-corner-bracket top-left" />
            <span className="hud-corner-bracket top-right" />
            <span className="hud-corner-bracket bottom-left" />
            <span className="hud-corner-bracket bottom-right" />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                paddingBottom: "10px",
                borderBottom: "1px solid rgba(255, 214, 0, 0.15)",
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
                <FaSlidersH style={{ color: "var(--aero-yellow, #ffd600)" }} />
                PLOT CONFIGURATION
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  color: "#64748b",
                }}
              >
                CH://01
              </span>
            </div>

            {/* Step 1: Select Radar File */}
            <div className="control-input-group">
              <label>1. Select Ingested Radar Volume</label>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="cyber-select"
              >
                <option value="">-- Choose NetCDF volume scan --</option>
                {radarFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name} ({formatFileSize(file.size)}) — {file.scanType}
                  </option>
                ))}
              </select>

              {radarFiles.length === 0 && (
                <div
                  style={{
                    padding: "8px 10px",
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "4px",
                    color: "#fbbf24",
                    fontSize: "0.74rem",
                    fontFamily: "var(--font-mono)",
                    marginTop: "4px",
                  }}
                >
                  No radar files uploaded. Please upload NetCDF files in the Upload Data module.
                </div>
              )}

              {selectedFile && !isInMemory && (
                <div
                  style={{
                    padding: "8px 10px",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    borderRadius: "4px",
                    color: "#ef4444",
                    fontSize: "0.74rem",
                    fontFamily: "var(--font-mono)",
                    marginTop: "4px",
                  }}
                >
                  ⚠️ File binary is not in memory cache (page was refreshed). Please re-upload in Upload Data.
                </div>
              )}
            </div>

            {/* Step 2: Load Variables Action */}
            {selectedFile && isInMemory && (
              <div style={{ marginBottom: "16px" }}>
                <AeroButton
                  onClick={loadFileVariables}
                  loading={loadingVariables}
                  variant="outline"
                  style={{ width: "100%", padding: "10px", fontSize: "0.78rem" }}
                  icon={<FaSyncAlt />}
                >
                  {loadingVariables ? "EXTRACTING NETCDF VARIABLES..." : "LOAD AVAILABLE VARIABLES"}
                </AeroButton>
              </div>
            )}

            {/* Step 3: Scan Geometry (PPI / RHI) */}
            <div className="control-input-group">
              <label>2. Scan Geometry (Plot Type)</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                  padding: "4px",
                  background: "rgba(10, 10, 10, 0.8)",
                  border: "1px solid rgba(255, 214, 0, 0.15)",
                  borderRadius: "6px",
                }}
              >
                <button
                  type="button"
                  className={`scan-pill-btn ${plotType === "PPI" ? "active" : ""}`}
                  onClick={() => setPlotType("PPI")}
                  style={{ padding: "8px 12px" }}
                >
                  PPI (Azimuth)
                </button>
                <button
                  type="button"
                  className={`scan-pill-btn ${plotType === "RHI" ? "active" : ""}`}
                  onClick={() => setPlotType("RHI")}
                  style={{ padding: "8px 12px" }}
                >
                  RHI (Vertical)
                </button>
              </div>
            </div>

            {/* Step 4: Polarimetric Variable Selection */}
            <div className="control-input-group">
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>3. Polarimetric Variable</span>
                {availableVariables.length > 0 && (
                  <span style={{ color: "var(--aero-yellow, #ffd600)", fontFamily: "var(--font-mono)" }}>
                    {availableVariables.length} AVAILABLE
                  </span>
                )}
              </label>

              {availableVariables.length > 0 ? (
                <div className="variable-pills-wrap">
                  {availableVariables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`var-badge-pill ${variable === v ? "selected" : ""}`}
                      onClick={() => setVariable(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "10px",
                    background: "rgba(10, 10, 10, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    color: "#64748b",
                    textAlign: "center",
                  }}
                >
                  {selectedFile
                    ? 'Click "LOAD AVAILABLE VARIABLES" above'
                    : "Select a radar volume file first"}
                </div>
              )}
            </div>

            {/* Step 5: Generate Plot Action */}
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <AeroButton
                onClick={generatePlot}
                disabled={!selectedFile || !variable || loading || loadingVariables || !isInMemory}
                loading={loading}
                style={{ width: "100%", padding: "13px" }}
                icon={<FaCrosshairs />}
              >
                {loading ? "GENERATING SCIENTIFIC PLOT..." : "GENERATE RADAR PLOT"}
              </AeroButton>

              {generatedPlotUrl && (
                <button
                  onClick={clearPlot}
                  className="aero-btn aero-btn-outline"
                  style={{
                    borderColor: "rgba(239, 68, 68, 0.3)",
                    color: "#ef4444",
                    padding: "8px",
                    fontSize: "0.76rem",
                  }}
                >
                  <FaTrashAlt style={{ marginRight: "6px" }} />
                  CLEAR PLOT
                </button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "10px 12px",
                  borderRadius: "4px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  fontSize: "0.76rem",
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <FaExclamationTriangle style={{ marginTop: "2px", flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT: Scientific Plot Viewing Chamber */}
        <main className="view-plots-display-chamber">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          {/* Chamber Toolbar */}
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
                SCIENTIFIC PLOT CHAMBER
              </span>
              {variable && (
                <AeroBadge variant="yellow" pulse={false} style={{ fontSize: "0.68rem" }}>
                  {plotType} • {variable}
                </AeroBadge>
              )}
            </div>

            {/* Quick Actions */}
            {generatedPlotUrl && !loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => setModalOpen(true)}
                  className="aero-btn aero-btn-outline"
                  style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                  title="Expand to Fullscreen"
                >
                  <FaExpand style={{ marginRight: "4px" }} /> FULL-RES
                </button>

                <button
                  onClick={handleDownload}
                  className="aero-btn aero-btn-outline"
                  style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                  title="Export High-Resolution PNG"
                >
                  <FaDownload style={{ marginRight: "4px" }} /> EXPORT
                </button>
              </div>
            )}
          </div>

          {/* Image Container */}
          <div className="chamber-image-container">
            {loading ? (
              <div className="radar-plot-loader">
                <div className="loader-radar-reticle" />
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.85rem",
                    color: "var(--aero-yellow, #ffd600)",
                    letterSpacing: "0.08em",
                  }}
                >
                  PROCESSING NETCDF BINARY VIA PY-ART...
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.72rem",
                    color: "#64748b",
                  }}
                >
                  Extracting polarimetric sweep matrix [{plotType} • {variable}]
                </span>
              </div>
            ) : generatedPlotUrl ? (
              <img
                src={generatedPlotUrl}
                alt={`${variable} ${plotType} Plot`}
                className="view-plot-img"
                onClick={() => setModalOpen(true)}
                title="Click to view in high-resolution modal"
              />
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
                <FaSatelliteDish style={{ fontSize: "3.2rem", color: "rgba(255, 214, 0, 0.25)" }} />
                <div style={{ fontSize: "0.95rem", color: "var(--aero-text-secondary, #94a3b8)" }}>
                  No plot generated yet
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b", maxWidth: "440px" }}>
                  Select an ingested radar NetCDF file on the left, load its variables, choose PPI or RHI, and click "GENERATE RADAR PLOT".
                </div>
              </div>
            )}
          </div>

          {/* Bottom Telemetry Information Bar */}
          {generatedPlotUrl && selectedFileObj && (
            <div
              style={{
                marginTop: "14px",
                paddingTop: "10px",
                borderTop: "1px solid rgba(255, 214, 0, 0.12)",
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
                FILE: <span style={{ color: "#ffffff" }}>{selectedFileObj.name}</span>
              </div>
              <div>
                GEOMETRY: <span style={{ color: "var(--aero-yellow, #ffd600)" }}>{plotType}</span> | VARIABLE:{" "}
                <span style={{ color: "#ffd600" }}>{variable}</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Fullscreen High-Resolution Modal */}
      <RadarPlotModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        imageUrl={generatedPlotUrl}
        date={selectedFileObj?.uploadDate ? new Date(selectedFileObj.uploadDate).toLocaleDateString() : "UPLOADED"}
        filename={selectedFileObj?.name || "Radar Plot"}
        plotType={plotType}
        variable={variable}
      />
    </div>
  );
}
