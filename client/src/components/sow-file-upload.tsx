import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface SOWFileUploadProps {
  onUploadComplete?: (project: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
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
  const [uploadingFile, setUploadingFile] = useState<UploadingFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    // Set uploading state
    setUploadingFile({ file, progress: 0 });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadingFile(prev => prev ? { ...prev, progress } : null);
        }
      });

      // Handle completion
      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const project = JSON.parse(xhr.responseText);
          
          // Check the response for task creation results
          if (project.tasksCreated !== undefined && project.tasksFailed !== undefined) {
            // New response format with partial success info
            let description = `Project "${project.name}" created successfully. `;
            
            if (project.tasksCreated > 0) {
              description += `${project.tasksCreated} task${project.tasksCreated !== 1 ? 's' : ''} saved`;
            }
            
            if (project.tasksFailed > 0) {
              description += project.tasksCreated > 0 ? `, ` : ``;
              description += `${project.tasksFailed} task${project.tasksFailed !== 1 ? 's' : ''} failed`;
              
              // Log failed tasks for debugging if available
              if (project.failedTasks && project.failedTasks.length > 0) {
                console.warn('[SOW Upload] Failed to create the following tasks:', project.failedTasks);
              }
            }
            
            if (project.tasksCreated === 0 && project.tasksFailed === 0) {
              description += `No tasks were found in the document.`;
            }
            
            // Show appropriate toast based on results
            const variant = project.tasksFailed > 0 ? "default" : "default";
            const title = project.tasksFailed > 0 ? "Partial Success" : "Success";
            
            toast({
              title,
              description,
              variant,
            });
          } else {
            // Fallback for old response format or missing task info
            toast({
              title: "Success",
              description: `Project "${project.name}" has been created successfully`,
            });
          }
          
          if (onUploadComplete) {
            onUploadComplete(project);
          }
          
          // Clear uploading state after a short delay
          setTimeout(() => {
            setUploadingFile(null);
          }, 1000);
        } else {
          let errorMessage = 'Failed to create project from SOW';
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || errorMessage;
          } catch (e) {
            // Ignore JSON parse error
          }
          
          // Handle error properly without throwing
          setUploadingFile(prev => prev ? { ...prev, error: errorMessage } : null);
          
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
        
        setUploadingFile(prev => prev ? { ...prev, error: errorMsg } : null);
        
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
      
      setUploadingFile(prev => prev ? { ...prev, error: errorMsg } : null);
      
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

  const clearUploadingFile = () => {
    setUploadingFile(null);
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
        data-testid="sow-upload-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
          className="hidden"
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

      {/* Uploading file */}
      {uploadingFile && (
        <div className="space-y-2">
          <div
            className="flex items-center gap-3 rounded-lg border p-3"
            data-testid="uploading-sow-file"
          >
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
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
            {uploadingFile.error && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  clearUploadingFile();
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
      </div>
    </div>
  );
}