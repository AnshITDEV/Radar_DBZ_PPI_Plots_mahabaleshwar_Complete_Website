import React, { useState, useEffect, useRef } from "react";

export default function CinematicStartup({ onComplete, forceRun = false }) {
  const [stage, setStage] = useState(1); // 1: Dark/Pulse, 2: Radar Activate, 3: Init Telemetry, 4: Expansion Flash, 5: Done
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("SYSTEM POWER: LOW");
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Check sessionStorage and prefers-reduced-motion
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const hasSeenStartup = sessionStorage.getItem("aeroscope_startup_completed");

    if ((hasSeenStartup && !forceRun) || prefersReducedMotion) {
      if (onComplete) onComplete();
      return;
    }

    // Sequence Choreography (~4.8 seconds total)
    const timer1 = setTimeout(() => {
      setStage(2);
      setStatusText("RADAR ARRAY INITIALIZING...");
    }, 800);

    const timer2 = setTimeout(() => {
      setStage(3);
    }, 2200);

    // Progress counter for Stage 3
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 45);

    // Dynamic telemetry status messages in yellow/white theme
    const textTimers = [
      setTimeout(() => setStatusText("ATMOSPHERIC SCAN SYSTEM: ONLINE"), 2400),
      setTimeout(() => setStatusText("DOPPLER DATA INTERFACE: LOCKED"), 2900),
      setTimeout(() => setStatusText("REFLECTIVITY ENGINE (Z/ZDR/KDP): CALIBRATED"), 3400),
      setTimeout(() => setStatusText("PPI / RHI DUAL-POL VISUALIZATION: READY"), 3900),
      setTimeout(() => setStatusText("AEROSCOPE SYSTEM READY"), 4300),
    ];

    const timer3 = setTimeout(() => {
      setStage(4);
    }, 4100);

    const timer4 = setTimeout(() => {
      sessionStorage.setItem("aeroscope_startup_completed", "true");
      setStage(5);
      if (onComplete) onComplete();
    }, 4800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearInterval(progressInterval);
      textTimers.forEach((t) => clearTimeout(t));
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [forceRun, onComplete]);

  // Canvas visual effects for rings and energy particles (Yellow, Gold & White palette)
  useEffect(() => {
    if (stage < 2 || stage >= 5) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let angle = 0;
    const particles = Array.from({ length: 65 }, () => ({
      x: (Math.random() - 0.5) * window.innerWidth,
      y: (Math.random() - 0.5) * window.innerHeight,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      radius: Math.random() * 2 + 1,
      color: ["#ffd600", "#ffe600", "#ffc400", "#fff2a6", "#ffffff"][
        Math.floor(Math.random() * 5)
      ],
      alpha: 0.2 + Math.random() * 0.7,
    }));

    const render = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw floating luminous golden particles & energy trails
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(cx + p.x, cy + p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle golden energy line connections
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.moveTo(cx + p.x, cy + p.y);
        ctx.lineTo(cx + p.x - p.vx * 15, cy + p.y - p.vy * 15);
        ctx.stroke();
      });

      ctx.globalAlpha = 1.0;

      // Sweeping radar beam in center (Electric Yellow)
      const maxR = Math.min(cx, cy) * 0.75;
      const sweepGrad = ctx.createConicGradient(angle - Math.PI / 4, cx, cy);
      sweepGrad.addColorStop(0, "rgba(255, 214, 0, 0)");
      sweepGrad.addColorStop(0.85, "rgba(255, 214, 0, 0.06)");
      sweepGrad.addColorStop(1, "rgba(255, 230, 0, 0.55)");

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, angle - Math.PI / 4, angle);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Sharp golden-yellow beam line
      ctx.strokeStyle = "#ffd600";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ffd600";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();
      ctx.restore();

      angle += 0.04;
      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [stage]);

  const handleSkip = () => {
    sessionStorage.setItem("aeroscope_startup_completed", "true");
    setStage(5);
    if (onComplete) onComplete();
  };

  if (stage >= 5) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000000",
        zIndex: 100000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: stage === 4 ? 0 : 1,
        pointerEvents: stage === 4 ? "none" : "all",
      }}
    >
      {/* Skip Button */}
      <button
        onClick={handleSkip}
        className="aero-btn aero-btn-capsule"
        style={{
          position: "absolute",
          top: "24px",
          right: "24px",
          zIndex: 100002,
          background: "#0a0a0a",
          color: "#ffd600",
          border: "1px solid rgba(255, 214, 0, 0.4)",
          fontSize: "0.75rem",
          cursor: "pointer",
        }}
      >
        SKIP CALIBRATION ⇥
      </button>

      {/* Atmospheric Canvas Layer */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth || 1920}
        height={window.innerHeight || 1080}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* Center Radar Rings & Reticle */}
      <div
        style={{
          position: "relative",
          width: "480px",
          height: "480px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Core pulsing electric yellow dot (Stage 1) */}
        <div
          style={{
            position: "absolute",
            width: stage >= 2 ? "12px" : "8px",
            height: stage >= 2 ? "12px" : "8px",
            borderRadius: "50%",
            backgroundColor: "#ffd600",
            boxShadow: "0 0 25px #ffd600, 0 0 50px rgba(255, 214, 0, 0.85)",
            transition: "all 0.5s ease",
            animation: "pulse-yellow 1s infinite alternate",
            zIndex: 10,
          }}
        />

        {/* Concentric Expanding Radar Rings (Stage 2+) */}
        {stage >= 2 && (
          <>
            <div className="radar-ring ring-1" />
            <div className="radar-ring ring-2" />
            <div className="radar-ring ring-3" />
            <div className="radar-ring ring-4" />
          </>
        )}

        {/* Circular Progress Gauge (Stage 3+) */}
        {stage >= 3 && (
          <svg
            style={{
              position: "absolute",
              width: "360px",
              height: "360px",
              transform: "rotate(-90deg)",
              pointerEvents: "none",
            }}
          >
            <circle
              cx="180"
              cy="180"
              r="165"
              fill="none"
              stroke="rgba(255, 214, 0, 0.15)"
              strokeWidth="3"
            />
            <circle
              cx="180"
              cy="180"
              r="165"
              fill="none"
              stroke="#ffd600"
              strokeWidth="3"
              strokeDasharray={2 * Math.PI * 165}
              strokeDashoffset={2 * Math.PI * 165 * (1 - progress / 100)}
              style={{
                transition: "stroke-dashoffset 0.05s linear",
                filter: "drop-shadow(0 0 10px rgba(255, 214, 0, 0.85))",
              }}
            />
          </svg>
        )}

        {/* Stage 4 Expansion Flash Ring */}
        {stage === 4 && <div className="flash-expansion-ring" />}
      </div>

      {/* Telemetry Readout Console */}
      <div
        style={{
          marginTop: "30px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          zIndex: 100001,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display, 'Chakra Petch', sans-serif)",
            fontSize: "1.4rem",
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: "#ffffff",
            textTransform: "uppercase",
            textShadow: "0 0 20px rgba(255, 214, 0, 0.65)",
          }}
        >
          AEROSCOPE
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "0.78rem",
            letterSpacing: "0.15em",
            color: "var(--aero-yellow, #ffd600)",
            textTransform: "uppercase",
          }}
        >
          MAHABALESHWAR RADAR INTELLIGENCE SYSTEM
        </div>

        {/* Animated Status Message */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "8px",
            padding: "6px 18px",
            background: "#0a0a0a",
            border: "1px solid rgba(255, 214, 0, 0.35)",
            borderRadius: "4px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "0.75rem",
            color: "#ffd600",
            letterSpacing: "0.08em",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#ffd600",
              boxShadow: "0 0 10px #ffd600",
            }}
          />
          {statusText}
          {stage >= 3 && (
            <span style={{ color: "#ffffff", fontWeight: 700 }}>
              [{progress}%]
            </span>
          )}
        </div>

        {/* Station Telemetry Footer Coordinates */}
        <div
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "0.68rem",
            color: "#d6d6d0",
            letterSpacing: "0.1em",
            marginTop: "10px",
          }}
        >
          LAT 17.9237° N • LON 73.6586° E • ALT 1353M • DWR S-BAND 2.8 GHZ
        </div>
      </div>

      <style>{`
        .radar-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255, 214, 0, 0.28);
          animation: ringPulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .ring-1 { width: 100px; height: 100px; animation-delay: 0s; }
        .ring-2 { width: 180px; height: 180px; animation-delay: 0.3s; }
        .ring-3 { width: 260px; height: 260px; animation-delay: 0.6s; }
        .ring-4 { width: 340px; height: 340px; animation-delay: 0.9s; }

        @keyframes ringPulse {
          0% {
            transform: scale(0.6);
            opacity: 0;
            border-color: rgba(255, 214, 0, 0.7);
          }
          50% {
            opacity: 0.85;
          }
          100% {
            transform: scale(1.15);
            opacity: 0;
            border-color: rgba(255, 196, 0, 0.25);
          }
        }

        .flash-expansion-ring {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 230, 0, 0.95) 0%, rgba(255, 196, 0, 0.5) 40%, transparent 80%);
          animation: flashExpand 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes flashExpand {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(100);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
