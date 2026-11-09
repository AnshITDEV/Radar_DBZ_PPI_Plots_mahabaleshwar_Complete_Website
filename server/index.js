import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { spawn } from "child_process";
import rainfallRoutes from "./routes/rainfall.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// DB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
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

// Routes
app.use("/auth", authRoutes);
app.use("/api/rainfall", rainfallRoutes);

// ----------- Radar Data API -----------

// Path to radar data folder
const RADAR_DATA_DIR = path.join(process.cwd(), "radar_data");

// Get all available dates
app.get("/api/radar/dates", (req, res) => {
  try {
    const dates = fs
      .readdirSync(RADAR_DATA_DIR)
      .filter((file) =>
        fs.statSync(path.join(RADAR_DATA_DIR, file)).isDirectory()
      );
    res.json(dates.sort());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch radar dates" });
  }
});

// Get all files for a specific date
app.get("/api/radar/files/:date", (req, res) => {
  try {
    const dateFolder = path.join(RADAR_DATA_DIR, req.params.date);
    if (!fs.existsSync(dateFolder)) {
      return res.status(404).json({ error: "Date not found" });
    }

    const files = fs
      .readdirSync(dateFolder)
      .filter((file) => file.endsWith(".nc"));

    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch files for date" });
  }
});

// Serve a specific radar file
app.get("/api/radar/file/:date/:filename", (req, res) => {
  const filePath = path.join(
    RADAR_DATA_DIR,
    req.params.date,
    req.params.filename
  );
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.sendFile(filePath);
});

// ✅ Serve pre-generated radar plot images
app.get("/api/radar/plot/:date/:file/:plotType/:variable", (req, res) => {
  try {
    const { date, file, plotType, variable } = req.params;

    console.log("📥 Received plot request:", {
      date,
      file,
      plotType,
      variable,
    });

    // Remove .nc extension if present
    const baseFile = file.replace(/\.nc$/, "");

    // Construct the image filename based on your actual file structure
    const imageName = `${baseFile}_${plotType}_${variable}.png`;
    const imagePath = path.join(RADAR_DATA_DIR, date, imageName);

    console.log("🔍 Looking for image at:", imagePath);

    if (fs.existsSync(imagePath)) {
      console.log("✅ Image found, sending file");
      res.setHeader("Content-Type", "image/png");
      return res.sendFile(imagePath);
    } else {
      console.error("❌ Image not found:", imagePath);

      // Debug: list available files in the directory
      const dirPath = path.join(RADAR_DATA_DIR, date);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        console.log("📁 Available files in directory:", files);
      }

      return res.status(404).json({
        error: "Plot image not found",
        requested: imageName,
        path: imagePath,
      });
    }
  } catch (error) {
    console.error("🚨 Server error in plot route:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ NEW: Generate plot from uploaded file
app.post(
  "/api/radar/generate-plot",
  upload.single("file"),
  async (req, res) => {
    try {
      const { plotType, variable } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!plotType || !variable) {
        return res.status(400).json({ error: "Missing plotType or variable" });
      }

      console.log("🔄 Generating plot for:", {
        filename: file.originalname,
        plotType,
        variable,
      });

      // Create temporary output file
      const outputDir = path.join(__dirname, "generated_plots");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFileName = `plot-${Date.now()}.png`;
      const outputPath = path.join(outputDir, outputFileName);

      // Call Python script to generate plot
      const pythonProcess = spawn("python", [
        path.join(__dirname, "plot_service.py"),
        file.path,
        plotType,
        variable,
        outputPath,
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
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.warn("Could not delete uploaded file:", err.message);
        }

        if (code === 0 && fs.existsSync(outputPath)) {
          console.log("✅ Plot generated successfully");

          // Send the generated image
          res.setHeader("Content-Type", "image/png");
          res.sendFile(outputPath, (err) => {
            // Clean up generated plot after sending
            try {
              fs.unlinkSync(outputPath);
            } catch (err) {
              console.warn("Could not delete generated plot:", err.message);
            }

            if (err) {
              console.error("Error sending file:", err);
            }
          });
        } else {
          console.error("❌ Plot generation failed:", { code, stdout, stderr });

          // Clean up output file if it exists
          try {
            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
          } catch (err) {
            console.warn("Could not delete output file:", err.message);
          }

          res.status(500).json({
            error: "Plot generation failed",
            details: stderr || stdout || "Unknown error",
          });
        }
      });
    } catch (error) {
      console.error("🚨 Error in generate-plot route:", error);

      // Clean up uploaded file if it exists
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.warn("Could not delete uploaded file:", err.message);
        }
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post(
  "/api/radar/get-variables",
  upload.single("file"),
  async (req, res) => {
    let tempFilePath = null;

    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      tempFilePath = file.path;

      console.log("🔄 Loading variables from file:", file.originalname);

      // Use dedicated Python script
      const pythonProcess = spawn("python", [
        path.join(__dirname, "get_variables.py"),
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
            // Extract JSON from stdout (handle pyART banner)
            const jsonMatch = stdout.match(/\{.*\}/s);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              if (result.success) {
                console.log(
                  "✅ Variables loaded successfully:",
                  result.variables
                );
                res.json({ variables: result.variables });
              } else {
                console.error("❌ Python error:", result.error);
                res.status(500).json({
                  error: "Failed to read variables from file",
                  details: result.error,
                });
              }
            } else {
              console.error("❌ No JSON found in output:", stdout);
              res.status(500).json({
                error: "Failed to parse variables from file",
                details: "No valid JSON response from Python script",
              });
            }
          } catch (err) {
            console.error("❌ Failed to parse Python output:", err.message);
            console.error("❌ Raw stdout:", stdout);
            res.status(500).json({
              error: "Failed to parse variables from file",
              details: "Invalid JSON response from Python script",
            });
          }
        } else {
          console.error("❌ Python script failed:", { code, stderr });
          res.status(500).json({
            error: "Failed to read variables from file",
            details: stderr || "Unknown Python error",
          });
        }
      });
    } catch (error) {
      console.error("🚨 Error in get-variables route:", error);

      // Clean up uploaded file if it exists
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.warn("Could not delete uploaded file:", err.message);
        }
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ----------- Start Server -----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, "uploads")}`);
  console.log(`📊 Plot service: ${path.join(__dirname, "plot_service.py")}`);
});
