import { useState, useCallback, useRef } from "react";
import { Upload, X, File, FileText, FileImage, FileVideo, FileAudio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  projectId?: number;
  taskId?: number;
  isPrivate?: boolean;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[]; // MIME types
  onUploadComplete?: (file: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

export function FileUpload({
  projectId,
  taskId,
  isPrivate = false,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes,
  onUploadComplete,
  onUploadError,
  className
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File "${file.name}" exceeds maximum size of ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`;
    }
    
    if (acceptedTypes && acceptedTypes.length > 0) {
      if (!acceptedTypes.includes(file.type)) {
        return `File type "${file.type}" is not accepted`;
      }
    }
    
    return null;
  };

  const uploadFile = async (file: File) => {
    const fileId = `${file.name}-${Date.now()}`;
    
    // Add file to uploading list
    setUploadingFiles(prev => new Map(prev).set(fileId, { file, progress: 0 }));

    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('projectId', projectId.toString());
    if (taskId) formData.append('taskId', taskId.toString());
    formData.append('isPrivate', isPrivate.toString());

    try {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadingFiles(prev => {
            const newMap = new Map(prev);
            const current = newMap.get(fileId);
            if (current) {
              newMap.set(fileId, { ...current, progress });
            }
            return newMap;
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          
          toast({
            title: "File uploaded",
            description: `${file.name} has been uploaded successfully`,
          });
          
          if (onUploadComplete) {
            onUploadComplete(response);
          }
          
          // Remove from uploading list after a short delay
          setTimeout(() => {
            setUploadingFiles(prev => {
              const newMap = new Map(prev);
              newMap.delete(fileId);
              return newMap;
            });
          }, 1000);
        } else {
          throw new Error(xhr.responseText || 'Upload failed');
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        const errorMsg = `Failed to upload ${file.name}`;
        
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(fileId);
          if (current) {
            newMap.set(fileId, { ...current, error: errorMsg });
          }
          return newMap;
        });
        
        toast({
          title: "Upload failed",
          description: errorMsg,
          variant: "destructive",
        });
        
        if (onUploadError) {
          onUploadError(errorMsg);
        }
      });

      xhr.open('POST', '/api/file-attachments/upload');
      xhr.withCredentials = true;
      xhr.send(formData);
    } catch (error: any) {
      const errorMsg = error.message || `Failed to upload ${file.name}`;
      
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(fileId);
        if (current) {
          newMap.set(fileId, { ...current, error: errorMsg });
        }
        return newMap;
      });
      
      toast({
        title: "Upload failed",
        description: errorMsg,
        variant: "destructive",
      });
      
      if (onUploadError) {
        onUploadError(errorMsg);
      }
    }
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid file",
          description: error,
          variant: "destructive",
        });
        return;
      }
      
      uploadFile(file);
    });
  }, [projectId, taskId, isPrivate, maxFileSize, acceptedTypes]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const removeUploadingFile = (fileId: string) => {
    setUploadingFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone */}
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50",
          "cursor-pointer"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="file-upload-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          accept={acceptedTypes?.join(',')}
          className="hidden"
          data-testid="file-upload-input"
        />
        
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Maximum file size: {(maxFileSize / 1024 / 1024).toFixed(1)}MB
        </p>
        {acceptedTypes && acceptedTypes.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Accepted types: {acceptedTypes.join(', ')}
          </p>
        )}
      </div>

      {/* Uploading files list */}
      {uploadingFiles.size > 0 && (
        <div className="space-y-2">
          {Array.from(uploadingFiles.entries()).map(([fileId, uploadingFile]) => {
            const FileIcon = getFileIcon(uploadingFile.file.type);
            return (
              <div
                key={fileId}
                className="flex items-center gap-3 rounded-lg border p-3"
                data-testid={`uploading-file-${fileId}`}
              >
                <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadingFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadingFile.file.size / 1024).toFixed(1)}KB
                  </p>
                  {!uploadingFile.error && (
                    <Progress value={uploadingFile.progress} className="mt-1 h-1" />
                  )}
                  {uploadingFile.error && (
                    <p className="text-xs text-destructive mt-1">{uploadingFile.error}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUploadingFile(fileId);
                  }}
                  data-testid={`remove-uploading-file-${fileId}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}