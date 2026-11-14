import React from "react";

export default function AeroCard({
  children,
  title,
  subtitle,
  badge,
  cutCorner = true,
  className = "",
  style = {},
  headerAction = null,
}) {
  return (
    <div
      className={`aero-panel ${cutCorner ? "aero-panel-cut" : ""} ${className}`}
      style={{
        padding: "24px",
        borderRadius: cutCorner ? "0px" : "12px",
        ...style,
      }}
    >
      {/* HUD Corner Brackets */}
      <span className="hud-corner-bracket top-left" />
      <span className="hud-corner-bracket top-right" />
      <span className="hud-corner-bracket bottom-left" />
      <span className="hud-corner-bracket bottom-right" />

      {(title || subtitle || badge || headerAction) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "18px",
            borderBottom: "1px solid var(--aero-border-subtle, rgba(255, 214, 0, 0.16))",
            paddingBottom: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {title && (
                <h3
                  className="display-font"
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--aero-text-primary, #f0f6fc)",
                  }}
                >
                  {title}
                </h3>
              )}
              {badge && badge}
            </div>
            {subtitle && (
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "0.8rem",
                  color: "var(--aero-text-secondary, #94a3b8)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      {children}
    </div>
  );
}

