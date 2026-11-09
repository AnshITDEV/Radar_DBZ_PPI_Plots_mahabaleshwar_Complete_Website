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
        backgroundColor: "rgba(2, 4, 9, 0.94)",
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
          background: "rgba(10, 18, 38, 0.8)",
          border: "1px solid rgba(0, 240, 255, 0.25)",
          borderRadius: "8px",
          color: "#f0f6fc",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            className="telemetry-font"
            style={{
              color: "var(--aero-cyan, #00f0ff)",
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
              background: "rgba(0, 240, 255, 0.1)",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono, monospace)",
              color: "#38f4ff",
            }}
          >
            {plotType} • {variable}
          </span>
          <span
            style={{
              fontSize: "0.78rem",
              color: "#94a3b8",
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
              borderColor: "rgba(239, 68, 68, 0.4)",
              color: "#ef4444",
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
        <img
          src={imageUrl}
          alt={`Radar ${plotType} ${variable}`}
          style={{
            maxWidth: zoom === 1 ? "95%" : "none",
            maxHeight: zoom === 1 ? "85vh" : "none",
            transform: zoom !== 1 ? `scale(${zoom})` : "none",
            transition: "transform 0.2s ease-out",
            borderRadius: "8px",
            boxShadow: "0 0 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 240, 255, 0.25)",
            border: "1px solid rgba(0, 240, 255, 0.3)",
            backgroundColor: "#000000",
            imageRendering: "auto",
          }}
        />
      </div>

      {/* Footer Navigation Hint */}
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.75rem",
          color: "#64748b",
          textAlign: "center",
        }}
      >
        MAHABALESHWAR RADAR OBSERVATORY • PRESS [ESC] OR CLICK OUTSIDE TO CLOSE
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

