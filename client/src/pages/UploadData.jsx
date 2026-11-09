import React, { useState, useEffect } from "react";
import "./UploadData.css";

export default function UploadData({
  uploadedFiles,
  setUploadedFiles,
  fileStore,
}) {
  const [uploadStatus, setUploadStatus] = useState({
    radar: "",
    rainGauge: "",
  });
  const [darkMode, setDarkMode] = useState(false);

  const { radarFiles, rainGaugeFiles, scanType } = uploadedFiles;

  // Check for dark mode on component mount and listen for changes
  useEffect(() => {
    const checkDarkMode = () => {
      const savedTheme = localStorage.getItem("theme");
      setDarkMode(savedTheme === "dark");
    };

    checkDarkMode();

    const handleStorageChange = () => {
      checkDarkMode();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", checkDarkMode);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", checkDarkMode);
    };
  }, []);

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

  // Handle radar file upload
  const handleRadarUpload = (e) => {
    const files = Array.from(e.target.files);
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

    // Store files in memory and create metadata
    const newRadarFiles = validFiles.map((file) => {
      const metadata = fileToMetadata(file);
      // Store the actual file in memory at App level
      fileStore.set(metadata.id, file);
      return metadata;
    });

    setUploadedFiles((prev) => ({
      ...prev,
      radarFiles: [...prev.radarFiles, ...newRadarFiles],
    }));

    setUploadStatus((prev) => ({ ...prev, radar: "success" }));
    e.target.value = "";
  };

  // Handle rain gauge file upload
  const handleRainGaugeUpload = (e) => {
    const files = Array.from(e.target.files);
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
    e.target.value = "";
  };

  // Remove radar file
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

  // Remove rain gauge file
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
    // Clear memory store
    radarFiles.forEach((file) => fileStore.delete(file.id));
    rainGaugeFiles.forEach((file) => fileStore.delete(file.id));

    setUploadedFiles((prev) => ({
      ...prev,
      radarFiles: [],
      rainGaugeFiles: [],
    }));

    setUploadStatus({ radar: "", rainGauge: "" });
  };

  const getFileIcon = (fileName) => {
    if (fileName.endsWith(".nc")) return "📊";
    if (fileName.endsWith(".csv")) return "📈";
    if (fileName.endsWith(".xlsx")) return "📋";
    return "📄";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUploadDate = (dateString) => {
    return (
      new Date(dateString).toLocaleDateString() +
      " " +
      new Date(dateString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  return (
    <div className={`upload-container ${darkMode ? "dark-mode" : ""}`}>
      <div className="upload-header">
        <h2>Upload Data</h2>
        <p>
          Upload your radar and rain gauge data to get started with analysis
        </p>

        {(radarFiles.length > 0 || rainGaugeFiles.length > 0) && (
          <button onClick={clearAllFiles} className="clear-all-btn">
            🗑️ Clear All Files
          </button>
        )}
      </div>

      <div className="upload-sections">
        {/* Radar Data Upload Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>📡 Radar Data (.nc files)</h3>
            <span className="file-count">{radarFiles.length} files</span>
          </div>

          {/* Scan Type Selection */}
          <div className="scan-type-selector">
            <label htmlFor="scan-type">Type of Scan:</label>
            <select
              id="scan-type"
              value={scanType}
              onChange={(e) => handleScanTypeChange(e.target.value)}
              className="scan-type-select"
            >
              <option value="RHI">RHI (Range Height Indicator)</option>
              <option value="SUR">SUR (Surveillance)</option>
            </select>
          </div>

          <div className="upload-area">
            <input
              type="file"
              id="radar-upload"
              multiple
              accept=".nc,application/x-netcdf"
              onChange={handleRadarUpload}
              className="file-input"
            />
            <label htmlFor="radar-upload" className="upload-label">
              <div className="upload-icon">📁</div>
              <div className="upload-text">
                <strong>Click to upload radar files</strong>
                <span>NetCDF (.nc) format only</span>
                <small>Current scan type: {scanType}</small>
              </div>
            </label>
          </div>

          {uploadStatus.radar === "error" && (
            <div className="error-message">
              ❌ Please select valid .nc files only
            </div>
          )}

          {radarFiles.length > 0 && (
            <div className="files-list">
              <h4>Uploaded Radar Files:</h4>
              {radarFiles.map((file, index) => (
                <div key={file.id} className="file-item">
                  <span className="file-icon">{getFileIcon(file.name)}</span>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-details">
                      <span className="file-size">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="file-scan-type">
                        Scan: {file.scanType}
                      </span>
                      <span className="file-date">
                        Uploaded: {formatUploadDate(file.uploadDate)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRadarFile(index)}
                    className="remove-btn"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rain Gauge Data Upload Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>🌧️ Rain Gauge Data (.csv, .xlsx)</h3>
            <span className="file-count">{rainGaugeFiles.length} files</span>
          </div>

          <div className="upload-area">
            <input
              type="file"
              id="rain-gauge-upload"
              multiple
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleRainGaugeUpload}
              className="file-input"
            />
            <label htmlFor="rain-gauge-upload" className="upload-label">
              <div className="upload-icon">📁</div>
              <div className="upload-text">
                <strong>Click to upload rain gauge files</strong>
                <span>CSV or Excel (.xlsx) format</span>
              </div>
            </label>
          </div>

          {uploadStatus.rainGauge === "error" && (
            <div className="error-message">
              ❌ Please select valid .csv or .xlsx files only
            </div>
          )}

          {rainGaugeFiles.length > 0 && (
            <div className="files-list">
              <h4>Uploaded Rain Gauge Files:</h4>
              {rainGaugeFiles.map((file, index) => (
                <div key={file.id} className="file-item">
                  <span className="file-icon">{getFileIcon(file.name)}</span>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-details">
                      <span className="file-size">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="file-date">
                        Uploaded: {formatUploadDate(file.uploadDate)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRainGaugeFile(index)}
                    className="remove-btn"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Summary */}
      {(radarFiles.length > 0 || rainGaugeFiles.length > 0) && (
        <div className="upload-summary">
          <h3>Ready for Analysis</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-number">{radarFiles.length}</span>
              <span className="stat-label">Radar Files</span>
            </div>
            <div className="stat">
              <span className="stat-number">{rainGaugeFiles.length}</span>
              <span className="stat-label">Rain Gauge Files</span>
            </div>
            <div className="stat">
              <span className="stat-number">{scanType}</span>
              <span className="stat-label">Scan Type</span>
            </div>
          </div>
          <p className="summary-note">
            Your files are now persisted across component navigation! You can
            now navigate to other tabs to view plots, compare data, or validate
            your uploads.
          </p>
        </div>
      )}
    </div>
  );
}
