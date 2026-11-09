import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ComparePlots.css";

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

  // Reset when comparison mode changes
  useEffect(() => {
    setPlot1Config({ fileId: "", variable: "", plotType: "PPI" });
    setPlot2Config({ fileId: "", variable: "", plotType: "PPI" });
    setAvailableVariables1([]);
    setAvailableVariables2([]);
    clearPlots();
    setError("");
  }, [comparisonMode]);

  // Sync file for Plot 2 when in same-file mode and Plot 1 file changes
  useEffect(() => {
    if (comparisonMode === "same-file-different-vars" && plot1Config.fileId) {
      setPlot2Config((prev) => ({ ...prev, fileId: plot1Config.fileId }));

      // If we already have variables for Plot 1, copy them to Plot 2
      if (availableVariables1.length > 0) {
        setAvailableVariables2(availableVariables1);
      }
    }
  }, [plot1Config.fileId, comparisonMode, availableVariables1]);

  // Sync variable for Plot 2 when in same-variable mode and Plot 1 variable changes
  useEffect(() => {
    if (comparisonMode === "different-files-same-var" && plot1Config.variable) {
      setPlot2Config((prev) => ({ ...prev, variable: plot1Config.variable }));
    }
  }, [plot1Config.variable, comparisonMode]);

  // Load variables for plot 1
  const loadVariables1 = async () => {
    if (!plot1Config.fileId) {
      setError("Please select a file for Plot 1 first");
      return;
    }

    const fileMetadata = radarFiles.find((f) => f.id === plot1Config.fileId);
    if (!fileMetadata) {
      setError("Selected file for Plot 1 not found");
      return;
    }

    const file = fileStore.get(plot1Config.fileId);
    if (!file) {
      setError(
        "File content not available for Plot 1. Please re-upload the file."
      );
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
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.variables) {
        const variables = response.data.variables;
        setAvailableVariables1(variables);

        // Auto-select first variable if none selected
        if (!plot1Config.variable && variables.length > 0) {
          setPlot1Config((prev) => ({ ...prev, variable: variables[0] }));
        }

        // If in same-file mode, also set available variables for Plot 2
        if (comparisonMode === "same-file-different-vars") {
          setAvailableVariables2(variables);
          // Auto-select second variable for Plot 2 if available and none selected
          if (!plot2Config.variable && variables.length > 1) {
            setPlot2Config((prev) => ({ ...prev, variable: variables[1] }));
          } else if (!plot2Config.variable && variables.length === 1) {
            // If only one variable, use the same but warn user
            setPlot2Config((prev) => ({ ...prev, variable: variables[0] }));
            setError(
              "Note: Only one variable available in this file. Consider using different files for comparison."
            );
          }
        }
      } else {
        setError("Could not read variables from Plot 1 file");
      }
    } catch (err) {
      console.error("Error loading variables for Plot 1:", err);
      setError(
        err.response?.data?.error || "Failed to load variables for Plot 1"
      );
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

    const fileMetadata = radarFiles.find((f) => f.id === plot2Config.fileId);
    if (!fileMetadata) {
      setError("Selected file for Plot 2 not found");
      return;
    }

    const file = fileStore.get(plot2Config.fileId);
    if (!file) {
      setError(
        "File content not available for Plot 2. Please re-upload the file."
      );
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
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.variables) {
        setAvailableVariables2(response.data.variables);
        // Auto-select first variable if none selected
        if (!plot2Config.variable && response.data.variables.length > 0) {
          setPlot2Config((prev) => ({
            ...prev,
            variable: response.data.variables[0],
          }));
        }
      } else {
        setError("Could not read variables from Plot 2 file");
      }
    } catch (err) {
      console.error("Error loading variables for Plot 2:", err);
      setError(
        err.response?.data?.error || "Failed to load variables for Plot 2"
      );
    } finally {
      setLoadingVariables2(false);
    }
  };

  // Generate individual plot
  const generatePlot = async (plotNumber) => {
    const config = plotNumber === 1 ? plot1Config : plot2Config;
    const fileId = config.fileId;

    if (!fileId) {
      setError(`Please select a file for Plot ${plotNumber} first`);
      return null;
    }

    if (!config.variable) {
      setError(`Please select a variable for Plot ${plotNumber}`);
      return null;
    }

    const fileMetadata = radarFiles.find((f) => f.id === fileId);
    if (!fileMetadata) {
      setError(`Selected file for Plot ${plotNumber} not found`);
      return null;
    }

    const file = fileStore.get(fileId);
    if (!file) {
      setError(
        `File content not available for Plot ${plotNumber}. Please re-upload the file.`
      );
      return null;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("plotType", config.plotType);
      formData.append("variable", config.variable);

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

      return URL.createObjectURL(response.data);
    } catch (err) {
      console.error(`Error generating Plot ${plotNumber}:`, err);
      throw new Error(
        err.response?.data?.error || `Failed to generate Plot ${plotNumber}`
      );
    }
  };

  // Generate comparison
  const generateComparison = async () => {
    setError("");
    setLoadingComparison(true);

    // Clear previous plots
    clearPlots();

    try {
      // Generate both plots in parallel
      const [plot1Url, plot2Url] = await Promise.all([
        generatePlot(1),
        generatePlot(2),
      ]);

      setGeneratedPlots({
        plot1: { url: plot1Url, loading: false },
        plot2: { url: plot2Url, loading: false },
      });
    } catch (err) {
      setError(err.message);
      // Clear any partially generated plots
      clearPlots();
    } finally {
      setLoadingComparison(false);
    }
  };

  // Clear all plots
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

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      clearPlots();
    };
  }, []);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file name by ID
  const getFileName = (fileId) => {
    const file = radarFiles.find((f) => f.id === fileId);
    return file ? file.name : "Unknown file";
  };

  const canGenerateComparison =
    plot1Config.fileId &&
    plot1Config.variable &&
    plot2Config.fileId &&
    plot2Config.variable &&
    !loadingVariables1 &&
    !loadingVariables2;

  return (
    <div className={`compare-plots-container ${darkMode ? "dark-mode" : ""}`}>
      <div className="compare-plots-header">
        <h2>Compare Plots</h2>
        <p>Compare radar data plots side-by-side for analysis</p>
      </div>

      <div className="compare-plots-content">
        {/* Configuration Section */}
        <div className="configuration-section">
          <div className="configuration-card">
            <h3>Comparison Configuration</h3>

            {/* Comparison Mode */}
            <div className="control-group">
              <label>Comparison Mode:</label>
              <select
                value={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.value)}
                className="control-select"
              >
                <option value="same-file-different-vars">
                  Same File, Different Variables
                </option>
                <option value="different-files-same-var">
                  Different Files, Same Variable
                </option>
                <option value="different-files-different-vars">
                  Different Files, Different Variables
                </option>
              </select>
              <div className="mode-description">
                {comparisonMode === "same-file-different-vars" &&
                  "Compare different variables from the same radar file"}
                {comparisonMode === "different-files-same-var" &&
                  "Compare the same variable from different radar files"}
                {comparisonMode === "different-files-different-vars" &&
                  "Compare different variables from different radar files"}
              </div>
            </div>

            <div className="plots-configuration">
              {/* Plot 1 Configuration */}
              <div className="plot-config">
                <h4>Plot 1 Configuration</h4>

                <div className="control-group">
                  <label>File:</label>
                  <select
                    value={plot1Config.fileId}
                    onChange={(e) =>
                      setPlot1Config((prev) => ({
                        ...prev,
                        fileId: e.target.value,
                      }))
                    }
                    className="control-select"
                  >
                    <option value="">-- Select file --</option>
                    {radarFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({formatFileSize(file.size)}) -{" "}
                        {file.scanType}
                      </option>
                    ))}
                  </select>
                </div>

                {plot1Config.fileId && (
                  <div className="control-group">
                    <button
                      onClick={loadVariables1}
                      disabled={loadingVariables1}
                      className="load-variables-btn"
                    >
                      {loadingVariables1
                        ? "Loading Variables..."
                        : "Load Variables"}
                    </button>
                  </div>
                )}

                <div className="control-group">
                  <label>Plot Type:</label>
                  <select
                    value={plot1Config.plotType}
                    onChange={(e) =>
                      setPlot1Config((prev) => ({
                        ...prev,
                        plotType: e.target.value,
                      }))
                    }
                    className="control-select"
                  >
                    <option value="PPI">PPI</option>
                    <option value="RHI">RHI</option>
                  </select>
                </div>

                <div className="control-group">
                  <label>Variable:</label>
                  <select
                    value={plot1Config.variable}
                    onChange={(e) =>
                      setPlot1Config((prev) => ({
                        ...prev,
                        variable: e.target.value,
                      }))
                    }
                    className="control-select"
                    disabled={
                      availableVariables1.length === 0 || loadingVariables1
                    }
                  >
                    <option value="">-- Select variable --</option>
                    {availableVariables1.map((variable) => (
                      <option key={variable} value={variable}>
                        {variable}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Plot 2 Configuration */}
              <div className="plot-config">
                <h4>Plot 2 Configuration</h4>

                <div className="control-group">
                  <label>File:</label>
                  <select
                    value={plot2Config.fileId}
                    onChange={(e) =>
                      setPlot2Config((prev) => ({
                        ...prev,
                        fileId: e.target.value,
                      }))
                    }
                    className="control-select"
                    disabled={comparisonMode === "same-file-different-vars"}
                  >
                    <option value="">-- Select file --</option>
                    {radarFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({formatFileSize(file.size)}) -{" "}
                        {file.scanType}
                      </option>
                    ))}
                  </select>
                </div>

                {plot2Config.fileId &&
                  comparisonMode !== "same-file-different-vars" && (
                    <div className="control-group">
                      <button
                        onClick={loadVariables2}
                        disabled={loadingVariables2}
                        className="load-variables-btn"
                      >
                        {loadingVariables2
                          ? "Loading Variables..."
                          : "Load Variables"}
                      </button>
                    </div>
                  )}

                <div className="control-group">
                  <label>Plot Type:</label>
                  <select
                    value={plot2Config.plotType}
                    onChange={(e) =>
                      setPlot2Config((prev) => ({
                        ...prev,
                        plotType: e.target.value,
                      }))
                    }
                    className="control-select"
                  >
                    <option value="PPI">PPI</option>
                    <option value="RHI">RHI</option>
                  </select>
                </div>

                <div className="control-group">
                  <label>Variable:</label>
                  <select
                    value={plot2Config.variable}
                    onChange={(e) =>
                      setPlot2Config((prev) => ({
                        ...prev,
                        variable: e.target.value,
                      }))
                    }
                    className="control-select"
                    disabled={
                      comparisonMode === "different-files-same-var" ||
                      (availableVariables2.length === 0 &&
                        comparisonMode !== "same-file-different-vars") ||
                      loadingVariables2
                    }
                  >
                    <option value="">-- Select variable --</option>
                    {availableVariables2.map((variable) => (
                      <option key={variable} value={variable}>
                        {variable}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                onClick={generateComparison}
                disabled={!canGenerateComparison || loadingComparison}
                className="generate-comparison-btn"
              >
                {loadingComparison
                  ? "Generating Comparison..."
                  : "Generate Comparison"}
              </button>

              {(generatedPlots.plot1.url || generatedPlots.plot2.url) && (
                <button onClick={clearPlots} className="clear-btn">
                  Clear Plots
                </button>
              )}
            </div>

            {/* Error Display */}
            {error && <div className="error-message">❌ {error}</div>}
          </div>
        </div>

        {/* Comparison Display Section */}
        <div className="comparison-section">
          <div className="comparison-card">
            <h3>Comparison Results</h3>

            {loadingComparison ? (
              <div className="comparison-loading">
                <div className="spinner"></div>
                <p>Generating comparison... This may take a few seconds.</p>
              </div>
            ) : generatedPlots.plot1.url || generatedPlots.plot2.url ? (
              <div className="plots-comparison">
                {/* Plot 1 */}
                <div className="plot-container">
                  <h4>Plot 1</h4>
                  <div className="plot-image-container">
                    {generatedPlots.plot1.url ? (
                      <img
                        src={generatedPlots.plot1.url}
                        alt={`${plot1Config.variable} ${plot1Config.plotType} Plot`}
                        className="comparison-plot"
                      />
                    ) : (
                      <div className="plot-error">Failed to generate</div>
                    )}
                  </div>
                  <div className="plot-info">
                    <p>
                      <strong>File:</strong> {getFileName(plot1Config.fileId)}
                    </p>
                    <p>
                      <strong>Plot Type:</strong> {plot1Config.plotType}
                    </p>
                    <p>
                      <strong>Variable:</strong> {plot1Config.variable}
                    </p>
                  </div>
                </div>

                {/* Plot 2 */}
                <div className="plot-container">
                  <h4>Plot 2</h4>
                  <div className="plot-image-container">
                    {generatedPlots.plot2.url ? (
                      <img
                        src={generatedPlots.plot2.url}
                        alt={`${plot2Config.variable} ${plot2Config.plotType} Plot`}
                        className="comparison-plot"
                      />
                    ) : (
                      <div className="plot-error">Failed to generate</div>
                    )}
                  </div>
                  <div className="plot-info">
                    <p>
                      <strong>File:</strong> {getFileName(plot2Config.fileId)}
                    </p>
                    <p>
                      <strong>Plot Type:</strong> {plot2Config.plotType}
                    </p>
                    <p>
                      <strong>Variable:</strong> {plot2Config.variable}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="comparison-placeholder">
                <div className="placeholder-icon">⚖️</div>
                <h4>No Comparison Generated</h4>
                <p>
                  Configure your comparison settings and click "Generate
                  Comparison" to create a side-by-side visualization.
                </p>
                <div className="placeholder-tips">
                  <h5>Comparison Modes:</h5>
                  <ul>
                    <li>
                      <strong>Same File, Different Variables:</strong> Compare
                      different measurements from the same radar scan
                    </li>
                    <li>
                      <strong>Different Files, Same Variable:</strong> Compare
                      the same measurement across different radar scans
                    </li>
                    <li>
                      <strong>Different Files, Different Variables:</strong>{" "}
                      Compare any combination of files and variables
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
