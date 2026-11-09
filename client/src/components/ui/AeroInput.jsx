import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function AeroInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
  error = "",
  icon = null,
  name,
  autoComplete,
  className = "",
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`aero-input-wrapper ${className}`}>
      {label && (
        <label className="aero-label">
          <span>{label}</span>
          {required && (
            <span style={{ color: "var(--aero-cyan, #00f0ff)", fontSize: "0.68rem" }}>
              *REQ
            </span>
          )}
        </label>
      )}

      <div className="aero-input-container">
        <input
          type={actualType}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="aero-input"
          style={{
            paddingRight: isPassword || icon ? "40px" : "16px",
            borderColor: error ? "var(--aero-red, #ef4444)" : undefined,
          }}
        />

        {isPassword ? (
          <span
            className="aero-input-icon"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        ) : (
          icon && <span className="aero-input-icon">{icon}</span>
        )}
      </div>

      {error && (
        <span
          style={{
            color: "var(--aero-red, #ef4444)",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono, monospace)",
            marginTop: "2px",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

