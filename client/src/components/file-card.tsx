import { FileAudio, Check, AlertTriangle, Cog, Download, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ConversionJob {
  id: string;
  filename: string;
  originalSize: number;
  convertedSize?: number;
  duration?: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  errorMessage?: string;
  quality: number;
  sampleRate: number;
  createdAt: string;
  completedAt?: string;
}

interface FileCardProps {
  job: ConversionJob;
  onDownload: () => void;
  onRetry: () => void;
  onRemove: () => void;
}

export default function FileCard({ job, onDownload, onRetry, onRemove }: FileCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case "processing":
        return <Cog className="animate-spin" />;
      case "completed":
        return <Check />;
      case "failed":
        return <AlertTriangle />;
      default:
        return <FileAudio />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case "processing":
        return "bg-amber-100 text-amber-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  const getIconColor = () => {
    switch (job.status) {
      case "processing":
        return "bg-amber-100 text-amber-600";
      case "completed":
        return "bg-green-100 text-green-600";
      case "failed":
        return "bg-red-100 text-red-600";
      default:
        return "bg-blue-100 text-blue-600";
    }
  };

  const sizeReduction = job.convertedSize && job.originalSize
    ? Math.round(((job.originalSize - job.convertedSize) / job.originalSize) * 100)
    : 0;

  return (
    <div
      className={cn(
        "file-card bg-card rounded-lg border p-6 shadow-sm transition-all duration-200 hover:shadow-md",
        job.status === "failed" && "border-destructive/20"
      )}
      data-testid={`file-card-${job.id}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", getIconColor())}>
            <FileAudio className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium text-foreground" data-testid="file-name">
              {job.filename}
            </h4>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span data-testid="file-size">{formatFileSize(job.originalSize)}</span>
              {job.duration && <span data-testid="file-duration">{job.duration}</span>}
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                Stereo
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1", getStatusColor())}>
            {getStatusIcon()}
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Progress Bar (for processing) */}
      {job.status === "processing" && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Converting to OGG Mono...</span>
            <span data-testid="progress-percentage">{job.progress}%</span>
          </div>
          <Progress value={job.progress} className="h-2" data-testid="progress-bar" />
        </div>
      )}

      {/* Success Message (for completed) */}
      {job.status === "completed" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-800 font-medium text-sm">Conversion completed successfully</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Message (for failed) */}
      {job.status === "failed" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium text-sm">Conversion failed</p>
              <p className="text-red-700 text-sm mt-1" data-testid="error-message">
                {job.errorMessage || "An unknown error occurred during conversion."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
        <div>
          <span className="text-muted-foreground">Original</span>
          <p className="font-medium text-foreground">MP3 Stereo</p>
        </div>
        <div>
          <span className="text-muted-foreground">
            {job.status === "completed" ? "Converted" : "Converting to"}
          </span>
          <p className="font-medium text-foreground">OGG Mono</p>
        </div>
        {job.status === "completed" && job.convertedSize && (
          <div>
            <span className="text-muted-foreground">Size Reduction</span>
            <p className="font-medium text-green-600">
              -{sizeReduction}% ({formatFileSize(job.convertedSize)})
            </p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Quality</span>
          <p className="font-medium text-foreground">{job.quality} kbps</p>
        </div>
      </div>

      {/* Actions */}
      {job.status === "completed" && (
        <Button
          onClick={onDownload}
          className="w-full flex items-center justify-center gap-2"
          data-testid="button-download"
        >
          <Download className="w-4 h-4" />
          Download OGG File ({job.convertedSize ? formatFileSize(job.convertedSize) : "Unknown size"})
        </Button>
      )}

      {job.status === "failed" && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2"
            data-testid="button-retry"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            variant="destructive"
            onClick={onRemove}
            className="flex-1 flex items-center justify-center gap-2"
            data-testid="button-remove"
          >
            <X className="w-4 h-4" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
