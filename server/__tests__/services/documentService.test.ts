/**
 * Unit tests for DocumentService
 * 
 * Tests document parsing and text extraction functionality.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the pdf-parse and mammoth modules
vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));

vi.mock("mammoth", () => ({
  extractRawText: vi.fn(),
}));

// Import after mocking
import {
  DocumentService,
  DocumentParseError,
  documentService,
} from "../../services/documentService";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";

describe("DocumentService", () => {
  let service: DocumentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentService();
  });

  describe("isSupportedType", () => {
    it("should return true for PDF files", () => {
      expect(service.isSupportedType("application/pdf")).toBe(true);
    });

    it("should return true for Word documents (.docx)", () => {
      expect(
        service.isSupportedType(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe(true);
    });

    it("should return true for Word documents (.doc)", () => {
      expect(service.isSupportedType("application/msword")).toBe(true);
    });

    it("should return true for plain text files", () => {
      expect(service.isSupportedType("text/plain")).toBe(true);
    });

    it("should return false for unsupported types", () => {
      expect(service.isSupportedType("image/png")).toBe(false);
      expect(service.isSupportedType("application/json")).toBe(false);
      expect(service.isSupportedType("text/html")).toBe(false);
    });
  });

  describe("extractText", () => {
    describe("PDF extraction", () => {
      it("should extract text from PDF successfully", async () => {
        const mockBuffer = Buffer.from("fake pdf content");
        const mockPdfData = { text: "Extracted PDF text content" };
        
        vi.mocked(pdfParse).mockResolvedValue(mockPdfData as any);

        const result = await service.extractText(mockBuffer, "application/pdf");

        expect(result.text).toBe("Extracted PDF text content");
        expect(result.wordCount).toBe(4);
        expect(result.characterCount).toBe(26);
        expect(pdfParse).toHaveBeenCalledWith(mockBuffer);
      });

      it("should throw DocumentParseError when PDF parsing fails", async () => {
        const mockBuffer = Buffer.from("corrupted pdf");
        vi.mocked(pdfParse).mockRejectedValue(new Error("PDF parse error"));

        await expect(
          service.extractText(mockBuffer, "application/pdf")
        ).rejects.toThrow(DocumentParseError);

        try {
          await service.extractText(mockBuffer, "application/pdf");
        } catch (error) {
          expect(error).toBeInstanceOf(DocumentParseError);
          expect((error as DocumentParseError).mimeType).toBe("application/pdf");
          expect((error as DocumentParseError).message).toContain(
            "Failed to extract text from PDF"
          );
        }
      });
    });

    describe("Word document extraction", () => {
      it("should extract text from .docx file successfully", async () => {
        const mockBuffer = Buffer.from("fake docx content");
        vi.mocked(mammoth.extractRawText).mockResolvedValue({
          value: "Extracted Word document text",
          messages: [],
        });

        const result = await service.extractText(
          mockBuffer,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );

        expect(result.text).toBe("Extracted Word document text");
        expect(result.wordCount).toBe(4);
        expect(mammoth.extractRawText).toHaveBeenCalledWith({
          buffer: mockBuffer,
        });
      });

      it("should extract text from .doc file successfully", async () => {
        const mockBuffer = Buffer.from("fake doc content");
        vi.mocked(mammoth.extractRawText).mockResolvedValue({
          value: "Old Word format text",
          messages: [],
        });

        const result = await service.extractText(
          mockBuffer,
          "application/msword"
        );

        expect(result.text).toBe("Old Word format text");
        expect(result.wordCount).toBe(4);
      });

      it("should throw DocumentParseError when Word parsing fails", async () => {
        const mockBuffer = Buffer.from("corrupted docx");
        vi.mocked(mammoth.extractRawText).mockRejectedValue(
          new Error("Word parse error")
        );

        await expect(
          service.extractText(
            mockBuffer,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          )
        ).rejects.toThrow(DocumentParseError);
      });
    });

    describe("Plain text extraction", () => {
      it("should extract text from plain text file", async () => {
        const textContent = "Simple plain text content for testing";
        const mockBuffer = Buffer.from(textContent, "utf-8");

        const result = await service.extractText(mockBuffer, "text/plain");

        expect(result.text).toBe(textContent);
        expect(result.wordCount).toBe(6);
        expect(result.characterCount).toBe(37);
      });

      it("should handle UTF-8 encoded text", async () => {
        const textContent = "Unicode: café, naïve, 日本語";
        const mockBuffer = Buffer.from(textContent, "utf-8");

        const result = await service.extractText(mockBuffer, "text/plain");

        expect(result.text).toBe(textContent);
      });

      it("should trim whitespace from extracted text", async () => {
        const textContent = "  \n  Padded text  \n  ";
        const mockBuffer = Buffer.from(textContent, "utf-8");

        const result = await service.extractText(mockBuffer, "text/plain");

        expect(result.text).toBe("Padded text");
      });
    });

    describe("Unsupported types", () => {
      it("should throw DocumentParseError for unsupported MIME types", async () => {
        const mockBuffer = Buffer.from("some content");

        await expect(
          service.extractText(mockBuffer, "image/png")
        ).rejects.toThrow(DocumentParseError);

        try {
          await service.extractText(mockBuffer, "image/png");
        } catch (error) {
          expect(error).toBeInstanceOf(DocumentParseError);
          expect((error as DocumentParseError).message).toContain(
            "Unsupported file type"
          );
          expect((error as DocumentParseError).mimeType).toBe("image/png");
        }
      });
    });
  });

  describe("validateNotEmpty", () => {
    it("should not throw for non-empty content", () => {
      const result = {
        text: "Some content",
        wordCount: 2,
        characterCount: 12,
      };

      expect(() => service.validateNotEmpty(result)).not.toThrow();
    });

    it("should throw DocumentParseError for empty text", () => {
      const result = {
        text: "",
        wordCount: 0,
        characterCount: 0,
      };

      expect(() => service.validateNotEmpty(result)).toThrow(DocumentParseError);
      expect(() => service.validateNotEmpty(result)).toThrow(
        "document appears to be empty"
      );
    });

    it("should throw for whitespace-only content after trimming", () => {
      const result = {
        text: "",  // After trimming whitespace-only becomes empty
        wordCount: 0,
        characterCount: 0,
      };

      expect(() => service.validateNotEmpty(result)).toThrow(DocumentParseError);
    });
  });

  describe("getSupportedTypesDescription", () => {
    it("should return human-readable description of supported types", () => {
      const description = service.getSupportedTypesDescription();

      expect(description).toContain("PDF");
      expect(description).toContain("Word");
      expect(description).toContain("text");
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton documentService instance", () => {
      expect(documentService).toBeInstanceOf(DocumentService);
    });

    it("should have all methods available on singleton", () => {
      expect(typeof documentService.extractText).toBe("function");
      expect(typeof documentService.isSupportedType).toBe("function");
      expect(typeof documentService.validateNotEmpty).toBe("function");
      expect(typeof documentService.getSupportedTypesDescription).toBe("function");
    });
  });

  describe("SUPPORTED_TYPES static property", () => {
    it("should contain all supported MIME types", () => {
      expect(DocumentService.SUPPORTED_TYPES).toContain("application/pdf");
      expect(DocumentService.SUPPORTED_TYPES).toContain(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(DocumentService.SUPPORTED_TYPES).toContain("application/msword");
      expect(DocumentService.SUPPORTED_TYPES).toContain("text/plain");
    });

    it("should be readonly array", () => {
      expect(Array.isArray(DocumentService.SUPPORTED_TYPES)).toBe(true);
      expect(DocumentService.SUPPORTED_TYPES).toHaveLength(4);
    });
  });

  describe("DocumentParseError", () => {
    it("should create error with mimeType", () => {
      const error = new DocumentParseError("Test error", "application/pdf");

      expect(error.message).toBe("Test error");
      expect(error.mimeType).toBe("application/pdf");
      expect(error.name).toBe("DocumentParseError");
    });

    it("should include original error when provided", () => {
      const originalError = new Error("Original cause");
      const error = new DocumentParseError(
        "Wrapper error",
        "application/pdf",
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });
  });
});

