import React, { useEffect, useRef } from "react";

export default function RadarCockpitCanvas({
  width = 520,
  height = 520,
  interactive = true,
}) {
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let angle = 0;

    // Simulated storm/reflectivity cells near Mahabaleshwar
    const cells = [
      { r: 70, theta: 0.8, size: 28, dbz: 48 }, // Red/Orange heavy core
      { r: 90, theta: 0.85, size: 45, dbz: 38 }, // Yellow
      { r: 120, theta: 1.1, size: 55, dbz: 28 }, // Green
      { r: 145, theta: 2.3, size: 36, dbz: 32 }, // Yellow
      { r: 180, theta: 2.4, size: 60, dbz: 22 }, // Light green
      { r: 110, theta: 3.9, size: 40, dbz: 42 }, // Amber/Orange
      { r: 160, theta: 4.8, size: 50, dbz: 25 }, // Green
      { r: 80, theta: 5.6, size: 32, dbz: 35 }, // Yellow
    ];

    // Atmospheric floating blips/particles
    const particles = Array.from({ length: 40 }, () => ({
      r: 30 + Math.random() * 200,
      theta: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.004,
      size: 1 + Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.5,
    }));

    // Color mapper for dBZ values
    const getDbzColor = (dbz, alpha = 1) => {
      if (dbz >= 45) return `rgba(239, 68, 68, ${alpha})`; // Red
      if (dbz >= 35) return `rgba(249, 115, 22, ${alpha})`; // Orange
      if (dbz >= 25) return `rgba(234, 179, 8, ${alpha})`; // Yellow
      if (dbz >= 15) return `rgba(34, 197, 94, ${alpha})`; // Green
      return `rgba(6, 182, 212, ${alpha})`; // Cyan
    };

    const render = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxR = Math.min(cx, cy) - 20;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Radar Scope Background
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      bgGrad.addColorStop(0, "rgba(8, 16, 36, 0.95)");
      bgGrad.addColorStop(0.7, "rgba(5, 10, 24, 0.95)");
      bgGrad.addColorStop(1, "rgba(2, 5, 14, 0.98)");
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Range Rings (50, 100, 150, 200, 250 km)
      const ringCount = 5;
      for (let i = 1; i <= ringCount; i++) {
        const r = (maxR / ringCount) * i;
        ctx.strokeStyle = i === ringCount ? "rgba(0, 240, 255, 0.35)" : "rgba(0, 240, 255, 0.12)";
        ctx.lineWidth = i === ringCount ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Distance markings on 0° axis
        ctx.fillStyle = "rgba(0, 240, 255, 0.5)";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText(`${i * 50}km`, cx + 4, cy - r + 11);
      }

      // Radial Azimuth Lines (every 30 degrees)
      for (let deg = 0; deg < 360; deg += 30) {
        const rad = (deg * Math.PI) / 180;
        const x2 = cx + Math.cos(rad) * maxR;
        const y2 = cy + Math.sin(rad) * maxR;

        ctx.strokeStyle = deg % 90 === 0 ? "rgba(0, 240, 255, 0.28)" : "rgba(0, 240, 255, 0.08)";
        ctx.lineWidth = deg % 90 === 0 ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Degree Labels at boundary
        if (deg % 45 === 0) {
          const labelRad = ((deg - 90) * Math.PI) / 180;
          const lx = cx + Math.cos(labelRad) * (maxR + 12);
          const ly = cy + Math.sin(labelRad) * (maxR + 12);
          ctx.fillStyle = "rgba(0, 240, 255, 0.75)";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const degStr = deg.toString().padStart(3, "0") + "°";
          ctx.fillText(degStr, lx, ly);
        }
      }

      // Simulated Reflectivity Precipitation Cells
      cells.forEach((cell) => {
        // Calculate cell center
        const cellX = cx + Math.cos(cell.theta) * ((cell.r / 250) * maxR);
        const cellY = cy + Math.sin(cell.theta) * ((cell.r / 250) * maxR);

        // Calculate angular difference to sweep beam
        let diff = (angle - cell.theta) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;

        // Phosphor decay: bright when beam just passed, fades as beam sweeps away
        const phosphor = Math.max(0.12, 1 - diff / (Math.PI * 1.5));

        const cellGrad = ctx.createRadialGradient(
          cellX,
          cellY,
          0,
          cellX,
          cellY,
          cell.size
        );
        cellGrad.addColorStop(0, getDbzColor(cell.dbz, 0.85 * phosphor));
        cellGrad.addColorStop(0.6, getDbzColor(cell.dbz - 10, 0.45 * phosphor));
        cellGrad.addColorStop(1, "rgba(0, 240, 255, 0)");

        ctx.fillStyle = cellGrad;
        ctx.beginPath();
        ctx.arc(cellX, cellY, cell.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Atmospheric particles / droplet echoes
      particles.forEach((p) => {
        p.theta += p.speed;
        const px = cx + Math.cos(p.theta) * ((p.r / 250) * maxR);
        const py = cy + Math.sin(p.theta) * ((p.r / 250) * maxR);

        let diff = (angle - p.theta) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        const pGlow = Math.max(0.15, 1 - diff / (Math.PI * 1.2));

        ctx.fillStyle = `rgba(0, 255, 157, ${p.opacity * pGlow})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Radar Sweep Wedge (fading trailing beam)
      const wedgeAngle = Math.PI / 4; // 45 degree fade trail
      const sweepGrad = ctx.createConicGradient(angle - wedgeAngle, cx, cy);
      sweepGrad.addColorStop(0, "rgba(0, 240, 255, 0)");
      sweepGrad.addColorStop(0.85, "rgba(0, 240, 255, 0.08)");
      sweepGrad.addColorStop(0.98, "rgba(0, 240, 255, 0.28)");
      sweepGrad.addColorStop(1, "rgba(0, 240, 255, 0.75)");

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, angle - wedgeAngle, angle);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      // Sharp Leading Beam Line
      const beamX = cx + Math.cos(angle) * maxR;
      const beamY = cy + Math.sin(angle) * maxR;
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(beamX, beamY);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      // Center Origin Crosshairs & Radar Station Marker
      ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      // Center glowing core dot
      ctx.fillStyle = "#00f0ff";
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Outer bezel ring with glowing cyan border
      ctx.strokeStyle = "rgba(0, 240, 255, 0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.stroke();

      // Advance scan angle (~3.2 seconds per 360 rotation)
      angle += 0.024;
      if (angle >= Math.PI * 2) angle -= Math.PI * 2;

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          filter: "drop-shadow(0 0 25px rgba(0, 240, 255, 0.22))",
        }}
      />
    </div>
  );
}

