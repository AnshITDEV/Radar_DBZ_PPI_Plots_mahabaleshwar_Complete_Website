import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ComparePlots.css";
import RadarPlotModal from "../components/RadarPlotModal";
import AeroButton from "../components/ui/AeroButton";
import AeroBadge from "../components/ui/AeroBadge";
import {
  FaBalanceScale,
  FaFileCode,
  FaSlidersH,
  FaSyncAlt,
  FaCrosshairs,
  FaExpand,
  FaDownload,
  FaTrashAlt,
  FaExclamationTriangle,
  FaLayerGroup,
  FaHistory,
  FaRandom,
  FaInfoCircle,
} from "react-icons/fa";

export default function ComparePlots({ uploadedFiles, fileStore }) {
  const [comparisonMode, setComparisonMode] = useState(
    "same-file-different-vars"
  );
  const [plot1Config, setPlot1Config] = useState({
    fileId: "",
    variable: "",
    plotType: "PPI",
  });
  const [plot2Config, setPlot2Config] = useState({
    fileId: "",
    variable: "",
    plotType: "PPI",
  });
  const [availableVariables1, setAvailableVariables1] = useState([]);
  const [availableVariables2, setAvailableVariables2] = useState([]);
  const [loadingVariables1, setLoadingVariables1] = useState(false);
  const [loadingVariables2, setLoadingVariables2] = useState(false);
  const [generatedPlots, setGeneratedPlots] = useState({
    plot1: { url: null, loading: false },
    plot2: { url: null, loading: false },
  });
  const [error, setError] = useState("");
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [activeModalPlot, setActiveModalPlot] = useState(null); // { url, filename, plotType, variable }

  const radarFiles = uploadedFiles?.radarFiles || [];

  // Reset parameters when comparison mode changes
  useEffect(() => {
    setPlot1Config({ fileId: "", variable: "", plotType: "PPI" });
    setPlot2Config({ fileId: "", variable: "", plotType: "PPI" });
    setAvailableVariables1([]);
    setAvailableVariables2([]);
    clearPlots();
    setError("");
  }, [comparisonMode]);

  // Sync file for Plot 2 when in same-file mode
  useEffect(() => {
    if (comparisonMode === "same-file-different-vars" && plot1Config.fileId) {
      setPlot2Config((prev) => ({ ...prev, fileId: plot1Config.fileId }));
      if (availableVariables1.length > 0) {
        setAvailableVariables2(availableVariables1);
      }
    }
  }, [plot1Config.fileId, comparisonMode, availableVariables1]);

  // Sync variable for Plot 2 when in same-variable mode
  useEffect(() => {
    if (comparisonMode === "different-files-same-var" && plot1Config.variable) {
      setPlot2Config((prev) => ({ ...prev, variable: plot1Config.variable }));
    }
  }, [plot1Config.variable, comparisonMode]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      clearPlots();
    };
  }, []);

  const clearPlots = () => {
    if (generatedPlots.plot1.url) {
      URL.revokeObjectURL(generatedPlots.plot1.url);
    }
    if (generatedPlots.plot2.url) {
      URL.revokeObjectURL(generatedPlots.plot2.url);
    }
    setGeneratedPlots({
      plot1: { url: null, loading: false },
      plot2: { url: null, loading: false },
    });
  };

  // Load variables for plot 1
  const loadVariables1 = async () => {
    if (!plot1Config.fileId) {
      setError("Please select a file for Plot 1 first");
      return;
    }

    const file = fileStore.get(plot1Config.fileId);
    if (!file) {
      setError("File binary not found in browser memory. Please re-upload in Upload Data.");
      return;
    }

    setLoadingVariables1(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://localhost:5000/api/radar/get-variables",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.variables) {
        const variables = response.data.variables;
        setAvailableVariables1(variables);

        if (!plot1Config.variable && variables.length > 0) {
          setPlot1Config((prev) => ({ ...prev, variable: variables[0] }));
        }

        if (comparisonMode === "same-file-different-vars") {
          setAvailableVariables2(variables);
          if (!plot2Config.variable && variables.length > 1) {
            setPlot2Config((prev) => ({ ...prev, variable: variables[1] }));
          } else if (!plot2Config.variable && variables.length === 1) {
            setPlot2Config((prev) => ({ ...prev, variable: variables[0] }));
            setError("Note: Only 1 variable found in this file. Select different files for cross-comparison.");
          }
        }
      } else {
        setError("Could not extract variables from Plot 1 file");
      }
    } catch (err) {
      console.error("Error loading variables for Plot 1:", err);
      setError(err.response?.data?.error || "Failed to load variables for Plot 1");
    } finally {
      setLoadingVariables1(false);
    }
  };

  // Load variables for plot 2
  const loadVariables2 = async () => {
    if (!plot2Config.fileId) {
      setError("Please select a file for Plot 2 first");
      return;
    }

    const file = fileStore.get(plot2Config.fileId);
    if (!file) {
      setError("File binary not found in browser memory. Please re-upload in Upload Data.");
      return;
    }

    setLoadingVariables2(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://localhost:5000/api/radar/get-variables",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.variables) {
        setAvailableVariables2(response.data.variables);
        if (!plot2Config.variable && response.data.variables.length > 0) {
          setPlot2Config((prev) => ({
            ...prev,
            variable: response.data.variables[0],
          }));
        }
      } else {
        setError("Could not extract variables from Plot 2 file");
      }
    } catch (err) {
      console.error("Error loading variables for Plot 2:", err);
      setError(err.response?.data?.error || "Failed to load variables for Plot 2");
    } finally {
      setLoadingVariables2(false);
    }
  };

  // Generate individual plot via Py-ART backend
  const generatePlot = async (plotNumber) => {
    const config = plotNumber === 1 ? plot1Config : plot2Config;
    const fileId = config.fileId;

    if (!fileId || !config.variable) return null;

    const file = fileStore.get(fileId);
    if (!file) {
      throw new Error(`File binary missing from memory for Plot ${plotNumber}. Please re-upload in Upload Data.`);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("plotType", config.plotType);
    formData.append("variable", config.variable);

    const response = await axios.post(
      "http://localhost:5000/api/radar/generate-plot",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "blob",
      }
    );

    return URL.createObjectURL(response.data);
  };

  // Generate comparison
  const generateComparison = async () => {
    setError("");
    setLoadingComparison(true);
    clearPlots();

    try {
      const [plot1Url, plot2Url] = await Promise.all([
        generatePlot(1),
        generatePlot(2),
      ]);

      setGeneratedPlots({
        plot1: { url: plot1Url, loading: false },
        plot2: { url: plot2Url, loading: false },
      });
    } catch (err) {
      setError(err.message || "Failed to generate comparison plots");
      clearPlots();
    } finally {
      setLoadingComparison(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileName = (fileId) => {
    const file = radarFiles.find((f) => f.id === fileId);
    return file ? file.name : "Unselected";
  };

  const canGenerate =
    plot1Config.fileId &&
    plot1Config.variable &&
    plot2Config.fileId &&
    plot2Config.variable &&
    !loadingVariables1 &&
    !loadingVariables2 &&
    fileStore.has(plot1Config.fileId) &&
    fileStore.has(plot2Config.fileId);

  const handleDownload = (url, name) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `AEROSCOPE_COMPARE_${name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="aero-compare-console">
      {/* Top Header Ribbon */}
      <div className="compare-header-ribbon">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <FaBalanceScale style={{ color: "var(--aero-yellow, #ffd600)", fontSize: "1.25rem" }} />
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
              DUAL RADAR COMPARISON CONSOLE
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--aero-text-secondary, #94a3b8)",
              }}
            >
              Side-by-side comparative analysis of dual-polarimetric variables, temporal scan volumes, and geometry cross-sections.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AeroBadge variant="yellow" pulse={false}>
            PARALLEL PY-ART ENGINE
          </AeroBadge>
        </div>
      </div>

      {/* Comparison Mode Selection: 3 Cards */}
      <div>
        <label
          className="aero-label"
          style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <FaSlidersH style={{ color: "var(--aero-yellow, #ffd600)" }} />
          <span>Select Comparative Analysis Architecture:</span>
        </label>

        <div className="comparison-modes-grid">
          {/* Mode 1 */}
          <div
            className={`mode-select-card ${
              comparisonMode === "same-file-different-vars" ? "active" : ""
            }`}
            onClick={() => setComparisonMode("same-file-different-vars")}
          >
            <div className="mode-card-header">
              <span className="mode-card-title">
                <FaLayerGroup style={{ color: "var(--aero-yellow, #ffd600)" }} />
                SAME FILE • DUAL VARIABLES
              </span>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background:
                    comparisonMode === "same-file-different-vars"
                      ? "var(--aero-yellow, #ffd600)"
                      : "transparent",
                  border: "1px solid var(--aero-yellow, #ffd600)",
                }}
              />
            </div>
            <p className="mode-card-desc">
              Compare two different polarimetric channels (e.g. DBZ vs ZDR) from the identical radar scan volume.
            </p>
          </div>

          {/* Mode 2 */}
          <div
            className={`mode-select-card ${
              comparisonMode === "different-files-same-var" ? "active" : ""
            }`}
            onClick={() => setComparisonMode("different-files-same-var")}
          >
            <div className="mode-card-header">
              <span className="mode-card-title">
                <FaHistory style={{ color: "#ffc400" }} />
                DIFFERENT FILES • SAME VARIABLE
              </span>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background:
                    comparisonMode === "different-files-same-var"
                      ? "#ffc400"
                      : "transparent",
                  border: "1px solid #ffc400",
                }}
              />
            </div>
            <p className="mode-card-desc">
              Compare the temporal or elevation evolution of the same variable across two distinct radar volume files.
            </p>
          </div>

          {/* Mode 3 */}
          <div
            className={`mode-select-card ${
              comparisonMode === "different-files-different-vars" ? "active" : ""
            }`}
            onClick={() => setComparisonMode("different-files-different-vars")}
          >
            <div className="mode-card-header">
              <span className="mode-card-title">
                <FaRandom style={{ color: "#ffffff" }} />
                INDEPENDENT DUAL MATRIX
              </span>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background:
                    comparisonMode === "different-files-different-vars"
                      ? "#ffffff"
                      : "transparent",
                  border: "1px solid #ffffff",
                }}
              />
            </div>
            <p className="mode-card-desc">
              Fully independent comparison of two arbitrary radar files, variables, and scan geometry angles.
            </p>
          </div>
        </div>
      </div>

      {/* Dual Configuration Columns */}
      <div className="dual-config-grid">
        {/* PLOT 1 CONFIGURATION */}
        <div className="plot-config-column">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          <div className="config-col-header">
            <span className="config-col-title">
              <FaCrosshairs style={{ color: "var(--aero-yellow, #ffd600)" }} />
              PLOT 1 CONFIGURATION
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.68rem",
                color: "var(--aero-yellow, #ffd600)",
              }}
            >
              CHANNEL A
            </span>
          </div>

          {/* File Selector */}
          <div className="control-input-group" style={{ marginBottom: "12px" }}>
            <label>1. Radar Volume Scan</label>
            <select
              value={plot1Config.fileId}
              onChange={(e) =>
                setPlot1Config((prev) => ({
                  ...prev,
                  fileId: e.target.value,
                }))
              }
              className="cyber-select"
            >
              <option value="">-- Choose file for Plot 1 --</option>
              {radarFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name} ({formatFileSize(file.size)}) — {file.scanType}
                </option>
              ))}
            </select>
          </div>

          {/* Load Variables Action */}
          {plot1Config.fileId && (
            <div style={{ marginBottom: "12px" }}>
              <AeroButton
                onClick={loadVariables1}
                loading={loadingVariables1}
                variant="outline"
                style={{ width: "100%", padding: "8px", fontSize: "0.75rem" }}
                icon={<FaSyncAlt />}
              >
                {loadingVariables1 ? "EXTRACTING..." : "LOAD PLOT 1 VARIABLES"}
              </AeroButton>
            </div>
          )}

          {/* Plot Type Toggle */}
          <div className="control-input-group" style={{ marginBottom: "12px" }}>
            <label>2. Scan Geometry</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
                padding: "3px",
                background: "rgba(10, 10, 10, 0.8)",
                border: "1px solid rgba(255, 214, 0, 0.15)",
                borderRadius: "6px",
              }}
            >
              <button
                type="button"
                className={`scan-pill-btn ${plot1Config.plotType === "PPI" ? "active" : ""}`}
                onClick={() => setPlot1Config((prev) => ({ ...prev, plotType: "PPI" }))}
              >
                PPI (Azimuth)
              </button>
              <button
                type="button"
                className={`scan-pill-btn ${plot1Config.plotType === "RHI" ? "active" : ""}`}
                onClick={() => setPlot1Config((prev) => ({ ...prev, plotType: "RHI" }))}
              >
                RHI (Vertical)
              </button>
            </div>
          </div>

          {/* Variable Selector */}
          <div className="control-input-group" style={{ marginBottom: "0" }}>
            <label>3. Polarimetric Variable</label>
            <select
              value={plot1Config.variable}
              onChange={(e) =>
                setPlot1Config((prev) => ({
                  ...prev,
                  variable: e.target.value,
                }))
              }
              className="cyber-select"
              disabled={availableVariables1.length === 0 || loadingVariables1}
            >
              <option value="">-- Choose variable --</option>
              {availableVariables1.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PLOT 2 CONFIGURATION */}
        <div className="plot-config-column">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          <div className="config-col-header">
            <span className="config-col-title">
              <FaCrosshairs style={{ color: "#ffc400" }} />
              PLOT 2 CONFIGURATION
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.68rem",
                color: "#ffc400",
              }}
            >
              CHANNEL B
            </span>
          </div>

          {/* File Selector */}
          <div className="control-input-group" style={{ marginBottom: "12px" }}>
            <label>
              1. Radar Volume Scan{" "}
              {comparisonMode === "same-file-different-vars" && "(Mirrored from Plot 1)"}
            </label>
            <select
              value={plot2Config.fileId}
              onChange={(e) =>
                setPlot2Config((prev) => ({
                  ...prev,
                  fileId: e.target.value,
                }))
              }
              className="cyber-select"
              disabled={comparisonMode === "same-file-different-vars"}
            >
              <option value="">-- Choose file for Plot 2 --</option>
              {radarFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name} ({formatFileSize(file.size)}) — {file.scanType}
                </option>
              ))}
            </select>
          </div>

          {/* Load Variables Action (Only for modes where file 2 is distinct) */}
          {plot2Config.fileId && comparisonMode !== "same-file-different-vars" && (
            <div style={{ marginBottom: "12px" }}>
              <AeroButton
                onClick={loadVariables2}
                loading={loadingVariables2}
                variant="outline"
                style={{ width: "100%", padding: "8px", fontSize: "0.75rem" }}
                icon={<FaSyncAlt />}
              >
                {loadingVariables2 ? "EXTRACTING..." : "LOAD PLOT 2 VARIABLES"}
              </AeroButton>
            </div>
          )}

          {/* Plot Type Toggle */}
          <div className="control-input-group" style={{ marginBottom: "12px" }}>
            <label>2. Scan Geometry</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
                padding: "3px",
                background: "rgba(10, 10, 10, 0.8)",
                border: "1px solid rgba(255, 214, 0, 0.15)",
                borderRadius: "6px",
              }}
            >
              <button
                type="button"
                className={`scan-pill-btn ${plot2Config.plotType === "PPI" ? "active" : ""}`}
                onClick={() => setPlot2Config((prev) => ({ ...prev, plotType: "PPI" }))}
              >
                PPI (Azimuth)
              </button>
              <button
                type="button"
                className={`scan-pill-btn ${plot2Config.plotType === "RHI" ? "active" : ""}`}
                onClick={() => setPlot2Config((prev) => ({ ...prev, plotType: "RHI" }))}
              >
                RHI (Vertical)
              </button>
            </div>
          </div>

          {/* Variable Selector */}
          <div className="control-input-group" style={{ marginBottom: "0" }}>
            <label>
              3. Polarimetric Variable{" "}
              {comparisonMode === "different-files-same-var" && "(Mirrored from Plot 1)"}
            </label>
            <select
              value={plot2Config.variable}
              onChange={(e) =>
                setPlot2Config((prev) => ({
                  ...prev,
                  variable: e.target.value,
                }))
              }
              className="cyber-select"
              disabled={
                comparisonMode === "different-files-same-var" ||
                (availableVariables2.length === 0 &&
                  comparisonMode !== "same-file-different-vars") ||
                loadingVariables2
              }
            >
              <option value="">-- Choose variable --</option>
              {availableVariables2.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action Center: Generate Comparison & Clear */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
        }}
      >
        <AeroButton
          onClick={generateComparison}
          disabled={!canGenerate || loadingComparison}
          loading={loadingComparison}
          style={{ padding: "14px 36px", fontSize: "0.92rem" }}
          icon={<FaBalanceScale />}
        >
          {loadingComparison
            ? "GENERATING DUAL COMPARISON VIA PY-ART..."
            : "GENERATE DUAL RADAR COMPARISON"}
        </AeroButton>

        {(generatedPlots.plot1.url || generatedPlots.plot2.url) && (
          <button
            onClick={clearPlots}
            className="aero-btn aero-btn-outline"
            style={{
              borderColor: "rgba(239, 68, 68, 0.35)",
              color: "#ef4444",
              padding: "12px 20px",
              fontSize: "0.82rem",
            }}
          >
            <FaTrashAlt style={{ marginRight: "6px" }} />
            CLEAR DUAL PLOTS
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "6px",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#ef4444",
            fontSize: "0.8rem",
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* COMPARISON RESULTS SECTION */}
      <div className="comparison-results-panel">
        <span className="hud-corner-bracket top-left" />
        <span className="hud-corner-bracket top-right" />
        <span className="hud-corner-bracket bottom-left" />
        <span className="hud-corner-bracket bottom-right" />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "12px",
            borderBottom: "1px solid rgba(255, 214, 0, 0.12)",
          }}
        >
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
              COMPARATIVE REFLECTIVITY VIEWPORTS
            </span>
          </div>

          <AeroBadge variant="yellow" pulse={false} style={{ fontSize: "0.68rem" }}>
            SIDE-BY-SIDE PY-ART ALIGNMENT
          </AeroBadge>
        </div>

        {/* Loading Spinner */}
        {loadingComparison ? (
          <div className="radar-plot-loader" style={{ padding: "60px 20px" }}>
            <div className="loader-radar-reticle" />
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.88rem",
                color: "var(--aero-yellow, #ffd600)",
                letterSpacing: "0.08em",
              }}
            >
              COMPUTING DUAL-POLARIMETRIC COMPARISON MATRICES...
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.72rem",
                color: "#64748b",
              }}
            >
              Rendering parallel volume sweeps: [{plot1Config.variable} {plot1Config.plotType}] vs [{plot2Config.variable} {plot2Config.plotType}]
            </span>
          </div>
        ) : generatedPlots.plot1.url || generatedPlots.plot2.url ? (
          <div className="dual-results-grid">
            {/* PLOT 1 VIEWPORT */}
            <div className="comparison-plot-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(255, 214, 0, 0.15)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: "var(--aero-yellow, #ffd600)",
                    }}
                  >
                    CHANNEL A // PLOT 1
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                      maxWidth: "260px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {getFileName(plot1Config.fileId)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <AeroBadge variant="yellow" pulse={false} style={{ fontSize: "0.65rem" }}>
                    {plot1Config.plotType} • {plot1Config.variable}
                  </AeroBadge>
                  {generatedPlots.plot1.url && (
                    <>
                      <button
                        onClick={() =>
                          setActiveModalPlot({
                            url: generatedPlots.plot1.url,
                            filename: getFileName(plot1Config.fileId),
                            plotType: plot1Config.plotType,
                            variable: plot1Config.variable,
                          })
                        }
                        className="aero-btn aero-btn-outline"
                        style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                        title="Expand Plot 1"
                      >
                        <FaExpand />
                      </button>
                      <button
                        onClick={() =>
                          handleDownload(generatedPlots.plot1.url, `PLOT1_${plot1Config.variable}`)
                        }
                        className="aero-btn aero-btn-outline"
                        style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                        title="Download Plot 1"
                      >
                        <FaDownload />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="comparison-img-frame">
                {generatedPlots.plot1.url ? (
                  <img
                    src={generatedPlots.plot1.url}
                    alt={`Plot 1 ${plot1Config.variable}`}
                    className="comparison-result-img"
                    onClick={() =>
                      setActiveModalPlot({
                        url: generatedPlots.plot1.url,
                        filename: getFileName(plot1Config.fileId),
                        plotType: plot1Config.plotType,
                        variable: plot1Config.variable,
                      })
                    }
                    title="Click to view full scale"
                  />
                ) : (
                  <div style={{ color: "#ef4444", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                    Failed to generate Plot 1
                  </div>
                )}
              </div>
            </div>

            {/* CENTER VS LASER DIVIDER */}
            <div className="compare-vs-divider">
              <span className="vs-laser-line" />
              <div className="vs-badge">VS</div>
            </div>

            {/* PLOT 2 VIEWPORT */}
            <div className="comparison-plot-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(255, 196, 0, 0.2)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: "#ffc400",
                    }}
                  >
                    CHANNEL B // PLOT 2
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                      maxWidth: "260px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {getFileName(plot2Config.fileId)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <AeroBadge variant="amber" pulse={false} style={{ fontSize: "0.65rem" }}>
                    {plot2Config.plotType} • {plot2Config.variable}
                  </AeroBadge>
                  {generatedPlots.plot2.url && (
                    <>
                      <button
                        onClick={() =>
                          setActiveModalPlot({
                            url: generatedPlots.plot2.url,
                            filename: getFileName(plot2Config.fileId),
                            plotType: plot2Config.plotType,
                            variable: plot2Config.variable,
                          })
                        }
                        className="aero-btn aero-btn-outline"
                        style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                        title="Expand Plot 2"
                      >
                        <FaExpand />
                      </button>
                      <button
                        onClick={() =>
                          handleDownload(generatedPlots.plot2.url, `PLOT2_${plot2Config.variable}`)
                        }
                        className="aero-btn aero-btn-outline"
                        style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                        title="Download Plot 2"
                      >
                        <FaDownload />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="comparison-img-frame">
                {generatedPlots.plot2.url ? (
                  <img
                    src={generatedPlots.plot2.url}
                    alt={`Plot 2 ${plot2Config.variable}`}
                    className="comparison-result-img"
                    onClick={() =>
                      setActiveModalPlot({
                        url: generatedPlots.plot2.url,
                        filename: getFileName(plot2Config.fileId),
                        plotType: plot2Config.plotType,
                        variable: plot2Config.variable,
                      })
                    }
                    title="Click to view full scale"
                  />
                ) : (
                  <div style={{ color: "#ef4444", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                    Failed to generate Plot 2
                  </div>
                )}
              </div>
            </div>
          </div>
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
              padding: "50px 20px",
            }}
          >
            <FaBalanceScale style={{ fontSize: "3.2rem", color: "rgba(255, 214, 0, 0.25)" }} />
            <div style={{ fontSize: "0.95rem", color: "var(--aero-text-secondary, #94a3b8)" }}>
              No dual comparison generated yet
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", maxWidth: "480px" }}>
              Select your comparison architecture above, configure both channels, and click "GENERATE DUAL RADAR COMPARISON" to execute parallel Py-ART sweeps.
            </div>
          </div>
        )}
      </div>

      {/* Full-Resolution Modal for either plot */}
      {activeModalPlot && (
        <RadarPlotModal
          isOpen={Boolean(activeModalPlot)}
          onClose={() => setActiveModalPlot(null)}
          imageUrl={activeModalPlot.url}
          date="COMPARISON"
          filename={activeModalPlot.filename}
          plotType={activeModalPlot.plotType}
          variable={activeModalPlot.variable}
        />
      )}
    </div>
  );
}
