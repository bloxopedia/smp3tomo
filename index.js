// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  conversionJobs;
  constructor() {
    this.conversionJobs = /* @__PURE__ */ new Map();
  }
  async createConversionJob(insertJob) {
    const id = randomUUID();
    const job = {
      filename: insertJob.filename,
      originalSize: insertJob.originalSize,
      convertedSize: insertJob.convertedSize || null,
      duration: insertJob.duration || null,
      status: insertJob.status || "pending",
      progress: insertJob.progress || 0,
      errorMessage: insertJob.errorMessage || null,
      quality: insertJob.quality || 128,
      sampleRate: insertJob.sampleRate || 44100,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      completedAt: null
    };
    this.conversionJobs.set(id, job);
    return job;
  }
  async getConversionJob(id) {
    return this.conversionJobs.get(id);
  }
  async updateConversionJob(id, updates) {
    const job = this.conversionJobs.get(id);
    if (!job) return void 0;
    const updatedJob = { ...job, ...updates };
    this.conversionJobs.set(id, updatedJob);
    return updatedJob;
  }
  async getAllConversionJobs() {
    return Array.from(this.conversionJobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
  async deleteConversionJob(id) {
    return this.conversionJobs.delete(id);
  }
};
var storage = new MemStorage();

// server/routes.ts
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs-extra";
var upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024
    // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "audio/mp3" || file.mimetype === "audio/mpeg" || path.extname(file.originalname).toLowerCase() === ".mp3") {
      cb(null, true);
    } else {
      cb(new Error("Only MP3 files are allowed"));
    }
  }
});
var uploadsDir = path.resolve("uploads");
var outputDir = path.resolve("outputs");
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(outputDir);
async function registerRoutes(app2) {
  app2.get("/api/conversions", async (req, res) => {
    try {
      const jobs = await storage.getAllConversionJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversion jobs" });
    }
  });
  app2.post("/api/conversions", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const { quality = 128, sampleRate = 44100 } = req.body;
      const getDuration = () => {
        return new Promise((resolve, reject) => {
          ffmpeg.ffprobe(req.file.path, (err, metadata) => {
            if (err) reject(err);
            else {
              const duration2 = metadata.format.duration || 0;
              const minutes = Math.floor(duration2 / 60);
              const seconds = Math.floor(duration2 % 60);
              resolve(`${minutes}:${seconds.toString().padStart(2, "0")}`);
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
      const job = await storage.createConversionJob({
        filename: req.file.originalname,
        originalSize: req.file.size,
        duration,
        status: "processing",
        progress: 0,
        quality: parseInt(quality),
        sampleRate: parseInt(sampleRate),
        convertedSize: null,
        errorMessage: null
      });
      res.json(job);
      convertFile(req.file.path, req.file.originalname, job.id, parseInt(quality), parseInt(sampleRate));
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });
  app2.get("/api/conversions/:id/download", async (req, res) => {
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
  app2.delete("/api/conversions/:id", async (req, res) => {
    try {
      const job = await storage.getConversionJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Conversion job not found" });
      }
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
  const httpServer = createServer(app2);
  return httpServer;
}
async function convertFile(inputPath, originalFilename, jobId, quality, sampleRate) {
  try {
    const outputPath = path.join(outputDir, `${jobId}.ogg`);
    await storage.updateConversionJob(jobId, { status: "processing", progress: 10 });
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath).audioChannels(1).audioBitrate(quality).audioFrequency(sampleRate).format("ogg").on("progress", async (progress) => {
        const percent = Math.round(progress.percent || 0);
        await storage.updateConversionJob(jobId, { progress: Math.min(percent, 95) });
      }).on("end", async () => {
        try {
          const stats = fs.statSync(outputPath);
          await storage.updateConversionJob(jobId, {
            status: "completed",
            progress: 100,
            convertedSize: stats.size,
            completedAt: /* @__PURE__ */ new Date()
          });
          fs.unlinkSync(inputPath);
          resolve();
        } catch (error) {
          console.error("Error updating job on completion:", error);
          reject(error);
        }
      }).on("error", async (err) => {
        console.error("FFmpeg error:", err);
        await storage.updateConversionJob(jobId, {
          status: "failed",
          errorMessage: err.message
        });
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
        reject(err);
      }).save(outputPath);
    });
  } catch (error) {
    console.error("Conversion error:", error);
    await storage.updateConversionJob(jobId, {
      status: "failed",
      errorMessage: "Conversion failed"
    });
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
  }
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  base: "/smp3tomo/",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
