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
import AeroButton from "../components/ui/AeroButton";
import AeroBadge from "../components/ui/AeroBadge";
import {
  FaCloudRain,
  FaSatelliteDish,
  FaCrosshairs,
  FaMapMarkedAlt,
  FaSlidersH,
  FaInfoCircle,
  FaExclamationTriangle,
  FaEye,
  FaCheckCircle,
} from "react-icons/fa";

// Fix for default markers in react-leaflet with Leaflet
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

// Custom Radar Station Pin
const radarStationIcon = new L.DivIcon({
  className: "custom-radar-station-pin",
  html: `<div style="
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(255, 214, 0, 0.95);
    border: 2px solid #ffffff;
    box-shadow: 0 0 15px #ffd600;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #000000;
    font-size: 10px;
    font-weight: bold;
  ">📡</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Custom Clicked Point Target Pin
const targetPointIcon = new L.DivIcon({
  className: "custom-target-point-pin",
  html: `<div style="
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 230, 0, 0.95);
    border: 2px solid #ffffff;
    box-shadow: 0 0 16px #ffd600;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #000000;
    font-size: 10px;
    font-weight: bold;
  ">🎯</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Component to dynamically fit map view when coverage is loaded
function MapUpdater({ coverage }) {
  const map = useMap();

  useEffect(() => {
    if (coverage) {
      const bounds = [
        [coverage.lat_min, coverage.lon_min],
        [coverage.lat_max, coverage.lon_max],
      ];
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [coverage, map]);

  return null;
}

// Component to handle click-to-calculate events on the map
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    },
  });
  return null;
}

// Geographic dBZ Reflectivity Overlay
function DbzOverlay({ coverage, imageUrl, opacity }) {
  if (!coverage || !imageUrl) return null;

  const bounds = [
    [coverage.lat_min, coverage.lon_min],
    [coverage.lat_max, coverage.lon_max],
  ];

  return (
    <ImageOverlay
      url={imageUrl}
      bounds={bounds}
      opacity={opacity}
      zIndex={100}
      interactive={false} // Prevents blocking mouse clicks on the map underneath
    />
  );
}

