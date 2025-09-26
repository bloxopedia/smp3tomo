import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFilesUploaded: (files: File[]) => void;
  isUploading?: boolean;
}

export default function FileUploadZone({ onFilesUploaded, isUploading }: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesUploaded(acceptedFiles);
    },
    [onFilesUploaded]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      "audio/mp3": [".mp3"],
      "audio/mpeg": [".mp3"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true,
    disabled: isUploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed border-border rounded-lg p-8 text-center bg-card hover:bg-accent/50 transition-colors cursor-pointer",
          isDragActive && "border-primary bg-primary/5",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
        data-testid="file-upload-zone"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <CloudUpload className="text-2xl text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {isDragActive ? "Drop MP3 files here" : "Drop MP3 files here"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              or <span className="text-primary font-medium">browse files</span> to upload
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3" />
              <span>Supports MP3 files up to 100MB</span>
            </div>
          </div>
        </div>
        <input {...getInputProps()} data-testid="file-input" />
      </div>

      {/* File rejection errors */}
      {fileRejections.length > 0 && (
        <div className="mt-4 space-y-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-sm text-destructive">
              <span className="font-medium">{file.name}:</span>{" "}
              {errors.map((error) => error.message).join(", ")}
            </div>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">Uploading files...</p>
        </div>
      )}
    </div>
  );
}
