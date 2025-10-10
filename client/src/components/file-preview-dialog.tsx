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
  Eye,
  FileSpreadsheet,
  FileX
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { FileAttachment } from "@shared/schema";
import { cn } from "@/lib/utils";
import * as mammoth from "mammoth";
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
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';

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
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('xml', markup);

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
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
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
    setHtmlContent(null);

    try {
      const mimeType = file.mimeType || '';
      
      // For Word documents (.docx)
      if (mimeType.includes('wordprocessingml') || 
          mimeType.includes('msword') || 
          file.fileName.toLowerCase().endsWith('.docx')) {
        const response = await fetch(`/api/file-attachments/${file.id}/download`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/octet-stream',
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load file');
        }
        
        // Ensure we get the raw binary data
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        
        // Try to convert Word document to HTML using mammoth
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          
          if (result.value) {
            setHtmlContent(result.value);
          } else {
            // If no content was extracted, try as plain text
            const decoder = new TextDecoder();
            const text = decoder.decode(arrayBuffer);
            
            // Check if it might be plain text masquerading as docx
            if (text && !text.includes('\x00') && text.length < 10000) {
              setPreviewContent(text);
            } else {
              throw new Error('Could not extract content from Word document');
            }
          }
          
          if (result.messages && result.messages.length > 0) {
            console.warn('Word conversion warnings:', result.messages);
          }
        } catch (mammothError: any) {
          console.error('Mammoth conversion error:', mammothError);
          
          // Try to read as plain text if it's a small file
          if (arrayBuffer.byteLength < 100000) {
            const decoder = new TextDecoder();
            const text = decoder.decode(arrayBuffer);
            
            // Check if it's readable text
            if (text && !text.includes('\x00') && text.match(/[a-zA-Z]/)) {
              console.log('Falling back to text preview for invalid docx file');
              setPreviewContent(text);
              // Don't set htmlContent so it shows as text, not Word doc
            } else {
              throw new Error('Invalid Word document format. Please ensure the file is a valid .docx file.');
            }
          } else {
            throw new Error('Invalid Word document format. Please ensure the file is a valid .docx file.');
          }
        }
      }
      // For text-based files, fetch the content
      else if (isTextFile(file.mimeType) || file.mimeType?.includes('html')) {
        const response = await fetch(`/api/file-attachments/${file.id}/download`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to load file');
        }
        
        // Get the blob and convert to text properly
        const blob = await response.blob();
        const text = await blob.text();
        
        // Check if it's HTML content
        if (file.mimeType?.includes('html')) {
          setHtmlContent(text);
        } else {
          setPreviewContent(text);
        }
      }
      // For old .doc files (not .docx)
      else if (file.fileName.toLowerCase().endsWith('.doc') && 
               !file.fileName.toLowerCase().endsWith('.docx')) {
        setError('Classic .doc files require conversion. Please save as .docx format for preview.');
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

  const getFileIcon = (mimeType?: string | null, fileName?: string) => {
    if (!mimeType && !fileName) return File;
    
    // Check by MIME type
    if (mimeType) {
      if (mimeType.startsWith('image/')) return FileImage;
      if (mimeType.startsWith('video/')) return FileVideo;
      if (mimeType.startsWith('audio/')) return FileAudio;
      if (mimeType.includes('pdf')) return FileText;
      if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
      if (mimeType.includes('sheet') || mimeType.includes('excel')) return FileSpreadsheet;
      if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileText;
    }
    
    // Check by file extension
    if (fileName) {
      const ext = fileName.toLowerCase().split('.').pop();
      if (['doc', 'docx', 'odt', 'rtf'].includes(ext || '')) return FileText;
      if (['xls', 'xlsx', 'ods', 'csv'].includes(ext || '')) return FileSpreadsheet;
      if (['ppt', 'pptx', 'odp'].includes(ext || '')) return FileText;
      if (['pdf'].includes(ext || '')) return FileText;
    }
    
    return File;
  };

  const isOfficeDocument = (mimeType?: string | null, fileName?: string) => {
    if (!mimeType && !fileName) return false;
    
    const officeTypes = [
      'application/vnd.openxmlformats-officedocument',
      'application/vnd.ms-',
      'application/msword',
      'application/vnd.oasis.opendocument'
    ];
    
    if (mimeType && officeTypes.some(type => mimeType.includes(type))) {
      return true;
    }
    
    if (fileName) {
      const ext = fileName.toLowerCase().split('.').pop();
      return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext || '');
    }
    
    return false;
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

    // Word document preview (converted to HTML)
    if (htmlContent && (mimeType.includes('word') || currentAttachment.fileName.toLowerCase().endsWith('.docx'))) {
      return (
        <ScrollArea className={cn(
          "w-full bg-white dark:bg-gray-950",
          isFullscreen ? "h-full" : "h-[60vh]"
        )}>
          <div className="p-8">
            <Badge className="mb-4" variant="secondary">
              Word Document
            </Badge>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </ScrollArea>
      );
    }

    // Fallback for invalid Word documents showing as plain text
    if (previewContent && currentAttachment.fileName.toLowerCase().match(/\.(docx?|rtf)$/)) {
      return (
        <ScrollArea className={cn(
          "w-full",
          isFullscreen ? "h-full" : "h-[60vh]"
        )}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">Document (Text Fallback)</Badge>
              <span className="text-xs text-muted-foreground">
                Unable to parse as Word format, showing as text
              </span>
            </div>
            <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-muted p-4 rounded-md">
              {previewContent}
            </pre>
          </div>
        </ScrollArea>
      );
    }

    // HTML preview
    if (htmlContent && mimeType?.includes('html')) {
      return (
        <ScrollArea className={cn(
          "w-full",
          isFullscreen ? "h-full" : "h-[60vh]"
        )}>
          <div className="relative">
            <Badge className="absolute top-2 right-2 z-10" variant="secondary">
              HTML
            </Badge>
            <SyntaxHighlighter
              language="html"
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
              {htmlContent}
            </SyntaxHighlighter>
          </div>
        </ScrollArea>
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

    // Excel, PowerPoint and other office files
    if (isOfficeDocument(mimeType, currentAttachment.fileName)) {
      const isExcel = mimeType?.includes('sheet') || currentAttachment.fileName.match(/\.(xls|xlsx|ods|csv)$/i);
      const isPowerPoint = mimeType?.includes('presentation') || currentAttachment.fileName.match(/\.(ppt|pptx|odp)$/i);
      
      let fileType = 'Office Document';
      if (isExcel) fileType = 'Spreadsheet';
      else if (isPowerPoint) fileType = 'Presentation';
      else if (currentAttachment.fileName.match(/\.doc$/i)) fileType = 'Word Document (Legacy)';
      
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            {createElement(getFileIcon(mimeType, currentAttachment.fileName), {
              className: "h-16 w-16 mx-auto text-muted-foreground"
            })}
            <div className="space-y-1">
              <Badge variant="outline">{fileType}</Badge>
              <p className="font-medium mt-2">{currentAttachment.fileName}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(currentAttachment.fileSize)}
              </p>
            </div>
            <div className="space-y-2">
              {currentAttachment.fileName.match(/\.doc$/i) && (
                <p className="text-sm text-muted-foreground">
                  Legacy .doc format. Save as .docx for preview support.
                </p>
              )}
              {(isExcel || isPowerPoint) && (
                <p className="text-sm text-muted-foreground">
                  Direct preview coming soon. Download to view.
                </p>
              )}
              <Button onClick={handleDownload} variant="default">
                <Download className="h-4 w-4 mr-2" />
                Download {fileType}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Default fallback for other unsupported file types
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          {createElement(getFileIcon(mimeType, currentAttachment.fileName), {
            className: "h-16 w-16 mx-auto text-muted-foreground"
          })}
          <div className="space-y-1">
            <p className="font-medium">{currentAttachment.fileName}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(currentAttachment.fileSize)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Binary file - download to view
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