export default function RainfallEstimation({ uploadedFiles, fileStore }) {
  const [selectedFile, setSelectedFile] = useState("");
  const [zrCoefficientA, setZrCoefficientA] = useState(200);
  const [zrCoefficientB, setZrCoefficientB] = useState(1.6);
  const [zrPreset, setZrPreset] = useState("marshall-palmer");
  const [mapCenter, setMapCenter] = useState([17.9237, 73.6586]); // Default Mahabaleshwar
  const [mapZoom, setMapZoom] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coverage, setCoverage] = useState(null);
  const [rainfallResult, setRainfallResult] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [dbzOverlayUrl, setDbzOverlayUrl] = useState(null);
  const [generatingOverlay, setGeneratingOverlay] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);

  const radarFiles = uploadedFiles?.radarFiles || [];

  // Z-R Presets
  const zrPresets = {
    "marshall-palmer": {
      a: 200,
      b: 1.6,
      name: "Marshall-Palmer",
      sub: "Stratiform Monsoon",
    },
    "custom-1": {
      a: 250,
      b: 1.4,
      name: "Orographic Ghats",
      sub: "High-Altitude Cloud",
    },
    "custom-2": {
      a: 300,
      b: 1.2,
      name: "Convective Storm",
      sub: "Deep Convection",
    },
    custom: {
      a: zrCoefficientA,
      b: zrCoefficientB,
      name: "Custom Matrix",
      sub: "Operator Calibration",
    },
  };

  useEffect(() => {
    if (zrPreset !== "custom") {
      setZrCoefficientA(zrPresets[zrPreset].a);
      setZrCoefficientB(zrPresets[zrPreset].b);
    }
  }, [zrPreset]);

  // Reset when file changes
  useEffect(() => {
    if (selectedFile) {
      setCoverage(null);
      setRainfallResult(null);
      setSelectedPoint(null);
      if (dbzOverlayUrl) {
        URL.revokeObjectURL(dbzOverlayUrl);
      }
      setDbzOverlayUrl(null);
      setError("");
    }
  }, [selectedFile]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (dbzOverlayUrl) {
        URL.revokeObjectURL(dbzOverlayUrl);
      }
    };
  }, [dbzOverlayUrl]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Generate dBZ overlay from backend Py-ART
  const generateDbzOverlay = async (file) => {
    try {
      setGeneratingOverlay(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("plotType", "PPI");
      formData.append("variable", "DBZ");

      const response = await axios.post(
        "http://localhost:5000/api/radar/generate-plot",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          responseType: "blob",
        }
      );

      const imageUrl = URL.createObjectURL(response.data);
      setDbzOverlayUrl(imageUrl);
    } catch (err) {
      console.warn("Could not generate dBZ overlay:", err.message);
    } finally {
      setGeneratingOverlay(false);
    }
  };

  // Analyze radar coverage via backend API
  const handleAnalyzeRadar = async () => {
    if (!selectedFile) {
      setError("Please select a radar file first");
      return;
    }

    const file = fileStore.get(selectedFile);
    if (!file) {
      setError(
        "File binary not found in browser memory (session refreshed). Please re-upload in Upload Data."
      );
      return;
    }

    setLoading(true);
    setError("");
    setCoverage(null);
    setRainfallResult(null);
    if (dbzOverlayUrl) {
      URL.revokeObjectURL(dbzOverlayUrl);
      setDbzOverlayUrl(null);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const coverageResponse = await axios.post(
        "http://localhost:5000/api/rainfall/get-coverage",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (coverageResponse.data.success) {
        const cov = coverageResponse.data.coverage;
        setCoverage(cov);
        setMapCenter([cov.center_lat, cov.center_lon]);

        // Generate dBZ overlay in parallel
        generateDbzOverlay(file);

        if (coverageResponse.data.sample_rainfall_calculation) {
          setRainfallResult({
            type: "coverage_analysis",
            message:
              "Radar coverage boundaries locked. Click anywhere inside the scan perimeter to calculate point precipitation.",
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
      setError(err.response?.data?.error || err.message || "Failed to analyze radar data");
    } finally {
      setLoading(false);
    }
  };

  // Click on map to calculate point rainfall via backend
  const handleMapClick = async (e) => {
    if (!coverage || !selectedFile) {
      setError("Please analyze radar coverage first before selecting geographic points");
      return;
    }

    const clickedPoint = {
      lat: e.latlng.lat,
      lng: e.latlng.lng,
    };

    setSelectedPoint(clickedPoint);
    setLoading(true);
    setError("");

    try {
      const file = fileStore.get(selectedFile);
      if (!file) {
        throw new Error("File binary not found in browser memory. Please re-upload in Upload Data.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("lat", clickedPoint.lat.toString());
      formData.append("lon", clickedPoint.lng.toString());
      formData.append("a", zrCoefficientA.toString());
      formData.append("b", zrCoefficientB.toString());

      const response = await axios.post(
        "http://localhost:5000/api/rainfall/point-rainfall",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        setRainfallResult({
          type: "point_calculation",
          message: `PRECIPITATION ESTIMATED AT ${clickedPoint.lat.toFixed(4)}°N, ${clickedPoint.lng.toFixed(4)}°E`,
          point: clickedPoint,
          calculation: response.data,
        });
      } else {
        setError(response.data.error || "Failed to calculate point rainfall");
      }
    } catch (err) {
      console.error("Error calculating rainfall:", err);
      setError(err.response?.data?.error || err.message || "Failed to calculate point rainfall");
    } finally {
      setLoading(false);
    }
  };

  // Precipitation Intensity Color and Category helper
  const getPrecipitationCategory = (rate) => {
    if (isNaN(rate) || rate <= 0) return { label: "No Detectable Rain", color: "#64748b" };
    if (rate < 0.5) return { label: "Very Light Drizzle", color: "#ffd600" };
    if (rate < 4.0) return { label: "Moderate Rain", color: "#ffe600" };
    if (rate < 16.0) return { label: "Heavy Rain", color: "#ffc400" };
    return { label: "Torrential Downpour", color: "#ef4444" };
  };

  const selectedFileObj = radarFiles.find((f) => f.id === selectedFile);
  const isInMemory = selectedFile ? fileStore.has(selectedFile) : false;

  return (
    <div className="aero-rainfall-console">
      {/* Top Header Ribbon */}
      <div className="rainfall-header-ribbon">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <FaCloudRain style={{ color: "var(--aero-yellow, #ffd600)", fontSize: "1.25rem" }} />
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
              GEOSPATIAL RAINFALL INTELLIGENCE & Z-R SUITE
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--aero-text-secondary, #94a3b8)",
              }}
            >
              Convert dual-polarimetric radar reflectivity into instantaneous rainfall rates
              with interactive GIS point sampling.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {generatingOverlay && (
            <AeroBadge variant="yellow" pulse={true} style={{ fontSize: "0.68rem" }}>
              GENERATING DBZ OVERLAY...
            </AeroBadge>
          )}
          <AeroBadge variant="yellow" pulse={false}>
            GIS ENGINE READY
          </AeroBadge>
        </div>
      </div>

      {/* Main Cockpit Grid */}
      <div className="rainfall-cockpit-grid">
        {/* LEFT: Configuration & Scientific Results Rail */}
        <aside className="rainfall-config-rail">
          {/* Panel 1: Parameter Configuration */}
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
                paddingBottom: "8px",
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
                ANALYSIS PARAMETERS
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontFamily: "var(--font-mono)",
                  color: "#64748b",
                }}
              >
                Z-R CONSOLE
              </span>
            </div>

            {/* Step 1: Select Radar Volume */}
            <div className="control-input-group" style={{ marginBottom: "14px" }}>
              <label>1. Select Radar Volume</label>
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
                  ⚠️ File binary is not in memory cache (page refreshed). Re-upload in Upload Data.
                </div>
              )}
            </div>

            {/* Step 2: Z-R Relationship Preset Cards */}
            <div style={{ marginBottom: "14px" }}>
              <label className="aero-label" style={{ marginBottom: "6px" }}>
                <span>2. Z-R Relationship Configuration</span>
              </label>

              <div className="zr-preset-grid">
                {Object.entries(zrPresets).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    className={`zr-preset-btn ${zrPreset === key ? "active" : ""}`}
                    onClick={() => setZrPreset(key)}
                  >
                    <span>{preset.name}</span>
                    <span className="preset-formula">
                      Z = {preset.a} · R^{preset.b}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Coefficients Inputs */}
              {zrPreset === "custom" && (
                <div className="zr-custom-inputs-row">
                  <div>
                    <label style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                      Coefficient A:
                    </label>
                    <input
                      type="number"
                      value={zrCoefficientA}
                      onChange={(e) => setZrCoefficientA(parseFloat(e.target.value) || 200)}
                      step="10"
                      min="1"
                      className="zr-number-input"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                      Exponent b:
                    </label>
                    <input
                      type="number"
                      value={zrCoefficientB}
                      onChange={(e) => setZrCoefficientB(parseFloat(e.target.value) || 1.6)}
                      step="0.05"
                      min="0.5"
                      max="3"
                      className="zr-number-input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active Formula Box */}
            <div className="active-formula-box" style={{ marginBottom: "16px" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase" }}>
                Current Inversion Model:
              </div>
              <div style={{ fontWeight: 600 }}>
                Z = {zrCoefficientA} · R<sup>{zrCoefficientB}</sup>
              </div>
              <div style={{ color: "#ffffff", fontSize: "0.7rem" }}>
                R = (Z / {zrCoefficientA})<sup>1 / {zrCoefficientB}</sup> mm/hr
              </div>
            </div>

            {/* Analyze Radar Button */}
            <AeroButton
              onClick={handleAnalyzeRadar}
              disabled={!selectedFile || loading || !isInMemory}
              loading={loading && !selectedPoint}
              style={{ width: "100%", padding: "12px" }}
              icon={<FaSatelliteDish />}
            >
              {loading && !selectedPoint
                ? "ANALYZING RADAR COVERAGE..."
                : "ANALYZE RADAR COVERAGE"}
            </AeroButton>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  marginTop: "12px",
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

          {/* Panel 2: Scientific Point Calculation Results */}
          {rainfallResult && (
            <div className="point-result-card">
              <span className="hud-corner-bracket top-left" />
              <span className="hud-corner-bracket top-right" />
              <span className="hud-corner-bracket bottom-left" />
              <span className="hud-corner-bracket bottom-right" />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(255, 214, 0, 0.15)",
                }}
              >
                <span
                  className="display-font"
                  style={{
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FaCrosshairs style={{ color: "#ffd600" }} />
                  PRECIPITATION RESULTS
                </span>
                <AeroBadge variant="yellow" pulse={false} style={{ fontSize: "0.65rem" }}>
                  POINT LOCKED
                </AeroBadge>
              </div>

              {/* Point Calculation Display */}
              {rainfallResult.type === "point_calculation" && rainfallResult.calculation && (
                <>
                  {(() => {
                    const rate = rainfallResult.calculation.rainfall_rate_mm_hr;
                    const cat = getPrecipitationCategory(rate);
                    const dbzVal =
                      rainfallResult.calculation.reflectivity?.dbz ??
                      rainfallResult.calculation.reflectivity?.value ??
                      rainfallResult.calculation.dbz;

                    return (
                      <>
                        <div className="rainfall-rate-hero">
                          <div>
                            <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase" }}>
                              Calculated Rainfall Rate
                            </div>
                            <div className="rate-number-display" style={{ color: cat.color }}>
                              {isNaN(rate) || rate <= 0 ? "0.000" : rate.toFixed(3)}
                              <span style={{ fontSize: "0.95rem", marginLeft: "4px", color: "#94a3b8" }}>
                                mm/hr
                              </span>
                            </div>
                          </div>
                          <span
                            className="rate-category-badge"
                            style={{
                              background: `${cat.color}22`,
                              border: `1px solid ${cat.color}`,
                              color: cat.color,
                            }}
                          >
                            {cat.label}
                          </span>
                        </div>

                        {/* Telemetry Metrics Grid */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.72rem",
                          }}
                        >
                          <div style={{ background: "rgba(16, 16, 16, 0.6)", padding: "8px", borderRadius: "4px" }}>
                            <div style={{ color: "#64748b" }}>REFLECTIVITY</div>
                            <div style={{ color: "#ffffff", fontWeight: 600 }}>
                              {typeof dbzVal === "number" ? dbzVal.toFixed(1) : "N/A"} dBZ
                            </div>
                          </div>

                          <div style={{ background: "rgba(16, 16, 16, 0.6)", padding: "8px", borderRadius: "4px" }}>
                            <div style={{ color: "#64748b" }}>CLOSEST GATE DIST</div>
                            <div style={{ color: "var(--aero-yellow, #ffd600)", fontWeight: 600 }}>
                              {rainfallResult.calculation.closest_gate?.distance_km?.toFixed(2) || "0.00"} km
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.68rem",
                            color: "#64748b",
                            padding: "6px 8px",
                            background: "rgba(10, 10, 10, 0.5)",
                            borderRadius: "4px",
                          }}
                        >
                          COORDINATES: {rainfallResult.point?.lat?.toFixed(4)}°N, {rainfallResult.point?.lng?.toFixed(4)}°E
                        </div>

                        {dbzVal < 0 && (
                          <div style={{ color: "#fbbf24", fontSize: "0.68rem", fontFamily: "var(--font-mono)" }}>
                            ⚠️ Sub-zero reflectivity indicates clean air or non-precipitating cloud particles.
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}

              {/* Sample Z-R Table */}
              {rainfallResult.sampleCalculation && (
                <div style={{ marginTop: "6px" }}>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>
                    SAMPLE Z-R CONVERSION TABLE:
                  </div>
                  <table className="sample-zr-table">
                    <thead>
                      <tr>
                        <th>Reflectivity (dBZ)</th>
                        <th>Precipitation Rate (mm/hr)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rainfallResult.sampleCalculation.dbz_values.slice(0, 5).map((dbz, idx) => (
                        <tr key={dbz}>
                          <td style={{ color: "#ffd600" }}>{dbz} dBZ</td>
                          <td style={{ color: "#ffffff" }}>
                            {rainfallResult.sampleCalculation.rainfall_rates[idx]?.toFixed(3)} mm/hr
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* RIGHT: High-Tech GIS Interactive Map Viewport */}
        <main className="rainfall-map-viewport">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          {/* Map Toolbar */}
          <div className="map-hud-toolbar">
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
                RADAR GIS COVERAGE & REFLECTIVITY MAP
              </span>
              {coverage && (
                <AeroBadge variant="yellow" pulse={true} style={{ fontSize: "0.68rem" }}>
                  COVERAGE ACTIVE
                </AeroBadge>
              )}
            </div>

            {/* Opacity Slider for DBZ Overlay */}
            {dbzOverlayUrl && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 12px",
                  background: "rgba(10, 10, 10, 0.8)",
                  border: "1px solid rgba(255, 214, 0, 0.2)",
                  borderRadius: "6px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                }}
              >
                <FaEye style={{ color: "var(--aero-yellow, #ffd600)" }} />
                <span style={{ color: "#94a3b8" }}>OVERLAY OPACITY:</span>
                <span style={{ color: "var(--aero-yellow, #ffd600)", fontWeight: 600 }}>
                  {Math.round(overlayOpacity * 100)}%
                </span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  style={{
                    width: "70px",
                    accentColor: "var(--aero-yellow, #ffd600)",
                    cursor: "pointer",
                  }}
                />
              </div>
            )}
          </div>

          {/* Leaflet Map Container */}
          <div className="leaflet-map-wrapper">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: "100%", width: "100%", backgroundColor: "#000000" }}
            >
              {/* Dark CartoDB Matter Tile Layer */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />

              {/* Click-to-Calculate Handler */}
              <MapClickHandler onMapClick={handleMapClick} />

              {/* Geographic dBZ Reflectivity Overlay */}
              <DbzOverlay
                coverage={coverage}
                imageUrl={dbzOverlayUrl}
                opacity={overlayOpacity}
              />

              {/* Dynamic Fit Bounds on coverage load */}
              {coverage && <MapUpdater coverage={coverage} />}

              {/* Radar Station Marker */}
              <Marker
                position={
                  coverage
                    ? [coverage.center_lat, coverage.center_lon]
                    : mapCenter
                }
                icon={radarStationIcon}
              >
                <Popup>
                  <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#111" }}>
                    <strong>MAHABALESHWAR CLOUD RADAR</strong>
                    <br />
                    Lat: {coverage ? coverage.center_lat.toFixed(4) : "17.9237"}°N
                    <br />
                    Lon: {coverage ? coverage.center_lon.toFixed(4) : "73.6586"}°E
                    <br />
                    Frequency: S-Band 2.8 GHz
                  </div>
                </Popup>
              </Marker>

              {/* Geographic Coverage Rectangle */}
              {coverage && (
                <Rectangle
                  bounds={[
                    [coverage.lat_min, coverage.lon_min],
                    [coverage.lat_max, coverage.lon_max],
                  ]}
                  pathOptions={{
                    color: "#ffd600",
                    fillColor: "#ffd600",
                    fillOpacity: 0.05,
                    weight: 1.5,
                    dashArray: "4, 6",
                  }}
                />
              )}

              {/* Selected Geographic Point Marker */}
              {selectedPoint && (
                <Marker
                  position={[selectedPoint.lat, selectedPoint.lng]}
                  icon={targetPointIcon}
                >
                  <Popup>
                    <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#111" }}>
                      <strong>TARGET POINT</strong>
                      <br />
                      Lat: {selectedPoint.lat.toFixed(4)}°N
                      <br />
                      Lon: {selectedPoint.lng.toFixed(4)}°E
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* Bottom Telemetry Bar */}
          <div
            style={{
              marginTop: "12px",
              paddingTop: "8px",
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
              {coverage ? (
                <span style={{ color: "var(--aero-yellow, #ffd600)" }}>
                  📍 CLICK ANYWHERE ON MAP TO ESTIMATE INSTANTANEOUS PRECIPITATION RATE
                </span>
              ) : (
                <span>📍 Analyze radar coverage on the left to activate map bounds and point sampling</span>
              )}
            </div>

            {coverage && (
              <div>
                BOUNDS: [{coverage.lat_min.toFixed(2)}°N, {coverage.lon_min.toFixed(2)}°E] → [{coverage.lat_max.toFixed(2)}°N, {coverage.lon_max.toFixed(2)}°E]
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
