import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Music } from "lucide-react";
import FileUploadZone from "@/components/file-upload-zone";
import FileCard from "@/components/file-card";
import ConversionSettings from "@/components/conversion-settings";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

export default function Converter() {
  const [conversionSettings, setConversionSettings] = useState({
    quality: 128,
    sampleRate: 44100,
  });
  const { toast } = useToast();

  const { data: jobs = [], isLoading } = useQuery<ConversionJob[]>({
    queryKey: ["/api/conversions"],
    refetchInterval: 2000, // Poll every 2 seconds for progress updates
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("quality", conversionSettings.quality.toString());
      formData.append("sampleRate", conversionSettings.sampleRate.toString());

      const response = await fetch("/api/conversions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversions"] });
      toast({
        title: "Upload successful",
        description: "File uploaded and conversion started",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/conversions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversion");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversions"] });
      toast({
        title: "File removed",
        description: "Conversion job has been deleted",
      });
    },
  });

  const handleFileUpload = (files: File[]) => {
    files.forEach((file) => {
      uploadMutation.mutate(file);
    });
  };

  const handleDownload = (id: string, filename: string) => {
    const outputFilename = filename.replace(/\.mp3$/i, ".ogg");
    const link = document.createElement("a");
    link.href = `/api/conversions/${id}/download`;
    link.download = outputFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    const completedJobs = jobs.filter((job) => job.status === "completed");
    completedJobs.forEach((job) => {
      handleDownload(job.id, job.filename);
    });
  };

  const handleClearCompleted = () => {
    const completedJobs = jobs.filter((job) => job.status === "completed");
    completedJobs.forEach((job) => {
      deleteMutation.mutate(job.id);
    });
  };

  const handleRetry = (job: ConversionJob) => {
    // For retry, we would need to re-upload the file since we don't store originals
    toast({
      title: "Retry not available",
      description: "Please upload the file again to retry conversion",
      variant: "destructive",
    });
  };

  const completedJobs = jobs.filter((job) => job.status === "completed");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Music className="text-primary-foreground text-sm" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">MP3 to OGG Converter</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Convert stereo MP3 files to mono OGG format
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* File Upload Zone */}
        <div className="mb-8">
          <FileUploadZone
            onFilesUploaded={handleFileUpload}
            isUploading={uploadMutation.isPending}
          />
        </div>

        {/* Conversion Queue */}
        <div className="space-y-4" data-testid="conversion-queue">
          {jobs.map((job) => (
            <FileCard
              key={job.id}
              job={job}
              onDownload={() => handleDownload(job.id, job.filename)}
              onRetry={() => handleRetry(job)}
              onRemove={() => deleteMutation.mutate(job.id)}
            />
          ))}
        </div>

        {/* Empty State */}
        {jobs.length === 0 && !isLoading && (
          <div className="text-center py-12" data-testid="empty-state">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="text-3xl text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No files to convert</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Upload MP3 files using the drag-and-drop area above to start converting them to OGG
              mono format.
            </p>
          </div>
        )}

        {/* Batch Actions */}
        {completedJobs.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3 justify-center" data-testid="batch-actions">
            <Button
              onClick={handleDownloadAll}
              className="flex items-center gap-2"
              data-testid="button-download-all"
            >
              <i className="fas fa-download"></i>
              Download All ({completedJobs.length} files)
            </Button>
            <Button
              variant="secondary"
              onClick={handleClearCompleted}
              className="flex items-center gap-2"
              data-testid="button-clear-completed"
            >
              <i className="fas fa-trash-alt"></i>
              Clear Completed
            </Button>
          </div>
        )}

        {/* Conversion Settings */}
        <ConversionSettings
          settings={conversionSettings}
          onSettingsChange={setConversionSettings}
        />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Powered by FFmpeg • All conversions happen on the server
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <i className="fas fa-shield-alt"></i>
                Secure
              </span>
              <span className="flex items-center gap-1">
                <i className="fas fa-bolt"></i>
                Fast conversion
              </span>
              <span className="flex items-center gap-1">
                <i className="fas fa-server"></i>
                Server-side processing
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
