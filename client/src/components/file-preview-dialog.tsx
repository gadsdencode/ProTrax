import { useState, useEffect, createElement } from "react";
import { 
  X, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  File,
  Maximize2,
  Minimize2,
  Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { FileAttachment } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';

// Register only the languages we need to avoid bundle size issues
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('bash', bash);

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: FileAttachment | null;
  attachments?: FileAttachment[];
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  attachment,
  attachments = [],
}: FilePreviewDialogProps) {
  const [currentAttachment, setCurrentAttachment] = useState(attachment);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentAttachment(attachment);
  }, [attachment]);

  useEffect(() => {
    if (currentAttachment && open) {
      loadPreview(currentAttachment);
    }
  }, [currentAttachment, open]);

  const loadPreview = async (file: FileAttachment) => {
    setIsLoading(true);
    setError(null);
    setPreviewContent(null);

    try {
      // For text-based files, fetch the content
      if (isTextFile(file.mimeType)) {
        const response = await fetch(`/api/file-attachments/${file.id}/download`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to load file');
        }
        
        const text = await response.text();
        setPreviewContent(text);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  const isTextFile = (mimeType?: string | null) => {
    if (!mimeType) return false;
    const textTypes = [
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
      'application/typescript',
      'application/x-yaml',
      'application/x-sh',
      'application/x-python',
      'application/x-ruby',
      'application/x-perl',
      'application/x-php',
    ];
    return textTypes.some(type => mimeType.includes(type));
  };

  const getLanguageFromFile = (fileName: string, mimeType?: string | null): string => {
    // Try to determine language from file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'json': 'json',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'md': 'markdown',
      'markdown': 'markdown',
      'dockerfile': 'docker',
      'docker': 'docker',
      'makefile': 'makefile',
      'lua': 'lua',
      'r': 'r',
      'perl': 'perl',
      'toml': 'toml',
      'ini': 'ini',
      'conf': 'nginx',
      'vim': 'vim',
    };

    if (ext && languageMap[ext]) {
      return languageMap[ext];
    }

    // Try to determine from MIME type
    if (mimeType) {
      if (mimeType.includes('javascript')) return 'javascript';
      if (mimeType.includes('typescript')) return 'typescript';
      if (mimeType.includes('python')) return 'python';
      if (mimeType.includes('json')) return 'json';
      if (mimeType.includes('xml')) return 'xml';
      if (mimeType.includes('html')) return 'html';
      if (mimeType.includes('css')) return 'css';
      if (mimeType.includes('yaml')) return 'yaml';
      if (mimeType.includes('sql')) return 'sql';
      if (mimeType.includes('php')) return 'php';
      if (mimeType.includes('ruby')) return 'ruby';
      if (mimeType.includes('perl')) return 'perl';
      if (mimeType.includes('sh')) return 'bash';
    }

    return 'text'; // Default fallback
  };

  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return File;
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  const handleDownload = async () => {
    if (!currentAttachment) return;
    
    try {
      const response = await fetch(`/api/file-attachments/${currentAttachment.id}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentAttachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "File downloaded",
        description: `${currentAttachment.fileName} has been downloaded`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!currentAttachment || attachments.length === 0) return;
    
    const currentIndex = attachments.findIndex(a => a.id === currentAttachment.id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % attachments.length
      : (currentIndex - 1 + attachments.length) % attachments.length;
    
    setCurrentAttachment(attachments[newIndex]);
  };

  const renderPreview = () => {
    if (!currentAttachment) return null;
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="space-y-2 text-center">
            <Skeleton className="h-32 w-32 mx-auto rounded" />
            <p className="text-sm text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <File className="h-16 w-16 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    const mimeType = currentAttachment.mimeType || '';

    // Image preview
    if (mimeType.startsWith('image/')) {
      return (
        <div className={cn(
          "flex items-center justify-center",
          isFullscreen ? "h-full" : "max-h-[60vh]"
        )}>
          <img
            src={`/api/file-attachments/${currentAttachment.id}/download`}
            alt={currentAttachment.fileName}
            className={cn(
              "object-contain",
              isFullscreen ? "max-h-full max-w-full" : "max-h-[60vh] max-w-full"
            )}
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    // Video preview
    if (mimeType.startsWith('video/')) {
      return (
        <div className={cn(
          "flex items-center justify-center",
          isFullscreen ? "h-full" : "max-h-[60vh]"
        )}>
          <video
            controls
            className={cn(
              "object-contain",
              isFullscreen ? "max-h-full max-w-full" : "max-h-[60vh] max-w-full"
            )}
            onError={() => setError('Failed to load video')}
          >
            <source 
              src={`/api/file-attachments/${currentAttachment.id}/download`}
              type={mimeType}
            />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio preview
    if (mimeType.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center h-48">
          <div className="space-y-4 text-center">
            <FileAudio className="h-16 w-16 mx-auto text-muted-foreground" />
            <audio
              controls
              className="w-full max-w-md"
              onError={() => setError('Failed to load audio')}
            >
              <source 
                src={`/api/file-attachments/${currentAttachment.id}/download`}
                type={mimeType}
              />
              Your browser does not support the audio tag.
            </audio>
            <p className="text-sm text-muted-foreground">{currentAttachment.fileName}</p>
          </div>
        </div>
      );
    }

    // PDF preview
    if (mimeType.includes('pdf')) {
      return (
        <div className={cn(
          "w-full",
          isFullscreen ? "h-full" : "h-[70vh]"
        )}>
          <iframe
            src={`/api/file-attachments/${currentAttachment.id}/download#view=FitH`}
            className="w-full h-full border-0"
            title={currentAttachment.fileName}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      );
    }

    // Text/Code preview
    if (isTextFile(mimeType) && previewContent !== null) {
      const language = getLanguageFromFile(currentAttachment.fileName, mimeType);
      
      return (
        <ScrollArea className={cn(
          "w-full",
          isFullscreen ? "h-full" : "h-[60vh]"
        )}>
          <div className="relative">
            {/* Language badge */}
            {language !== 'text' && (
              <div className="absolute top-2 right-2 z-10 px-2 py-1 text-xs font-mono bg-background/80 backdrop-blur border rounded">
                {language}
              </div>
            )}
            
            {/* Syntax highlighted content */}
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.875rem',
                borderRadius: '0.375rem',
              }}
              showLineNumbers
              wrapLines
            >
              {previewContent}
            </SyntaxHighlighter>
          </div>
        </ScrollArea>
      );
    }

    // Default fallback for unsupported file types
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          {createElement(getFileIcon(mimeType), {
            className: "h-16 w-16 mx-auto text-muted-foreground"
          })}
          <div className="space-y-1">
            <p className="font-medium">{currentAttachment.fileName}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(currentAttachment.fileSize)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Preview not available for this file type
          </p>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    );
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const showNavigation = attachments.length > 1 && currentAttachment;
  const currentIndex = currentAttachment 
    ? attachments.findIndex(a => a.id === currentAttachment.id) + 1
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col",
          isFullscreen 
            ? "max-w-full h-screen w-screen rounded-none" 
            : "max-w-5xl max-h-[90vh]"
        )}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {currentAttachment?.fileName || 'File Preview'}
              {showNavigation && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({currentIndex} of {attachments.length})
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {showNavigation && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleNavigate('prev')}
                    title="Previous file"
                    data-testid="preview-nav-prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleNavigate('next')}
                    title="Next file"
                    data-testid="preview-nav-next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                data-testid="preview-fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                title="Download file"
                data-testid="preview-download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}