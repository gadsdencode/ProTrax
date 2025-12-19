import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useJobPolling, JobStatusResponse } from "@/hooks/use-job-polling";

interface SOWFileUploadProps {
  onUploadComplete?: (project: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

type UploadPhase = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface UploadState {
  phase: UploadPhase;
  fileName: string;
  fileSize: number;
  uploadProgress: number;
  jobProgress: number;
  progressMessage: string;
  error?: string;
  result?: any;
}

const ACCEPTED_TYPES = [
  'application/pdf', // .pdf
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/plain', // .txt
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function SOWFileUpload({
  onUploadComplete,
  onUploadError,
  className
}: SOWFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Job polling hook for async processing
  const { status: jobStatus, isPolling, startPolling, stopPolling, reset: resetPolling } = useJobPolling({
    interval: 2000,
    onComplete: (result) => {
      setUploadState(prev => prev ? {
        ...prev,
        phase: 'completed',
        jobProgress: 100,
        progressMessage: 'Project created successfully!',
        result,
      } : null);

      // Show success toast with details
      let description = `Project "${result.projectName}" created successfully. `;
      if (result.tasksCreated > 0) {
        description += `${result.tasksCreated} task${result.tasksCreated !== 1 ? 's' : ''} saved`;
      }
      if (result.tasksFailed > 0) {
        description += result.tasksCreated > 0 ? `, ` : ``;
        description += `${result.tasksFailed} task${result.tasksFailed !== 1 ? 's' : ''} failed`;
        if (result.failedTasks && result.failedTasks.length > 0) {
          console.warn('[SOW Upload] Failed tasks:', result.failedTasks);
        }
      }
      if (result.tasksCreated === 0 && result.tasksFailed === 0) {
        description += `No tasks were found in the document.`;
      }

      toast({
        title: result.tasksFailed > 0 ? "Partial Success" : "Success",
        description,
      });

      if (onUploadComplete) {
        onUploadComplete({
          id: result.projectId,
          name: result.projectName,
          tasksCreated: result.tasksCreated,
          tasksFailed: result.tasksFailed,
          failedTasks: result.failedTasks,
        });
      }
    },
    onError: (error) => {
      setUploadState(prev => prev ? {
        ...prev,
        phase: 'failed',
        progressMessage: 'Processing failed',
        error,
      } : null);

      toast({
        title: "Processing failed",
        description: error,
        variant: "destructive",
      });

      if (onUploadError) {
        onUploadError(error);
      }
    },
    onProgress: (status) => {
      setUploadState(prev => prev ? {
        ...prev,
        phase: 'processing',
        jobProgress: status.progress,
        progressMessage: status.progressMessage || 'Processing...',
      } : null);
    },
  });

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds maximum size of ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`;
    }
    
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Please upload a PDF (.pdf), Word document (.docx or .doc) or text file (.txt)`;
    }
    
    return null;
  };

  const uploadFile = async (file: File) => {
    // Set initial uploading state
    setUploadState({
      phase: 'uploading',
      fileName: file.name,
      fileSize: file.size,
      uploadProgress: 0,
      jobProgress: 0,
      progressMessage: 'Uploading file...',
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadState(prev => prev ? { ...prev, uploadProgress: progress } : null);
        }
      });

      // Handle completion - now expects 202 with job ID
      xhr.addEventListener('load', async () => {
        if (xhr.status === 202) {
          // Async processing - start polling for job status
          const response = JSON.parse(xhr.responseText);
          
          setUploadState(prev => prev ? {
            ...prev,
            phase: 'processing',
            uploadProgress: 100,
            progressMessage: 'Analyzing document...',
          } : null);

          // Start polling for job status
          startPolling(response.jobId);
          
        } else if (xhr.status >= 200 && xhr.status < 300) {
          // Legacy sync response (for backward compatibility)
          const project = JSON.parse(xhr.responseText);
          
          setUploadState(prev => prev ? {
            ...prev,
            phase: 'completed',
            uploadProgress: 100,
            jobProgress: 100,
            progressMessage: 'Project created successfully!',
            result: project,
          } : null);
          
          // Handle legacy response
          let description = `Project "${project.name}" created successfully. `;
          if (project.tasksCreated !== undefined) {
            if (project.tasksCreated > 0) {
              description += `${project.tasksCreated} task${project.tasksCreated !== 1 ? 's' : ''} saved`;
            }
            if (project.tasksFailed > 0) {
              description += project.tasksCreated > 0 ? `, ` : ``;
              description += `${project.tasksFailed} task${project.tasksFailed !== 1 ? 's' : ''} failed`;
            }
          }
          
          toast({
            title: "Success",
            description,
          });
          
          if (onUploadComplete) {
            onUploadComplete(project);
          }
        } else {
          let errorMessage = 'Failed to create project from SOW';
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || errorMessage;
          } catch (e) {
            // Ignore JSON parse error
          }
          
          setUploadState(prev => prev ? {
            ...prev,
            phase: 'failed',
            error: errorMessage,
            progressMessage: 'Upload failed',
          } : null);
          
          toast({
            title: "Upload failed",
            description: errorMessage,
            variant: "destructive",
          });
          
          if (onUploadError) {
            onUploadError(errorMessage);
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        const errorMsg = `Failed to process SOW document`;
        
        setUploadState(prev => prev ? {
          ...prev,
          phase: 'failed',
          error: errorMsg,
          progressMessage: 'Upload failed',
        } : null);
        
        toast({
          title: "Upload failed",
          description: errorMsg,
          variant: "destructive",
        });
        
        if (onUploadError) {
          onUploadError(errorMsg);
        }
      });

      xhr.open('POST', '/api/projects/create-from-sow');
      xhr.withCredentials = true;
      xhr.send(formData);
    } catch (error: any) {
      const errorMsg = error.message || `Failed to process SOW document`;
      
      setUploadState(prev => prev ? {
        ...prev,
        phase: 'failed',
        error: errorMsg,
        progressMessage: 'Upload failed',
      } : null);
      
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
    if (!files || files.length === 0) return;

    // Only process the first file for SOW upload
    const file = files[0];
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
  }, []);

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

