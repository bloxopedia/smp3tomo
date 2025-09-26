import { type ConversionJob, type InsertConversionJob } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createConversionJob(job: InsertConversionJob): Promise<ConversionJob>;
  getConversionJob(id: string): Promise<ConversionJob | undefined>;
  updateConversionJob(id: string, updates: Partial<ConversionJob>): Promise<ConversionJob | undefined>;
  getAllConversionJobs(): Promise<ConversionJob[]>;
  deleteConversionJob(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private conversionJobs: Map<string, ConversionJob>;

  constructor() {
    this.conversionJobs = new Map();
  }

  async createConversionJob(insertJob: InsertConversionJob): Promise<ConversionJob> {
    const id = randomUUID();
    const job: ConversionJob = {
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
      createdAt: new Date(),
      completedAt: null,
    };
    this.conversionJobs.set(id, job);
    return job;
  }

  async getConversionJob(id: string): Promise<ConversionJob | undefined> {
    return this.conversionJobs.get(id);
  }

  async updateConversionJob(id: string, updates: Partial<ConversionJob>): Promise<ConversionJob | undefined> {
    const job = this.conversionJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates };
    this.conversionJobs.set(id, updatedJob);
    return updatedJob;
  }

  async getAllConversionJobs(): Promise<ConversionJob[]> {
    return Array.from(this.conversionJobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async deleteConversionJob(id: string): Promise<boolean> {
    return this.conversionJobs.delete(id);
  }
}

export const storage = new MemStorage();
