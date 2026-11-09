import React, { useEffect, useRef } from "react";

export default function AtmosphericBackground({ triggerKey }) {
  const canvasRef = useRef(null);
  const sweepRef = useRef(null);

  // Briefly trigger an atmospheric radar beam sweep across the screen when triggerKey (active tab) changes
  useEffect(() => {
    if (!sweepRef.current) return;
    const sweep = sweepRef.current;
    sweep.classList.remove("sweep-active");
    // Force DOM reflow
    void sweep.offsetWidth;
    sweep.classList.add("sweep-active");
  }, [triggerKey]);

  // Subtle drifting atmospheric particles and cloud mist
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animId;
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 0.15 + Math.random() * 0.35, // slow downward drizzle drift
      size: 1 + Math.random() * 2,
      alpha: 0.08 + Math.random() * 0.22,
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;

        ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* Moving Atmospheric Cloud Shimmers */}
      <div className="atmospheric-cloud-layer cloud-layer-1" />
      <div className="atmospheric-cloud-layer cloud-layer-2" />

      {/* Particle Canvas Layer */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.7,
        }}
      />

      {/* Horizontal Radar Sweep Beam that triggers on tab change */}
      <div ref={sweepRef} className="radar-sweep-beam" />

      <style>{`
        .atmospheric-cloud-layer {
          position: absolute;
          inset: -50%;
          width: 200%;
          height: 200%;
          pointer-events: none;
          opacity: 0.04;
          background: radial-gradient(ellipse at 30% 40%, rgba(0, 240, 255, 0.4) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 60%, rgba(139, 92, 246, 0.3) 0%, transparent 55%);
        }

        .cloud-layer-1 {
          animation: cloudDrift1 60s ease-in-out infinite alternate;
        }

        .cloud-layer-2 {
          animation: cloudDrift2 80s ease-in-out infinite alternate;
          opacity: 0.03;
        }

        @keyframes cloudDrift1 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-5%, 4%) scale(1.05); }
        }

        @keyframes cloudDrift2 {
          0% { transform: translate(0, 0) scale(1.05); }
          100% { transform: translate(6%, -5%) scale(1); }
        }

        .radar-sweep-beam {
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(0, 240, 255, 0.02) 40%,
            rgba(0, 240, 255, 0.12) 90%,
            rgba(0, 240, 255, 0.35) 99%,
            transparent 100%
          );
          transform: skewX(-20deg);
          pointer-events: none;
          opacity: 0;
        }

        .radar-sweep-beam.sweep-active {
          animation: sweepScreen 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes sweepScreen {
          0% {
            left: -80%;
            opacity: 0.9;
          }
          70% {
            opacity: 0.6;
          }
          100% {
            left: 140%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

