import { useState } from "react";
import { Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "./file-upload";
import { FileAttachmentList } from "./file-attachment-list";
import { queryClient } from "@/lib/queryClient";

interface FileAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
}

export function FileAttachmentDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: FileAttachmentDialogProps) {
  const [activeTab, setActiveTab] = useState("files");

  const handleUploadComplete = () => {
    // Invalidate the file attachments query to refresh the list
    // Need to invalidate with the specific query params
    queryClient.invalidateQueries({ 
      queryKey: ['/api/file-attachments', { projectId }] 
    });
    // Switch to files tab to show the newly uploaded file
    setActiveTab("files");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            File Attachments - {projectName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files" data-testid="tab-files">
              Files
            </TabsTrigger>
            <TabsTrigger value="upload" data-testid="tab-upload">
              Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="files" className="mt-4">
            <FileAttachmentList 
              projectId={projectId}
              canDelete={true}
            />
          </TabsContent>
          
          <TabsContent value="upload" className="mt-4">
            <FileUpload
              projectId={projectId}
              onUploadComplete={handleUploadComplete}
              maxFileSize={10 * 1024 * 1024} // 10MB
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}