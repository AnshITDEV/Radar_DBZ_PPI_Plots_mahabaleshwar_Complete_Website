import React, { useState, useEffect } from "react";
import { FaVolumeUp, FaVolumeMute, FaCloudRain } from "react-icons/fa";
import { rainAudio } from "../utils/audioEngine";

export default function SoundControl() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const savedVol = localStorage.getItem("aeroscope_audio_volume");
    if (savedVol) {
      setVolume(parseFloat(savedVol));
    }
  }, []);

  const handleToggle = () => {
    const active = rainAudio.toggle();
    setIsPlaying(active);
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    rainAudio.setVolume(newVol);
    if (!isPlaying && newVol > 0) {
      rainAudio.start();
      setIsPlaying(true);
    }
  };

  return (
    <div
      className="sound-control-wrapper"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <div
        className="sound-control-capsule"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(10, 18, 38, 0.85)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${
            isPlaying ? "rgba(0, 240, 255, 0.45)" : "rgba(255, 255, 255, 0.12)"
          }`,
          borderRadius: "9999px",
          padding: "6px 14px",
          boxShadow: isPlaying
            ? "0 0 16px rgba(0, 240, 255, 0.25)"
            : "0 2px 10px rgba(0,0,0,0.4)",
          transition: "all 0.3s ease",
          cursor: "pointer",
        }}
        onClick={(e) => {
          // If clicked directly on the capsule (not the slider), toggle mute/play
          if (e.target.tagName !== "INPUT") {
            handleToggle();
          }
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        title={isPlaying ? "Atmospheric Rain Sound: Active" : "Click to Enable Rain Ambience"}
      >
        <span
          style={{
            color: isPlaying ? "var(--aero-cyan, #00f0ff)" : "#94a3b8",
            display: "flex",
            alignItems: "center",
            fontSize: "0.9rem",
            transition: "color 0.2s",
          }}
        >
          <FaCloudRain style={{ marginRight: "4px" }} />
          {isPlaying ? <FaVolumeUp /> : <FaVolumeMute />}
        </span>

        {/* Audio Equalizer bars animation when playing */}
        {isPlaying ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "2px",
              height: "12px",
              padding: "0 2px",
            }}
          >
            <span className="eq-bar eq-bar-1" />
            <span className="eq-bar eq-bar-2" />
            <span className="eq-bar eq-bar-3" />
            <span className="eq-bar eq-bar-4" />
          </div>
        ) : (
          <span
            style={{
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono, monospace)",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Rain Ambience
          </span>
        )}

        {/* Expandable slider */}
        {isExpanded && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: "6px",
              animation: "fadeIn 0.2s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isPlaying ? volume : 0}
              onChange={handleVolumeChange}
              style={{
                width: "60px",
                height: "4px",
                accentColor: "var(--aero-cyan, #00f0ff)",
                cursor: "pointer",
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        .eq-bar {
          width: 2px;
          background-color: var(--aero-cyan, #00f0ff);
          border-radius: 1px;
          animation: eqBounce 1.2s ease-in-out infinite alternate;
        }
        .eq-bar-1 { height: 4px; animation-delay: 0.1s; }
        .eq-bar-2 { height: 10px; animation-delay: 0.3s; }
        .eq-bar-3 { height: 7px; animation-delay: 0.15s; }
        .eq-bar-4 { height: 11px; animation-delay: 0.4s; }

        @keyframes eqBounce {
          0% { height: 3px; opacity: 0.5; }
          100% { height: 12px; opacity: 1; box-shadow: 0 0 6px rgba(0, 240, 255, 0.8); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scaleX(0.8); }
          to { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}

