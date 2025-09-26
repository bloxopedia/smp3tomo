import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversionJobSchema } from "@shared/schema";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs-extra";
import { randomUUID } from "crypto";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "audio/mp3" || file.mimetype === "audio/mpeg" || path.extname(file.originalname).toLowerCase() === ".mp3") {
      cb(null, true);
    } else {
      cb(new Error("Only MP3 files are allowed"));
    }
  },
});

// Ensure directories exist
const uploadsDir = path.resolve("uploads");
const outputDir = path.resolve("outputs");
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(outputDir);

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all conversion jobs
  app.get("/api/conversions", async (req, res) => {
    try {
      const jobs = await storage.getAllConversionJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversion jobs" });
    }
  });

  // Upload and start conversion
  app.post("/api/conversions", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { quality = 128, sampleRate = 44100 } = req.body;

      // Get audio duration using ffmpeg
      const getDuration = (): Promise<string> => {
        return new Promise((resolve, reject) => {
          ffmpeg.ffprobe(req.file!.path, (err, metadata) => {
            if (err) reject(err);
            else {
              const duration = metadata.format.duration || 0;
              const minutes = Math.floor(duration / 60);
              const seconds = Math.floor(duration % 60);
              resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
          });
        });
      };

      let duration = "0:00";
      try {
        duration = await getDuration();
      } catch (error) {
        console.warn("Could not get audio duration:", error);
      }

      // Create conversion job
      const job = await storage.createConversionJob({
        filename: req.file.originalname,
        originalSize: req.file.size,
        duration,
        status: "processing",
        progress: 0,
        quality: parseInt(quality),
        sampleRate: parseInt(sampleRate),
        convertedSize: null,
        errorMessage: null,
      });

      res.json(job);

      // Start conversion in background
      convertFile(req.file.path, req.file.originalname, job.id, parseInt(quality), parseInt(sampleRate));

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Download converted file
  app.get("/api/conversions/:id/download", async (req, res) => {
    try {
      const job = await storage.getConversionJob(req.params.id);
      if (!job || job.status !== "completed") {
        return res.status(404).json({ message: "File not found or conversion not completed" });
      }

      const outputFilename = job.filename.replace(/\.mp3$/i, ".ogg");
      const outputPath = path.join(outputDir, `${job.id}.ogg`);

      if (!fs.existsSync(outputPath)) {
        return res.status(404).json({ message: "Converted file not found" });
      }

      res.setHeader("Content-Disposition", `attachment; filename="${outputFilename}"`);
      res.setHeader("Content-Type", "audio/ogg");
      
      const fileStream = fs.createReadStream(outputPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Delete conversion job
  app.delete("/api/conversions/:id", async (req, res) => {
    try {
      const job = await storage.getConversionJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Conversion job not found" });
      }

      // Clean up files
      const outputPath = path.join(outputDir, `${job.id}.ogg`);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      const deleted = await storage.deleteConversionJob(req.params.id);
      if (deleted) {
        res.json({ message: "Conversion job deleted" });
      } else {
        res.status(404).json({ message: "Conversion job not found" });
      }
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Failed to delete conversion job" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Background conversion function
async function convertFile(inputPath: string, originalFilename: string, jobId: string, quality: number, sampleRate: number) {
  try {
    const outputPath = path.join(outputDir, `${jobId}.ogg`);
    
    await storage.updateConversionJob(jobId, { status: "processing", progress: 10 });

    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioChannels(1) // Convert to mono
        .audioBitrate(quality)
        .audioFrequency(sampleRate)
        .format("ogg")
        .on("progress", async (progress) => {
          const percent = Math.round(progress.percent || 0);
          await storage.updateConversionJob(jobId, { progress: Math.min(percent, 95) });
        })
        .on("end", async () => {
          try {
            const stats = fs.statSync(outputPath);
            await storage.updateConversionJob(jobId, {
              status: "completed",
              progress: 100,
              convertedSize: stats.size,
              completedAt: new Date(),
            });
            
            // Clean up input file
            fs.unlinkSync(inputPath);
            resolve();
          } catch (error) {
            console.error("Error updating job on completion:", error);
            reject(error);
          }
        })
        .on("error", async (err) => {
          console.error("FFmpeg error:", err);
          await storage.updateConversionJob(jobId, {
            status: "failed",
            errorMessage: err.message,
          });
          
          // Clean up input file
          if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
          }
          reject(err);
        })
        .save(outputPath);
    });
  } catch (error) {
    console.error("Conversion error:", error);
    await storage.updateConversionJob(jobId, {
      status: "failed",
      errorMessage: "Conversion failed",
    });
    
    // Clean up input file
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
  }
}
