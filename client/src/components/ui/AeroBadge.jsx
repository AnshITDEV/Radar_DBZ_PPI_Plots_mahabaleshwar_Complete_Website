import React from "react";

export default function AeroBadge({
  children,
  variant = "cyan", // online, cyan, amber, violet
  pulse = true,
  className = "",
  style = {},
}) {
  let badgeClass = "aero-badge-cyan";
  if (variant === "online") badgeClass = "aero-badge-online";
  if (variant === "amber") badgeClass = "aero-badge-amber";

  return (
    <span className={`aero-badge ${badgeClass} ${className}`} style={style}>
      {pulse && <span className="pulse-dot" />}
      <span>{children}</span>
    </span>
  );
}

