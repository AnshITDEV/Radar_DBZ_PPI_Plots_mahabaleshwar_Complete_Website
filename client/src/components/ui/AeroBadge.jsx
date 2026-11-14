import React from "react";

export default function AeroBadge({
  children,
  variant = "yellow", // yellow, online, amber, violet, white
  pulse = true,
  className = "",
  style = {},
}) {
  let badgeClass = "aero-badge-cyan";
  if (variant === "online" || variant === "yellow") badgeClass = "aero-badge-online";
  if (variant === "amber") badgeClass = "aero-badge-amber";
  if (variant === "violet") badgeClass = "aero-badge-violet";

  return (
    <span className={`aero-badge ${badgeClass} ${className}`} style={style}>
      {pulse && <span className="pulse-dot" />}
      <span>{children}</span>
    </span>
  );
}
