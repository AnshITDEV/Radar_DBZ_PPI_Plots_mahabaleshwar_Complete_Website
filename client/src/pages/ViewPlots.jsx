import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ViewPlots.css";

export default function ViewPlots({ uploadedFiles, fileStore }) {
  const [selectedFile, setSelectedFile] = useState("");
  const [plotType, setPlotType] = useState("PPI");
  const [variable, setVariable] = useState("");
  const [availableVariables, setAvailableVariables] = useState([]);
  const [generatedPlotUrl, setGeneratedPlotUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // Get uploaded radar files from props
  const radarFiles = uploadedFiles?.radarFiles || [];

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

  // Reset when selected file changes
  useEffect(() => {
    if (selectedFile) {
      setAvailableVariables([]);
      setVariable("");
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

  // Load available variables from the selected file
  const loadFileVariables = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    const fileMetadata = radarFiles.find((f) => f.id === selectedFile);
    if (!fileMetadata) {
      setError("Selected file not found");
      return;
    }

    const file = fileStore.get(selectedFile);
    if (!file) {
      setError("File not found in memory. Please re-upload the file.");
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
        // Auto-select first variable
        if (response.data.variables.length > 0) {
          setVariable(response.data.variables[0]);
        }
      } else {
        setError("Could not read variables from file");
      }
    } catch (err) {
      console.error("Error loading variables:", err);
      setError(err.response?.data?.error || "Failed to load file variables");
    } finally {
      setLoadingVariables(false);
    }
  };

  // Generate plot
  const generatePlot = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    if (!variable) {
      setError("Please load variables first and select a variable");
      return;
    }

    const fileMetadata = radarFiles.find((f) => f.id === selectedFile);
    if (!fileMetadata) {
      setError("Selected file not found");
      return;
    }

    const file = fileStore.get(selectedFile);
    if (!file) {
      setError("File content not available. Please re-upload the file.");
      return;
    }

    setLoading(true);
    setError("");

    // Clean up previous plot URL
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

      // Create object URL for the generated image
      const imageUrl = URL.createObjectURL(response.data);
      setGeneratedPlotUrl(imageUrl);
    } catch (err) {
      console.error("Error generating plot:", err);
      setError(err.response?.data?.error || "Failed to generate plot");
    } finally {
      setLoading(false);
    }
  };

  // Clear current plot
  const clearPlot = () => {
    if (generatedPlotUrl) {
      URL.revokeObjectURL(generatedPlotUrl);
    }
    setGeneratedPlotUrl("");
    setError("");
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={`view-plots-container ${darkMode ? "dark-mode" : ""}`}>
      <div className="view-plots-header">
        <h2>View Plots</h2>
        <p>Generate PPI or RHI plots from your uploaded radar data</p>
      </div>

      <div className="view-plots-content">
        {/* Controls Section */}
        <div className="controls-section">
          <div className="control-card">
            <h3>Plot Configuration</h3>

            {/* File Selection */}
            <div className="control-group">
              <label>Select Radar File:</label>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="control-select"
              >
                <option value="">-- Select a file --</option>
                {radarFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name} ({formatFileSize(file.size)}) - {file.scanType}
                  </option>
                ))}
              </select>
              {radarFiles.length === 0 && (
                <p className="info-message">
                  No radar files uploaded. Please upload files in the Upload
                  Data section.
                </p>
              )}
            </div>

            {/* Load Variables Button */}
            {selectedFile && (
              <div className="control-group">
                <button
                  onClick={loadFileVariables}
                  disabled={loadingVariables}
                  className="load-variables-btn"
                >
                  {loadingVariables
                    ? "Loading Variables..."
                    : "Load Available Variables"}
                </button>
              </div>
            )}

            {/* Plot Type Selection */}
            <div className="control-group">
              <label>Plot Type:</label>
              <select
                value={plotType}
                onChange={(e) => setPlotType(e.target.value)}
                className="control-select"
              >
                <option value="PPI">PPI (Plan Position Indicator)</option>
                <option value="RHI">RHI (Range Height Indicator)</option>
              </select>
            </div>

            {/* Variable Selection */}
            <div className="control-group">
              <label>Variable:</label>
              <select
                value={variable}
                onChange={(e) => setVariable(e.target.value)}
                className="control-select"
                disabled={availableVariables.length === 0 || loadingVariables}
              >
                <option value="">-- Select variable --</option>
                {availableVariables.map((variable) => (
                  <option key={variable} value={variable}>
                    {variable}
                  </option>
                ))}
              </select>
              {selectedFile &&
                availableVariables.length === 0 &&
                !loadingVariables && (
                  <p className="info-message">
                    Click "Load Available Variables" to see variables from the
                    selected file
                  </p>
                )}
              {loadingVariables && (
                <p className="info-message">Loading variables from file...</p>
              )}
            </div>

            {/* Generate Button */}
            <div className="control-group">
              <button
                onClick={generatePlot}
                disabled={
                  !selectedFile || !variable || loading || loadingVariables
                }
                className="generate-btn"
              >
                {loading ? "Generating Plot..." : "Generate Plot"}
              </button>

              {generatedPlotUrl && (
                <button onClick={clearPlot} className="clear-btn">
                  Clear Plot
                </button>
              )}
            </div>

            {/* Error Display */}
            {error && <div className="error-message">❌ {error}</div>}
          </div>
        </div>

        {/* Plot Display Section */}
        <div className="plot-section">
          <div className="plot-card">
            <h3>Generated Plot</h3>

            {loading ? (
              <div className="plot-loading">
                <div className="spinner"></div>
                <p>Generating plot... This may take a few seconds.</p>
                <p className="loading-note">
                  Processing{" "}
                  {selectedFile
                    ? radarFiles.find((f) => f.id === selectedFile)?.name
                    : "file"}
                  ...
                </p>
              </div>
            ) : generatedPlotUrl ? (
              <div className="plot-result">
                <div className="plot-image-container">
                  <img
                    src={generatedPlotUrl}
                    alt={`${variable} ${plotType} Plot`}
                    className="generated-plot"
                  />
                </div>
                <div className="plot-info">
                  <h4>Plot Information</h4>
                  <p>
                    <strong>File:</strong>{" "}
                    {radarFiles.find((f) => f.id === selectedFile)?.name}
                  </p>
                  <p>
                    <strong>Plot Type:</strong> {plotType}
                  </p>
                  <p>
                    <strong>Variable:</strong> {variable}
                  </p>
                  <p>
                    <strong>Generated:</strong> {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="plot-placeholder">
                <div className="placeholder-icon">📊</div>
                <h4>No Plot Generated</h4>
                <p>
                  Configure your plot settings and click "Generate Plot" to
                  create a visualization.
                </p>
                <div className="placeholder-tips">
                  <h5>Steps:</h5>
                  <ol>
                    <li>Select a radar file from your uploaded data</li>
                    <li>
                      Click "Load Available Variables" to see what variables are
                      available
                    </li>
                    <li>Choose between PPI and RHI plot types</li>
                    <li>Select the variable you want to visualize</li>
                    <li>Click "Generate Plot" to create the visualization</li>
                  </ol>
                  <p className="loading-note">
                    Large files may take longer to process.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
