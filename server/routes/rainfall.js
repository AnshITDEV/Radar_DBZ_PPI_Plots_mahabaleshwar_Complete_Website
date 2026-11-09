import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads (same as radar routes)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Get radar coverage and test coordinate calculation
router.post("/get-coverage", upload.single("file"), async (req, res) => {
  let tempFilePath = null;

  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    tempFilePath = file.path;

    const pythonProcess = spawn("python", [
      path.join(__dirname, "../rainfall_service.py"),
      file.path,
    ]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      // Clean up uploaded file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.warn("Could not delete uploaded file:", err.message);
        }
      }

      if (code === 0) {
        try {
          // Extract JSON from stdout (handle Py-ART banner)
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            res.json(result);
          } else {
            console.error("No JSON found in Python output:", stdout);
            res.status(500).json({
              error: "Failed to parse coverage data",
              details: "No valid JSON response from Python script",
            });
          }
        } catch (err) {
          console.error("Failed to parse Python output:", err);
          res.status(500).json({
            error: "Failed to parse coverage data",
            details: "Invalid JSON response from Python script",
          });
        }
      } else {
        console.error("Python script failed:", { code, stderr });
        res.status(500).json({
          error: "Failed to calculate radar coverage",
          details: stderr || stdout || "Unknown Python error",
        });
      }
    });
  } catch (error) {
    console.error("Error in get-coverage route:", error);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.warn("Could not delete uploaded file:", err.message);
      }
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// Calculate rainfall at a specific point
router.post("/point-rainfall", upload.single("file"), async (req, res) => {
  let tempFilePath = null;

  try {
    const { lat, lon, a, b } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    tempFilePath = file.path;

    const pythonProcess = spawn("python", [
      path.join(__dirname, "../point_rainfall_service.py"),
      file.path,
      lat,
      lon,
      a || "200",
      b || "1.6",
    ]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      // Clean up uploaded file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.warn("Could not delete uploaded file:", err.message);
        }
      }

      if (code === 0) {
        try {
          // Extract JSON from stdout (handle Py-ART banner)
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            res.json(result);
          } else {
            console.error("No JSON found in Python output:", stdout);
            res.status(500).json({
              error: "Failed to parse rainfall data",
              details: "No valid JSON response from Python script",
            });
          }
        } catch (err) {
          console.error("Failed to parse Python output:", err);
          res.status(500).json({
            error: "Failed to parse rainfall data",
            details: "Invalid JSON response from Python script",
          });
        }
      } else {
        console.error("Python script failed:", { code, stderr });
        res.status(500).json({
          error: "Failed to calculate rainfall",
          details: stderr || stdout || "Unknown Python error",
        });
      }
    });
  } catch (error) {
    console.error("Error in point-rainfall route:", error);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.warn("Could not delete uploaded file:", err.message);
      }
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// Get available variables (same as radar routes)
router.post("/get-variables", upload.single("file"), async (req, res) => {
  let tempFilePath = null;

  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    tempFilePath = file.path;

    const pythonProcess = spawn("python", [
      "-c",
      `
import pyart
import json
import sys

try:
    radar = pyart.io.read('${file.path.replace(/\\/g, "\\\\")}')
    variables = list(radar.fields.keys())
    # Filter for reflectivity fields
    reflectivity_fields = [v for v in variables if 'DBZ' in v or 'ZDR' in v]
    print(json.dumps({"variables": variables, "reflectivity_fields": reflectivity_fields}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
`,
    ]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      // Clean up uploaded file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.warn("Could not delete uploaded file:", err.message);
        }
      }

      if (code === 0) {
        try {
          // Extract JSON from stdout (handle Py-ART banner)
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            res.json(result);
          } else {
            console.error("No JSON found in Python output:", stdout);
            res.status(500).json({
              error: "Failed to parse coverage data",
              details: "No valid JSON response from Python script",
            });
          }
        } catch (err) {
          console.error("Failed to parse Python output:", err);
          res.status(500).json({
            error: "Failed to parse coverage data",
            details: "Invalid JSON response from Python script",
          });
        }
      } else {
        console.error("Python script failed:", { code, stderr });
        res.status(500).json({
          error: "Failed to calculate radar coverage",
          details: stderr || stdout || "Unknown Python error",
        });
      }
    });
  } catch (error) {
    console.error("Error in get-variables route:", error);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.warn("Could not delete uploaded file:", err.message);
      }
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