  const clearUploadState = () => {
    stopPolling();
    resetPolling();
    setUploadState(null);
  };

  // Calculate overall progress for display
  const getOverallProgress = () => {
    if (!uploadState) return 0;
    if (uploadState.phase === 'uploading') {
      // Upload is 10% of total progress
      return uploadState.uploadProgress * 0.1;
    }
    if (uploadState.phase === 'processing') {
      // Processing is 90% of total progress (10-100)
      return 10 + (uploadState.jobProgress * 0.9);
    }
    if (uploadState.phase === 'completed') return 100;
    return 0;
  };

  const getStatusIcon = () => {
    if (!uploadState) return null;
    switch (uploadState.phase) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isProcessing = uploadState?.phase === 'uploading' || uploadState?.phase === 'processing';

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone - disabled during processing */}
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50",
          isProcessing ? "pointer-events-none opacity-50" : "cursor-pointer"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        data-testid="sow-upload-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
          className="hidden"
          disabled={isProcessing}
          data-testid="sow-upload-input"
        />
        
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">
          Drop your SOW document here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Accepted formats: PDF (.pdf), Word documents (.docx, .doc) or text files (.txt)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Maximum file size: 10MB
        </p>
      </div>

      {/* Upload/Processing status */}
      {uploadState && (
        <div className="space-y-2">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3",
              uploadState.phase === 'completed' && "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950",
              uploadState.phase === 'failed' && "border-destructive/50 bg-destructive/10"
            )}
            data-testid="uploading-sow-file"
          >
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {uploadState.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {uploadState.progressMessage}
              </p>
              {!uploadState.error && uploadState.phase !== 'completed' && (
                <Progress value={getOverallProgress()} className="mt-2 h-1.5" />
              )}
              {uploadState.error && (
                <p className="text-xs text-destructive mt-1">{uploadState.error}</p>
              )}
            </div>
            {(uploadState.phase === 'completed' || uploadState.phase === 'failed') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  clearUploadState();
                }}
                data-testid="clear-sow-upload"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg bg-muted/50 p-4">
        <h4 className="text-sm font-medium mb-2">How it works:</h4>
        <ol className="text-xs text-muted-foreground space-y-1">
          <li>1. Upload your Statement of Work (SOW) document</li>
          <li>2. Our AI will analyze the document and extract project details</li>
          <li>3. A new project will be created with the extracted information</li>
          <li>4. You can review and edit the project details afterwards</li>
        </ol>
        <p className="text-xs text-muted-foreground/80 mt-2 italic">
          Processing may take 30-60 seconds depending on document size.
        </p>
      </div>
    </div>
  );
}
