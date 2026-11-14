import React from "react";
import "./ValidateData.css";
import AeroButton from "../components/ui/AeroButton";
import AeroBadge from "../components/ui/AeroBadge";
import {
  FaCheckCircle,
  FaSatelliteDish,
  FaCloudRain,
  FaNetworkWired,
  FaMicrochip,
  FaChartLine,
  FaBrain,
  FaInfoCircle,
  FaHourglassHalf,
  FaUpload,
  FaFileAlt,
} from "react-icons/fa";

export default function ValidateData({ uploadedFiles, fileStore }) {
  const radarFiles = uploadedFiles?.radarFiles || [];
  const rainGaugeFiles = uploadedFiles?.rainGaugeFiles || [];

  const hasRadarData = radarFiles.length > 0;
  const hasGaugeData = rainGaugeFiles.length > 0;
  const isReadyForPairing = hasRadarData && hasGaugeData;

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="aero-validate-console">
      {/* Top Header Ribbon */}
      <div className="validate-header-ribbon">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <FaCheckCircle style={{ color: "var(--aero-yellow, #ffd600)", fontSize: "1.3rem" }} />
          <div>
            <h2
              className="display-font"
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                margin: "0 0 2px 0",
                color: "#ffffff",
              }}
            >
              RADAR VS RAIN GAUGE AI VALIDATION TERMINAL
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                color: "var(--aero-text-secondary, #94a3b8)",
              }}
            >
              Ground-truth statistical verification and neural residual calibration between
              atmospheric radar volume scans and automated weather stations.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AeroBadge variant={isReadyForPairing ? "yellow" : "amber"} pulse={true}>
            {isReadyForPairing ? "DATASETS PAIRED" : "AWAITING CO-LOCATION"}
          </AeroBadge>
        </div>
      </div>

      {/* Dataset Readiness Grid */}
      <div className="dataset-readiness-grid">
        {/* Radar Ingestion Card */}
        <div className="dataset-readiness-card radar-card">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(255, 214, 0, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FaSatelliteDish style={{ color: "var(--aero-yellow, #ffd600)" }} />
              <span className="display-font" style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.95rem" }}>
                INGESTED RADAR VOLUMES
              </span>
            </div>
            <AeroBadge variant={hasRadarData ? "yellow" : "amber"} pulse={false} style={{ fontSize: "0.68rem" }}>
              {radarFiles.length} Scans Available
            </AeroBadge>
          </div>

          {hasRadarData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
              {radarFiles.map((file) => (
                <div
                  key={file.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "rgba(10, 10, 10, 0.6)",
                    border: "1px solid rgba(255, 214, 0, 0.15)",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.74rem",
                  }}
                >
                  <span style={{ color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>
                    {file.name}
                  </span>
                  <span style={{ color: "var(--aero-yellow, #ffd600)" }}>
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#64748b",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
              }}
            >
              No NetCDF radar files uploaded. Please upload scans in the Upload Data module.
            </div>
          )}
        </div>

        {/* Rain Gauge Ingestion Card */}
        <div className="dataset-readiness-card gauge-card">
          <span className="hud-corner-bracket top-left" />
          <span className="hud-corner-bracket top-right" />
          <span className="hud-corner-bracket bottom-left" />
          <span className="hud-corner-bracket bottom-right" />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(255, 196, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FaCloudRain style={{ color: "#ffc400" }} />
              <span className="display-font" style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.95rem" }}>
                RAIN GAUGE AWS LOGGERS
              </span>
            </div>
            <AeroBadge variant={hasGaugeData ? "yellow" : "amber"} pulse={false} style={{ fontSize: "0.68rem" }}>
              {rainGaugeFiles.length} Datasets Available
            </AeroBadge>
          </div>

          {hasGaugeData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
              {rainGaugeFiles.map((file) => (
                <div
                  key={file.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "rgba(10, 10, 10, 0.6)",
                    border: "1px solid rgba(255, 196, 0, 0.18)",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.74rem",
                  }}
                >
                  <span style={{ color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>
                    {file.name}
                  </span>
                  <span style={{ color: "#ffc400" }}>
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#64748b",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
              }}
            >
              No rain gauge datasets uploaded. Please upload CSV/XLSX time-series in the Upload Data module.
            </div>
          )}
        </div>
      </div>

      {/* Conceptual AI & Statistical Validation Flowchart */}
      <div className="validation-architecture-panel">
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
            borderBottom: "1px solid rgba(255, 214, 0, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaBrain style={{ color: "var(--aero-yellow, #ffd600)" }} />
            <span
              className="display-font"
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.08em",
              }}
            >
              VALIDATION PIPELINE ARCHITECTURE (SPECIFICATION 1.0)
            </span>
          </div>

          <AeroBadge variant="yellow" pulse={false} style={{ fontSize: "0.68rem" }}>
            ALGORITHM WORKFLOW
          </AeroBadge>
        </div>

        <div className="pipeline-flowchart-grid">
          {/* Step 1 */}
          <div className="flowchart-step-card">
            <span className="step-card-number">PHASE 01 // EXTRACTION</span>
            <span className="step-card-title">Spatial Ray Casting</span>
            <p className="step-card-desc">
              Interpolates radar gates above gauge GPS coordinates using Nearest Neighbor and Inverse Distance Weighting (IDW).
            </p>
          </div>

          {/* Step 2 */}
          <div className="flowchart-step-card">
            <span className="step-card-number">PHASE 02 // INVERSION</span>
            <span className="step-card-title">Z-R & Polarimetric QPE</span>
            <p className="step-card-desc">
              Applies Marshall-Palmer (Z = 200 · R^1.6) and K_DP-based QPE formulas to convert dBZ reflectivity to rainfall intensity.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flowchart-step-card">
            <span className="step-card-number">PHASE 03 // ALIGNMENT</span>
            <span className="step-card-title">Temporal Windowing</span>
            <p className="step-card-desc">
              Synchronizes rain gauge tipping-bucket accumulation with instantaneous radar volume scan timestamps within a ±15 min window.
            </p>
          </div>

          {/* Step 4 */}
          <div className="flowchart-step-card">
            <span className="step-card-number">PHASE 04 // AI CORRECTION</span>
            <span className="step-card-title">Residual Neural Network</span>
            <p className="step-card-desc">
              Trains a regularized regressor on Western Ghats orographic clutter residuals to minimize radar-gauge divergence.
            </p>
          </div>
        </div>
      </div>

      {/* Target Statistical Verification Indices */}
      <div className="aero-panel aero-panel-cut" style={{ padding: "22px" }}>
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
            borderBottom: "1px solid rgba(255, 214, 0, 0.15)",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaChartLine style={{ color: "#ffd600" }} />
            <span
              className="display-font"
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.08em",
              }}
            >
              STANDARDIZED GROUND TRUTH EVALUATION METRICS
            </span>
          </div>

          <AeroBadge variant="amber" pulse={true} style={{ fontSize: "0.68rem" }}>
            BACKEND ENDPOINTS IN DEVELOPMENT
          </AeroBadge>
        </div>

        <div className="metrics-spec-grid">
          <div className="metric-spec-box">
            <span className="metric-spec-name">Root Mean Square Error (RMSE)</span>
            <span className="metric-spec-formula">
              RMSE = √[ (1/N) · Σ (R_radar - R_gauge)² ]
            </span>
            <span className="metric-spec-desc">
              Penalizes large outlier discrepancies in convective storm cores across high elevations.
            </span>
          </div>

          <div className="metric-spec-box">
            <span className="metric-spec-name">Multiplicative Bias Ratio (B)</span>
            <span className="metric-spec-formula">
              B = (Σ R_radar) / (Σ R_gauge)
            </span>
            <span className="metric-spec-desc">
              Measures systematic overestimation (B &gt; 1) or beam attenuation underestimation (B &lt; 1).
            </span>
          </div>

          <div className="metric-spec-box">
            <span className="metric-spec-name">Pearson Correlation (r)</span>
            <span className="metric-spec-formula">
              r = Cov(R_radar, R_gauge) / (σ_radar · σ_gauge)
            </span>
            <span className="metric-spec-desc">
              Quantifies linear tracking fidelity between radar reflectivity echoes and gauge tipping buckets.
            </span>
          </div>

          <div className="metric-spec-box">
            <span className="metric-spec-name">Mean Absolute Error (MAE)</span>
            <span className="metric-spec-formula">
              MAE = (1/N) · Σ |R_radar - R_gauge|
            </span>
            <span className="metric-spec-desc">
              Direct linear deviation metric expressed in mm/hr ground precipitation units.
            </span>
          </div>

          <div className="metric-spec-box">
            <span className="metric-spec-name">Critical Success Index (CSI)</span>
            <span className="metric-spec-formula">
              CSI = Hits / (Hits + Misses + FalseAlarms)
            </span>
            <span className="metric-spec-desc">
              Binary rain/no-rain detection skill score for orographic drizzle thresholds (≥ 0.5 mm/hr).
            </span>
          </div>

          <div className="metric-spec-box">
            <span className="metric-spec-name">Fractional Standard Error (FSE)</span>
            <span className="metric-spec-formula">
              FSE = (RMSE / R̄_gauge) × 100%
            </span>
            <span className="metric-spec-desc">
              Normalized relative error metric indicating radar calibration stability across seasons.
            </span>
          </div>
        </div>

        {/* Integration Status Notice */}
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            background: "rgba(10, 10, 10, 0.7)",
            border: "1px solid rgba(255, 214, 0, 0.3)",
            borderRadius: "6px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.74rem",
            color: "var(--aero-text-secondary, #94a3b8)",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            lineHeight: 1.5,
          }}
        >
          <FaHourglassHalf style={{ color: "#ffd600", marginTop: "2px", flexShrink: 0 }} />
          <span>
            <strong>Scientific Implementation Notice:</strong> The validation pipeline specifications and mathematical models above are fully registered.
            The backend evaluation endpoints (`/api/validation/...`) are slated for integration in the upcoming Python processing release.
            Currently, both radar and rain gauge datasets are stored and managed in the <strong>Upload Data</strong> module.
          </span>
        </div>
      </div>
    </div>
  );
}
