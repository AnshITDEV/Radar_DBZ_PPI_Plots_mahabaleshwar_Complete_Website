import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Rectangle,
  useMap,
  useMapEvents,
  ImageOverlay,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./RainfallEstimation.css";
import axios from "axios";

// Fix for default markers in react-leaflet
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Component to update map view when coverage changes
function MapUpdater({ coverage }) {
  const map = useMap();

  useEffect(() => {
    if (coverage) {
      const bounds = [
        [coverage.lat_min, coverage.lon_min],
        [coverage.lat_max, coverage.lon_max],
      ];
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [coverage, map]);

  return null;
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }) {
  const map = useMapEvents({
    click: (e) => {
      console.log("🎯 Map clicked!", e.latlng);
      onMapClick(e);
    },
  });
  return null;
}

// Component for the dBZ overlay
function DbzOverlay({ coverage, imageUrl }) {
  const map = useMap();

  if (!coverage || !imageUrl) return null;

  const bounds = [
    [coverage.lat_min, coverage.lon_min],
    [coverage.lat_max, coverage.lon_max],
  ];

  return (
    <ImageOverlay
      url={imageUrl}
      bounds={bounds}
      opacity={0.4} // Predefined opacity as requested
      zIndex={100} // Ensure it's above the base map but below markers
      className="dbz-overlay"
    />
  );
}

export default function RainfallEstimation({ uploadedFiles, fileStore }) {
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedFileMetadata, setSelectedFileMetadata] = useState(null);
  const [zrCoefficientA, setZrCoefficientA] = useState(200);
  const [zrCoefficientB, setZrCoefficientB] = useState(1.6);
  const [zrPreset, setZrPreset] = useState("marshall-palmer");
  const [mapCenter, setMapCenter] = useState([23.5714, 77.2458]);
  const [mapZoom, setMapZoom] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coverage, setCoverage] = useState(null);
  const [rainfallResult, setRainfallResult] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [dbzOverlayUrl, setDbzOverlayUrl] = useState(null); // NEW: For overlay image
  const [generatingOverlay, setGeneratingOverlay] = useState(false); // NEW: Overlay loading state

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

    const handleFocus = () => {
      checkDarkMode();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Get uploaded radar files from props
  const radarFiles = uploadedFiles?.radarFiles || [];

  // Z-R relationship presets
  const zrPresets = {
    "marshall-palmer": { a: 200, b: 1.6, name: "Marshall-Palmer" },
    "custom-1": { a: 250, b: 1.4, name: "A=250, B=1.4" },
    "custom-2": { a: 300, b: 1.2, name: "A=300, B=1.2" },
    custom: { a: zrCoefficientA, b: zrCoefficientB, name: "Custom" },
  };

  // Update coefficients when preset changes
  useEffect(() => {
    if (zrPreset !== "custom") {
      setZrCoefficientA(zrPresets[zrPreset].a);
      setZrCoefficientB(zrPresets[zrPreset].b);
    }
  }, [zrPreset]);

  // Reset when file changes
  useEffect(() => {
    if (selectedFile) {
      const fileMetadata = radarFiles.find((f) => f.id === selectedFile);
      setSelectedFileMetadata(fileMetadata);
      setCoverage(null);
      setRainfallResult(null);
      setSelectedPoint(null);
      setDbzOverlayUrl(null); // NEW: Reset overlay when file changes
      setError("");
    }
  }, [selectedFile, radarFiles]);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // NEW: Function to generate dBZ overlay
  const generateDbzOverlay = async (file) => {
    try {
      setGeneratingOverlay(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("plotType", "PPI");
      formData.append("variable", "DBZ"); // Using DBZ for reflectivity

      console.log("🔄 Generating dBZ overlay...");

      const response = await axios.post(
        "http://localhost:5000/api/radar/generate-plot",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          responseType: "blob", // Important for image response
        }
      );

      // Create object URL from the blob response
      const imageUrl = URL.createObjectURL(response.data);
      setDbzOverlayUrl(imageUrl);
      console.log("✅ dBZ overlay generated successfully");
    } catch (err) {
      console.warn(
        "⚠️ Could not generate dBZ overlay:",
        err.response?.data?.error || err.message
      );
      // Don't show error to user - overlay is optional enhancement
    } finally {
      setGeneratingOverlay(false);
    }
  };

  const handleAnalyzeRadar = async () => {
    if (!selectedFile) {
      setError("Please select a radar file first");
      return;
    }

    setLoading(true);
    setError("");
    setCoverage(null);
    setRainfallResult(null);
    setDbzOverlayUrl(null); // NEW: Reset previous overlay

    try {
      const file = fileStore.get(selectedFile);
      if (!file) {
        throw new Error(
          "File content not available. Please re-upload the file."
        );
      }

      const formData = new FormData();
      formData.append("file", file);

      // Get coverage data first
      const coverageResponse = await axios.post(
        "http://localhost:5000/api/rainfall/get-coverage",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (coverageResponse.data.success) {
        setCoverage(coverageResponse.data.coverage);
        setMapCenter([
          coverageResponse.data.coverage.center_lat,
          coverageResponse.data.coverage.center_lon,
        ]);

        // NEW: Generate dBZ overlay in parallel
        generateDbzOverlay(file);

        // Show success message with sample rainfall calculation
        if (coverageResponse.data.sample_rainfall_calculation) {
          setRainfallResult({
            type: "coverage_analysis",
            message:
              "Radar coverage analyzed successfully. Click on the map to calculate rainfall at specific points.",
            sampleCalculation:
              coverageResponse.data.sample_rainfall_calculation,
            radarInfo: coverageResponse.data,
          });
        }
      } else {
        throw new Error(
          coverageResponse.data.error || "Failed to analyze radar coverage"
        );
      }
    } catch (err) {
      console.error("Error analyzing radar:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to analyze radar data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (e) => {
    if (!coverage || !selectedFile) {
      setError("Please analyze radar data first and select a file");
      return;
    }

    const clickedPoint = {
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      rainfall: null,
    };

    console.log("🗺️ Map clicked at:", clickedPoint);

    // Add a temporary visual feedback
    setSelectedPoint(clickedPoint);
    setLoading(true);
    setError("");

    try {
      const file = fileStore.get(selectedFile);
      if (!file) {
        throw new Error(
          "File content not available. Please re-upload the file."
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("lat", clickedPoint.lat.toString());
      formData.append("lon", clickedPoint.lng.toString());
      formData.append("a", zrCoefficientA.toString());
      formData.append("b", zrCoefficientB.toString());

      console.log("📤 Sending point rainfall request...", {
        lat: clickedPoint.lat,
        lon: clickedPoint.lng,
        a: zrCoefficientA,
        b: zrCoefficientB,
        file: file.name,
      });

      const response = await axios.post(
        "http://localhost:5000/api/rainfall/point-rainfall",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
        }
      );

      console.log("✅ Point rainfall response:", response.data);

      if (response.data.success) {
        setRainfallResult({
          type: "point_calculation",
          message: `Rainfall calculated at: ${clickedPoint.lat.toFixed(
            4
          )}°, ${clickedPoint.lng.toFixed(4)}°`,
          point: clickedPoint,
          calculation: response.data,
        });
      } else {
        console.error("❌ Backend returned error:", response.data.error);
        setError(response.data.error || "Failed to calculate rainfall");
      }
    } catch (err) {
      console.error("❌ Error calculating rainfall:", err);
      console.error("❌ Error details:", err.response?.data);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to calculate rainfall"
      );
    } finally {
      setLoading(false);
    }
  };

  // Clean up object URL when component unmounts or overlay changes
  useEffect(() => {
    return () => {
      if (dbzOverlayUrl) {
        URL.revokeObjectURL(dbzOverlayUrl);
      }
    };
  }, [dbzOverlayUrl]);

  return (
    <div
      className={`rainfall-estimation-container ${darkMode ? "dark-mode" : ""}`}
    >
      <div className="rainfall-header">
        <h2>Rainfall Estimation</h2>
        <p>
          Convert radar reflectivity to rainfall rates using Z-R relationships
        </p>
        {generatingOverlay && (
          <div className="overlay-loading">
            🔄 Generating reflectivity overlay...
          </div>
        )}
      </div>

      <div className="rainfall-content">
        {/* Configuration Panel */}
        <div className="configuration-panel">
          <div className="config-card">
            <h3>Configuration</h3>
            <div className="config-card-content">
              {/* File Selection */}
              <div className="control-group">
                <label>Select Radar File:</label>
                <select
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="control-select"
                >
                  <option value="">-- Select radar file --</option>
                  {radarFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name} ({formatFileSize(file.size)}) -{" "}
                      {file.scanType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Z-R Relationship */}
              <div className="control-group">
                <label>Z-R Relationship:</label>
                <select
                  value={zrPreset}
                  onChange={(e) => setZrPreset(e.target.value)}
                  className="control-select"
                >
                  {Object.entries(zrPresets).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.name} (Z={preset.a}R^{preset.b})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Coefficients */}
              {zrPreset === "custom" && (
                <div className="coefficients-group">
                  <div className="coefficient-input">
                    <label>Coefficient A:</label>
                    <input
                      type="number"
                      value={zrCoefficientA}
                      onChange={(e) =>
                        setZrCoefficientA(parseFloat(e.target.value))
                      }
                      step="10"
                      min="1"
                    />
                  </div>
                  <div className="coefficient-input">
                    <label>Coefficient B:</label>
                    <input
                      type="number"
                      value={zrCoefficientB}
                      onChange={(e) =>
                        setZrCoefficientB(parseFloat(e.target.value))
                      }
                      step="0.1"
                      min="1"
                      max="2"
                    />
                  </div>
                </div>
              )}

              {/* Current Configuration */}
              <div className="current-config">
                <h4>Current Z-R Parameters</h4>
                <p>
                  Z = {zrCoefficientA} × R<sup>{zrCoefficientB}</sup>
                </p>
                <p>
                  R = (Z/{zrCoefficientA})<sup>1/{zrCoefficientB}</sup>
                </p>
              </div>

              {/* Action Button */}
              <div className="action-group">
                <button
                  onClick={handleAnalyzeRadar}
                  disabled={!selectedFile || loading}
                  className="analyze-btn"
                >
                  {loading ? "Analyzing Radar Data..." : "Analyze Radar Data"}
                </button>
              </div>

              {/* Error Display */}
              {error && <div className="error-message">⚠️ {error}</div>}

              {/* Results Display */}
              {rainfallResult && (
                <div className="results-panel">
                  <h4>Analysis Results</h4>
                  <div className="result-message">{rainfallResult.message}</div>

                  {rainfallResult.sampleCalculation && (
                    <div className="sample-calculation">
                      <h5>Sample Z-R Conversion:</h5>
                      <table className="sample-table">
                        <thead>
                          <tr>
                            <th>dBZ</th>
                            <th>Rainfall (mm/hr)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rainfallResult.sampleCalculation.dbz_values.map(
                            (dbz, index) => (
                              <tr key={index}>
                                <td>{dbz}</td>
                                <td>
                                  {rainfallResult.sampleCalculation.rainfall_rates[
                                    index
                                  ]?.toFixed(3)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add this section to display point rainfall calculation results */}
                  {rainfallResult.type === "point_calculation" &&
                    rainfallResult.calculation && (
                      <div className="rainfall-calculation">
                        <h5>Rainfall Calculation:</h5>
                        <div className="calculation-details">
                          <p>
                            <strong>Rainfall Rate:</strong>
                            {isNaN(
                              rainfallResult.calculation.rainfall_rate_mm_hr
                            )
                              ? "No rainfall (negative reflectivity)"
                              : `${rainfallResult.calculation.rainfall_rate_mm_hr?.toFixed(
                                  3
                                )} mm/hr`}
                          </p>
                          <p>
                            <strong>Reflectivity:</strong>{" "}
                            {rainfallResult.calculation.reflectivity?.dbz?.toFixed(
                              1
                            )}{" "}
                            dBZ
                          </p>
                          <p>
                            <strong>Field:</strong>{" "}
                            {rainfallResult.calculation.reflectivity?.field}
                          </p>
                          <p>
                            <strong>Distance to nearest gate:</strong>{" "}
                            {rainfallResult.calculation.closest_gate?.distance_km?.toFixed(
                              2
                            )}{" "}
                            km
                          </p>
                          {rainfallResult.calculation.reflectivity?.dbz < 0 && (
                            <p className="warning-note">
                              ⚠️ Negative reflectivity values indicate no
                              detectable precipitation
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  {rainfallResult.type === "point_selected" && (
                    <div className="selected-point">
                      <h5>Selected Point:</h5>
                      <p>Latitude: {rainfallResult.point.lat.toFixed(4)}°</p>
                      <p>Longitude: {rainfallResult.point.lng.toFixed(4)}°</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Panel */}
        <div className="map-panel">
          <div className="map-card">
            <h3>Radar Coverage & Rainfall Map</h3>
            <div className="map-container">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Add the MapClickHandler component */}
                <MapClickHandler onMapClick={handleMapClick} />

                {/* NEW: dBZ Overlay */}
                <DbzOverlay coverage={coverage} imageUrl={dbzOverlayUrl} />

                {/* Radar location marker */}
                <Marker position={mapCenter}>
                  <Popup>
                    Radar Location: ARTCI
                    <br />
                    Latitude: 23.5714°N
                    <br />
                    Longitude: 77.2458°E
                  </Popup>
                </Marker>

                {/* Coverage area */}
                {coverage && (
                  <>
                    <MapUpdater coverage={coverage} />
                    <Rectangle
                      bounds={[
                        [coverage.lat_min, coverage.lon_min],
                        [coverage.lat_max, coverage.lon_max],
                      ]}
                      pathOptions={{
                        color: "blue",
                        fillOpacity: 0.1,
                        weight: 2,
                      }}
                    />
                  </>
                )}

                {/* Selected point */}
                {selectedPoint && (
                  <Marker position={[selectedPoint.lat, selectedPoint.lng]}>
                    <Popup>
                      Selected Point
                      <br />
                      Lat: {selectedPoint.lat.toFixed(4)}°<br />
                      Lon: {selectedPoint.lng.toFixed(4)}°
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
            <div className="map-instructions">
              {coverage ? (
                <p>
                  📍 Click anywhere on the map to calculate rainfall at that
                  location
                  {dbzOverlayUrl && (
                    <span> - Reflectivity overlay active (40% opacity)</span>
                  )}
                </p>
              ) : (
                <p>
                  📍 Analyze radar data first to see coverage area and enable
                  point selection
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
