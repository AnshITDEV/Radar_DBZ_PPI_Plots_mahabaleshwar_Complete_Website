import React from "react";

export default function AeroButton({
  children,
  variant = "primary", // primary, outline, ghost, capsule
  onClick,
  disabled = false,
  loading = false,
  icon = null,
  type = "button",
  className = "",
  style = {},
}) {
  let variantClass = "aero-btn-primary";
  if (variant === "outline") variantClass = "aero-btn-outline";
  if (variant === "capsule") variantClass = "aero-btn-primary aero-btn-capsule";
  if (variant === "ghost") variantClass = "aero-btn-outline aero-btn-capsule";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`aero-btn ${variantClass} ${className}`}
      style={style}
    >
      {/* Corner laser notch */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "6px",
          height: "6px",
          borderTop: "2px solid rgba(255, 255, 255, 0.7)",
          borderLeft: "2px solid rgba(255, 255, 255, 0.7)",
          pointerEvents: "none",
        }}
      />
      {loading ? (
        <span
          style={{
            display: "inline-block",
            width: "14px",
            height: "14px",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      ) : (
        icon && <span style={{ display: "inline-flex", fontSize: "1rem" }}>{icon}</span>
      )}
      <span>{children}</span>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}

