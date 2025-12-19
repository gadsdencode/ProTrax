/**
 * DocumentService - Document parsing and text extraction service
 * 
 * Handles extraction of text content from various document formats:
 * - PDF files (via pdf-parse)
 * - Word documents (.docx, .doc via mammoth)
 * - Plain text files
 * 
 * This service follows the Single Responsibility Principle, centralizing
 * all document parsing logic that was previously in route handlers.
 */

import * as mammoth from "mammoth";
import * as pdfParseModule from "pdf-parse";

// Handle both ESM and CJS imports of pdf-parse
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

/**
 * Supported document MIME types for text extraction
 */
export type SupportedMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/msword"
  | "text/plain";

/**
 * Result of document text extraction
 */
export interface DocumentExtractionResult {
  text: string;
  wordCount: number;
  characterCount: number;
}

/**
 * Custom error class for document parsing failures
 */
export class DocumentParseError extends Error {
  constructor(
    message: string,
    public readonly mimeType: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "DocumentParseError";
  }
}

/**
 * DocumentService provides methods for extracting text content from various document formats.
 * 
 * @example
 * ```typescript
 * const documentService = new DocumentService();
 * const result = await documentService.extractText(fileBuffer, "application/pdf");
 * console.log(result.text);
 * ```
 */
export class DocumentService {
  /**
   * Supported MIME types for document extraction
   */
  static readonly SUPPORTED_TYPES: readonly SupportedMimeType[] = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
  ] as const;

  /**
   * Checks if a given MIME type is supported for text extraction
   */
  isSupportedType(mimeType: string): mimeType is SupportedMimeType {
    return (DocumentService.SUPPORTED_TYPES as readonly string[]).includes(mimeType);
  }

  /**
   * Extracts text content from a document buffer based on its MIME type.
   * 
   * @param buffer - The document file buffer
   * @param mimeType - The MIME type of the document
   * @returns Extraction result with text and statistics
   * @throws DocumentParseError if extraction fails or type is unsupported
   */
  async extractText(
    buffer: Buffer,
    mimeType: string
  ): Promise<DocumentExtractionResult> {
    if (!this.isSupportedType(mimeType)) {
      throw new DocumentParseError(
        `Unsupported file type: ${mimeType}. Supported types: PDF, Word (.docx), or text files.`,
        mimeType
      );
    }

    let text: string;

    switch (mimeType) {
      case "application/pdf":
        text = await this.extractFromPdf(buffer);
        break;
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        text = await this.extractFromWord(buffer);
        break;
      case "text/plain":
        text = this.extractFromText(buffer);
        break;
      default:
        // This should never happen due to isSupportedType check, but TypeScript needs it
        throw new DocumentParseError(`Unexpected MIME type: ${mimeType}`, mimeType);
    }

    return this.createResult(text);
  }

  /**
   * Extracts text from a PDF document
   */
  private async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new DocumentParseError(
        "Failed to extract text from PDF document",
        "application/pdf",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Extracts text from a Word document (.docx or .doc)
   */
  private async extractFromWord(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new DocumentParseError(
        "Failed to extract text from Word document",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Extracts text from a plain text file
   */
  private extractFromText(buffer: Buffer): string {
    return buffer.toString("utf-8");
  }

  /**
   * Creates an extraction result with text statistics
   */
  private createResult(text: string): DocumentExtractionResult {
    const trimmedText = text.trim();
    return {
      text: trimmedText,
      wordCount: trimmedText ? trimmedText.split(/\s+/).length : 0,
      characterCount: trimmedText.length,
    };
  }

  /**
   * Validates that extracted text is not empty
   * @throws DocumentParseError if text is empty
   */
  validateNotEmpty(result: DocumentExtractionResult): void {
    if (!result.text || result.characterCount === 0) {
      throw new DocumentParseError(
        "The uploaded document appears to be empty",
        "unknown"
      );
    }
  }

  /**
   * Returns a human-readable description of supported file types
   */
  getSupportedTypesDescription(): string {
    return "PDF, Word document (.docx), or text file";
  }
}

// Singleton instance for convenience
export const documentService = new DocumentService();

