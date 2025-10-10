import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { File, FileText, FileImage, FileVideo, FileAudio, Download, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import type { FileAttachment, Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { FilePreviewDialog } from "./file-preview-dialog";

interface FileAttachmentListProps {
  projectId?: number;
  taskId?: number;
  canDelete?: boolean;
  className?: string;
}

export function FileAttachmentList({ 
  projectId, 
  taskId, 
  canDelete = true,
  className 
}: FileAttachmentListProps) {
  const [deleteFileId, setDeleteFileId] = useState<number | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Build query params
  const queryParams: Record<string, number> = {};
  if (projectId) queryParams.projectId = projectId;
  if (taskId) queryParams.taskId = taskId;

  // Fetch attachments
  const { data: attachments, isLoading } = useQuery<FileAttachment[]>({
    queryKey: ['/api/file-attachments', queryParams],
    enabled: !!(projectId || taskId),
  });

  // Fetch project if projectId is provided to check if user is project manager
  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest('DELETE', `/api/file-attachments/${fileId}`);
    },
    onSuccess: () => {
      // Invalidate with the specific query params to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/file-attachments', queryParams] 
      });
      toast({
        title: "File deleted",
        description: "The file has been removed successfully",
      });
      setDeleteFileId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return File;
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (attachment: FileAttachment) => {
    try {
      const response = await fetch(`/api/file-attachments/${attachment.id}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "File downloaded",
        description: `${attachment.fileName} has been downloaded`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className={className}>
        <Card className="p-6 text-center">
          <File className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No files attached</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.mimeType);
            const isImage = attachment.mimeType?.startsWith('image/');
            
            // Check if user can delete this file
            const userCanDelete = canDelete && user && (
              attachment.userId === user.id || // User is the uploader
              (project && project.managerId === user.id) // User is the project manager
            );
            
            return (
              <Card key={attachment.id} className="p-3" data-testid={`file-attachment-${attachment.id}`}>
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={attachment.fileName}>
                      {attachment.fileName}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatFileSize(attachment.fileSize)}</span>
                      {attachment.createdAt && (
                        <>
                          <span>•</span>
                          <span>{format(new Date(attachment.createdAt), 'MMM d, yyyy')}</span>
                        </>
                      )}
                      {attachment.version && attachment.version > 1 && (
                        <>
                          <span>•</span>
                          <span>v{attachment.version}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setPreviewAttachment(attachment);
                        setPreviewDialogOpen(true);
                      }}
                      title="Preview file"
                      data-testid={`preview-file-${attachment.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(attachment)}
                      title="Download file"
                      data-testid={`download-file-${attachment.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    {userCanDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteFileId(attachment.id)}
                        title="Delete file"
                        data-testid={`delete-file-${attachment.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteFileId !== null} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-file">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFileId && deleteMutation.mutate(deleteFileId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-file"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File preview dialog */}
      <FilePreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        attachment={previewAttachment}
        attachments={attachments || []}
      />
    </>
  );
}