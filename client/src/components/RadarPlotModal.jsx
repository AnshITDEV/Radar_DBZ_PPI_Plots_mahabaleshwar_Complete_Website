import React, { useEffect, useState } from "react";
import {
  FaTimes,
  FaSearchPlus,
  FaSearchMinus,
  FaDownload,
  FaExpandArrowsAlt,
  FaCompressArrowsAlt,
} from "react-icons/fa";

export default function RadarPlotModal({
  isOpen,
  onClose,
  imageUrl,
  date,
  filename,
  plotType,
  variable,
}) {
  const [zoom, setZoom] = useState(1);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `AEROSCOPE_${date}_${filename}_${plotType}_${variable}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "rgba(0, 0, 0, 0.96)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px",
        animation: "modalFadeIn 0.25s ease-out",
      }}
      onClick={onClose}
    >
      {/* Top Telemetry Header */}
      <div
        style={{
          width: "100%",
          maxWidth: "1400px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          background: "#0a0a0a",
          border: "1px solid rgba(255, 214, 0, 0.3)",
          borderRadius: "8px",
          color: "#ffffff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            className="telemetry-font"
            style={{
              color: "var(--aero-yellow, #ffd600)",
              fontWeight: 700,
              fontSize: "0.9rem",
              letterSpacing: "0.1em",
            }}
          >
            AEROSCOPE // HIGH-RESOLUTION PLOT TELEMETRY
          </span>
          <span
            style={{
              padding: "3px 10px",
              background: "rgba(255, 214, 0, 0.1)",
              border: "1px solid rgba(255, 214, 0, 0.35)",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono, monospace)",
              color: "#ffd600",
              fontWeight: 700,
            }}
          >
            {plotType} • {variable}
          </span>
          <span
            style={{
              fontSize: "0.78rem",
              color: "#d6d6d0",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            DATE: {date} | FILE: {filename}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Zoom In */}
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="aero-btn aero-btn-outline"
            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            title="Zoom In"
          >
            <FaSearchPlus />
          </button>
          {/* Zoom Out */}
          <button
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            className="aero-btn aero-btn-outline"
            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            title="Zoom Out"
          >
            <FaSearchMinus />
          </button>
          {/* Reset Zoom */}
          <button
            onClick={() => setZoom(1)}
            className="aero-btn aero-btn-outline"
            style={{ padding: "6px 12px", fontSize: "0.75rem" }}
          >
            {Math.round(zoom * 100)}%
          </button>
          {/* Download */}
          <button
            onClick={handleDownload}
            className="aero-btn aero-btn-primary"
            style={{ padding: "6px 16px", fontSize: "0.8rem" }}
            title="Export High-Res PNG"
          >
            <FaDownload style={{ marginRight: "6px" }} /> EXPORT
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            className="aero-btn aero-btn-outline"
            style={{
              padding: "6px 12px",
              borderColor: "rgba(255, 214, 0, 0.4)",
              color: "#ffd600",
            }}
            title="Close Viewer (ESC)"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "1400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
          padding: "20px 0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "relative",
            transform: `scale(${zoom})`,
            transition: "transform 0.15s ease-out",
            transformOrigin: "center center",
            maxWidth: "100%",
            maxHeight: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Corner HUD Reticles */}
          <span className="hud-corner-bracket top-left" style={{ width: "16px", height: "16px" }} />
          <span className="hud-corner-bracket top-right" style={{ width: "16px", height: "16px" }} />
          <span className="hud-corner-bracket bottom-left" style={{ width: "16px", height: "16px" }} />
          <span className="hud-corner-bracket bottom-right" style={{ width: "16px", height: "16px" }} />

          <img
            src={imageUrl}
            alt="High Resolution Radar Plot"
            style={{
              maxWidth: "88vw",
              maxHeight: "75vh",
              objectFit: "contain",
              borderRadius: "4px",
              border: "1px solid rgba(255, 214, 0, 0.25)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.95)",
              backgroundColor: "#050505",
            }}
          />
        </div>
      </div>

      {/* Bottom Telemetry Footer */}
      <div
        style={{
          width: "100%",
          maxWidth: "1400px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
          background: "#0a0a0a",
          border: "1px solid rgba(255, 214, 0, 0.2)",
          borderRadius: "6px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.72rem",
          color: "#d6d6d0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          STATUS: <span style={{ color: "#ffd600" }}>IMAGE BUFFER LOADED (SCIENTIFIC OUTPUT)</span>
        </div>
        <div>
          MAHABALESHWAR OBSERVATORY (17.9237°N, 73.6586°E) • PRESS [ESC] TO CLOSE
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
