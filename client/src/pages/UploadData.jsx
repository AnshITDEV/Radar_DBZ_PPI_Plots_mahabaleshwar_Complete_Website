import React, { useState } from "react";
import "./UploadData.css";
import AeroButton from "../components/ui/AeroButton";
import AeroBadge from "../components/ui/AeroBadge";
import {
  FaSatelliteDish,
  FaCloudRain,
  FaTrashAlt,
  FaFileAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaDatabase,
  FaNetworkWired,
  FaInfoCircle,
} from "react-icons/fa";

export default function UploadData({
  uploadedFiles,
  setUploadedFiles,
  fileStore,
}) {
  const [uploadStatus, setUploadStatus] = useState({
    radar: "",
    rainGauge: "",
  });
  const [isDraggingRadar, setIsDraggingRadar] = useState(false);
  const [isDraggingGauge, setIsDraggingGauge] = useState(false);

  const { radarFiles, rainGaugeFiles, scanType } = uploadedFiles;

  // Convert File object to storable metadata
  const fileToMetadata = (file) => {
    return {
      id: `${file.name}-${file.lastModified}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      uploadDate: new Date().toISOString(),
      scanType: scanType,
    };
  };

  // Process and ingest radar files (.nc)
  const processRadarFiles = (fileList) => {
    const files = Array.from(fileList);
    const validFiles = files.filter(
      (file) =>
        file.name.endsWith(".nc") ||
        file.type === "application/x-netcdf" ||
        file.type === "application/octet-stream"
    );

    if (validFiles.length === 0) {
      setUploadStatus((prev) => ({ ...prev, radar: "error" }));
      return;
    }

    const newRadarFiles = validFiles.map((file) => {
      const metadata = fileToMetadata(file);
      fileStore.set(metadata.id, file);
      return metadata;
    });

    setUploadedFiles((prev) => ({
      ...prev,
      radarFiles: [...prev.radarFiles, ...newRadarFiles],
    }));

    setUploadStatus((prev) => ({ ...prev, radar: "success" }));
  };

  // Process and ingest rain gauge files (.csv, .xlsx)
  const processRainGaugeFiles = (fileList) => {
    const files = Array.from(fileList);
    const validFiles = files.filter(
      (file) =>
        file.name.endsWith(".csv") ||
        file.name.endsWith(".xlsx") ||
        file.type === "text/csv" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    if (validFiles.length === 0) {
      setUploadStatus((prev) => ({ ...prev, rainGauge: "error" }));
      return;
    }

    const newRainGaugeFiles = validFiles.map((file) => {
      const metadata = fileToMetadata(file);
      fileStore.set(metadata.id, file);
      return metadata;
    });

    setUploadedFiles((prev) => ({
      ...prev,
      rainGaugeFiles: [...prev.rainGaugeFiles, ...newRainGaugeFiles],
    }));

    setUploadStatus((prev) => ({ ...prev, rainGauge: "success" }));
  };

  const handleRadarUpload = (e) => {
    processRadarFiles(e.target.files);
    e.target.value = "";
  };

  const handleRainGaugeUpload = (e) => {
    processRainGaugeFiles(e.target.files);
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleRadarDrop = (e) => {
    e.preventDefault();
    setIsDraggingRadar(false);
    if (e.dataTransfer.files) {
      processRadarFiles(e.dataTransfer.files);
    }
  };

  const handleGaugeDrop = (e) => {
    e.preventDefault();
    setIsDraggingGauge(false);
    if (e.dataTransfer.files) {
      processRainGaugeFiles(e.dataTransfer.files);
    }
  };

  // Remove individual radar file
  const removeRadarFile = (index) => {
    const fileToRemove = radarFiles[index];
    fileStore.delete(fileToRemove.id);

    setUploadedFiles((prev) => ({
      ...prev,
      radarFiles: prev.radarFiles.filter((_, i) => i !== index),
    }));

    if (radarFiles.length === 1) {
      setUploadStatus((prev) => ({ ...prev, radar: "" }));
    }
  };

  // Remove individual rain gauge file
  const removeRainGaugeFile = (index) => {
    const fileToRemove = rainGaugeFiles[index];
    fileStore.delete(fileToRemove.id);

    setUploadedFiles((prev) => ({
      ...prev,
      rainGaugeFiles: prev.rainGaugeFiles.filter((_, i) => i !== index),
    }));

    if (rainGaugeFiles.length === 1) {
      setUploadStatus((prev) => ({ ...prev, rainGauge: "" }));
    }
  };

  // Update scan type
  const handleScanTypeChange = (newScanType) => {
    setUploadedFiles((prev) => ({
      ...prev,
      scanType: newScanType,
    }));
  };

  // Clear all files
  const clearAllFiles = () => {
    radarFiles.forEach((file) => fileStore.delete(file.id));
    rainGaugeFiles.forEach((file) => fileStore.delete(file.id));

    setUploadedFiles((prev) => ({
      ...prev,
      radarFiles: [],
      rainGaugeFiles: [],
    }));

    setUploadStatus({ radar: "", rainGauge: "" });
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUploadDate = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const totalFiles = radarFiles.length + rainGaugeFiles.length;

  return (
    <div className="aero-upload-console">
      {/* Top Console Ribbon */}
      <div className="upload-console-header">
        <div className="upload-header-titles">
          <h2>
            <FaDatabase style={{ color: "var(--aero-cyan, #00f0ff)" }} />
            DATA INGESTION TERMINAL
          </h2>
          <p>
            Ingest raw dual-polarimetric NetCDF radar volumes and rain gauge
            time-series for atmospheric analysis and ground validation.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <AeroBadge variant="cyan" pulse={false}>
            {totalFiles} DATASETS ACTIVE
          </AeroBadge>

          {totalFiles > 0 && (
            <button
              onClick={clearAllFiles}
              className="aero-btn aero-btn-outline"
              style={{
                borderColor: "rgba(239, 68, 68, 0.4)",
                color: "#ef4444",
                padding: "8px 14px",
                fontSize: "0.75rem",
              }}
              title="Clear all in-memory datasets"
            >
              <FaTrashAlt style={{ marginRight: "6px" }} />
              CLEAR ALL
            </button>
          )}
        </div>
      </div>

      {/* Dual Upload Grid */}
      <div className="upload-dual-grid">
        {/* PANEL 1: Radar NetCDF Data Ingestion */}
        <div className="ingestion-panel radar-panel">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          <div className="panel-header-line">
            <div className="panel-header-title">
              <FaSatelliteDish style={{ color: "var(--aero-cyan, #00f0ff)" }} />
              <span>RADAR VOLUME SCANS (.NC)</span>
            </div>
            <AeroBadge variant="cyan" pulse={false} style={{ fontSize: "0.68rem" }}>
              {radarFiles.length} Ingested
            </AeroBadge>
          </div>

          {/* Scan Geometry Selector */}
          <div className="scan-type-row">
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.74rem",
                color: "var(--aero-text-secondary, #94a3b8)",
              }}
            >
              Scan Mode Association:
            </span>
            <div className="scan-pills">
              <button
                type="button"
                className={`scan-pill-btn ${scanType === "RHI" ? "active" : ""}`}
                onClick={() => handleScanTypeChange("RHI")}
              >
                RHI (Vertical)
              </button>
              <button
                type="button"
                className={`scan-pill-btn ${scanType === "SUR" ? "active" : ""}`}
                onClick={() => handleScanTypeChange("SUR")}
              >
                SUR (Surveillance)
              </button>
            </div>
          </div>

          {/* Radar Drop Zone */}
          <div
            className={`aero-dropzone ${isDraggingRadar ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingRadar(true);
            }}
            onDragLeave={() => setIsDraggingRadar(false)}
            onDrop={handleRadarDrop}
            onClick={() => document.getElementById("radar-file-input").click()}
          >
            <input
              type="file"
              id="radar-file-input"
              multiple
              accept=".nc,application/x-netcdf,application/octet-stream"
              onChange={handleRadarUpload}
              style={{ display: "none" }}
            />
            <FaSatelliteDish className="dropzone-icon" />
            <div className="dropzone-title">DRAG & DROP NETCDF (.NC) FILES</div>
            <div className="dropzone-sub">
              or click to browse local radar volume scans
            </div>
            <div className="dropzone-badge">
              ASSOCIATED SCAN: {scanType} • MULTI-FILE SUPPORTED
            </div>
          </div>

          {/* Upload Status Alert */}
          {uploadStatus.radar === "error" && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#ef4444",
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaExclamationTriangle />
              <span>Invalid file format. Please select .nc NetCDF files only.</span>
            </div>
          )}

          {/* Ingested Radar Files Collection */}
          {radarFiles.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.72rem",
                  color: "#64748b",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                Ingested NetCDF Binaries:
              </div>
              <div className="ingested-files-container">
                {radarFiles.map((file, idx) => {
                  const inMemory = fileStore.has(file.id);
                  return (
                    <div key={file.id} className="ingested-file-card">
                      <div className="file-card-details">
                        <div className="file-card-name">{file.name}</div>
                        <div className="file-card-meta">
                          <span style={{ color: "var(--aero-cyan, #00f0ff)" }}>
                            {formatFileSize(file.size)}
                          </span>
                          <span>•</span>
                          <span>SCAN: {file.scanType}</span>
                          <span>•</span>
                          <span>{formatUploadDate(file.uploadDate)}</span>
                          {!inMemory && (
                            <span
                              style={{
                                color: "#f59e0b",
                                fontWeight: 600,
                              }}
                              title="Binary missing from browser memory (page was refreshed). Re-upload to generate plots."
                            >
                              [RE-UPLOAD REQ]
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeRadarFile(idx)}
                        className="file-card-delete-btn"
                        title="Remove dataset"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* PANEL 2: Rain Gauge Data Ingestion */}
        <div className="ingestion-panel gauge-panel">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          <div className="panel-header-line">
            <div className="panel-header-title">
              <FaCloudRain style={{ color: "var(--aero-violet, #8b5cf6)" }} />
              <span>RAIN GAUGE TELEMETRY (.CSV, .XLSX)</span>
            </div>
            <AeroBadge variant="violet" pulse={false} style={{ fontSize: "0.68rem" }}>
              {rainGaugeFiles.length} Ingested
            </AeroBadge>
          </div>

          {/* Rain Gauge Format Notice */}
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(6, 12, 26, 0.75)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              borderRadius: "6px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.74rem",
              color: "var(--aero-text-secondary, #94a3b8)",
            }}
          >
            Ground Truth Sensor: Auto Weather Station (AWS) Time-Series
          </div>

          {/* Rain Gauge Drop Zone */}
          <div
            className={`aero-dropzone gauge-dropzone ${
              isDraggingGauge ? "dragging" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingGauge(true);
            }}
            onDragLeave={() => setIsDraggingGauge(false)}
            onDrop={handleGaugeDrop}
            onClick={() => document.getElementById("gauge-file-input").click()}
          >
            <input
              type="file"
              id="gauge-file-input"
              multiple
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleRainGaugeUpload}
              style={{ display: "none" }}
            />
            <FaCloudRain className="dropzone-icon" />
            <div className="dropzone-title">DRAG & DROP GAUGE DATA</div>
            <div className="dropzone-sub">
              supports CSV (.csv) and Excel spreadsheets (.xlsx)
            </div>
            <div
              className="dropzone-badge"
              style={{
                color: "var(--aero-violet, #8b5cf6)",
                borderColor: "rgba(139, 92, 246, 0.3)",
                background: "rgba(139, 92, 246, 0.1)",
              }}
            >
              MULTI-SENSOR LOGGERS ACCEPTED
            </div>
          </div>

          {/* Rain Gauge Error Alert */}
          {uploadStatus.rainGauge === "error" && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#ef4444",
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaExclamationTriangle />
              <span>Invalid file format. Please upload .csv or .xlsx spreadsheets.</span>
            </div>
          )}

          {/* Ingested Rain Gauge Files Collection */}
          {rainGaugeFiles.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.72rem",
                  color: "#64748b",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                Ingested Rain Gauge Datasets:
              </div>
              <div className="ingested-files-container">
                {rainGaugeFiles.map((file, idx) => (
                  <div key={file.id} className="ingested-file-card">
                    <div className="file-card-details">
                      <div className="file-card-name">{file.name}</div>
                      <div className="file-card-meta">
                        <span style={{ color: "var(--aero-violet, #a78bfa)" }}>
                          {formatFileSize(file.size)}
                        </span>
                        <span>•</span>
                        <span>{formatUploadDate(file.uploadDate)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeRainGaugeFile(idx)}
                      className="file-card-delete-btn"
                      title="Remove dataset"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ingestion Pipeline Visualization & Summary */}
      {totalFiles > 0 && (
        <div className="ingestion-pipeline-summary">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(0, 240, 255, 0.12)",
              paddingBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FaNetworkWired style={{ color: "var(--aero-cyan, #00f0ff)" }} />
              <span
                className="display-font"
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#ffffff",
                }}
              >
                DATA PIPELINE STATUS: READY FOR ANALYSIS
              </span>
            </div>
            <AeroBadge variant="online">PIPELINE VERIFIED</AeroBadge>
          </div>

          <div className="pipeline-stats-row">
            <div className="pipeline-stat-box">
              <span className="pipeline-stat-label">RADAR VOLUMES</span>
              <span className="pipeline-stat-num">{radarFiles.length}</span>
              <span className="pipeline-stat-sub">NetCDF-4 datasets</span>
            </div>

            <div className="pipeline-stat-box">
              <span className="pipeline-stat-label">RAIN GAUGES</span>
              <span className="pipeline-stat-num" style={{ color: "var(--aero-violet, #8b5cf6)" }}>
                {rainGaugeFiles.length}
              </span>
              <span className="pipeline-stat-sub">Ground truth time-series</span>
            </div>

            <div className="pipeline-stat-box">
              <span className="pipeline-stat-label">ACTIVE SCAN MODE</span>
              <span className="pipeline-stat-num" style={{ fontSize: "1.3rem", color: "#ffffff" }}>
                {scanType}
              </span>
              <span className="pipeline-stat-sub">Range Height Indicator</span>
            </div>

            <div className="pipeline-stat-box">
              <span className="pipeline-stat-label">MEMORY PIPELINE</span>
              <span className="pipeline-stat-num" style={{ color: "#00ff9d" }}>
                ACTIVE
              </span>
              <span className="pipeline-stat-sub">Ready for Py-ART Plotting</span>
            </div>
          </div>

          {/* In-Memory Caching Information Note */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "10px 14px",
              background: "rgba(6, 12, 26, 0.6)",
              border: "1px solid rgba(0, 240, 255, 0.1)",
              borderRadius: "6px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.74rem",
              color: "var(--aero-text-secondary, #94a3b8)",
              lineHeight: 1.5,
            }}
          >
            <FaInfoCircle style={{ color: "var(--aero-cyan, #00f0ff)", marginTop: "2px", flexShrink: 0 }} />
            <span>
              Datasets are cached in browser memory and metadata is synchronized across all modules.
              You can now proceed to <strong>View Plots</strong> to generate reflectivity plots,
              <strong> Compare Plots</strong> for multi-channel analysis, or <strong>Rainfall Estimation</strong> to execute AI models.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
