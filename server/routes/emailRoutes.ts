import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { asyncHandler, createError } from "../errorHandler";
import { ReportService } from "../services/reportService";

const router = Router();

// Send report via email
router.post('/send-report', isAuthenticated, asyncHandler(async (req, res) => {
  const { sendProjectReport, sendPortfolioSummary } = await import('../outlook');
  const { ReportServiceError } = await import('../services/reportService');
  const { projectId, reportType, recipients } = req.body;
  
  if (!reportType || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw createError.badRequest("reportType and recipients array are required");
  }

  const reportService = new ReportService(storage);

  try {
    // Check if this is a portfolio summary (all active projects)
    if (reportType === 'summary' && (!projectId || projectId === 'all')) {
      const projectsData = await reportService.getPortfolioSummaryData();
      
      await sendPortfolioSummary(projectsData, recipients);
      
      res.json({ 
        message: "Portfolio summary sent successfully",
        recipientCount: recipients.length,
        projectCount: projectsData.length
      });
      return;
    }

    // Single project report
    if (!projectId) {
      throw createError.badRequest("projectId is required for non-portfolio reports");
    }

    const reportData = await reportService.getSingleProjectReportData(projectId, reportType);
    
    // Get project name for email (service already validated project exists)
    const project = await storage.getProject(projectId);
    
    await sendProjectReport(project!.name, reportType, reportData, recipients);
    
    res.json({ 
      message: "Report sent successfully",
      recipientCount: recipients.length 
    });
  } catch (error) {
    if (error instanceof ReportServiceError) {
      if (error.statusCode === 404) {
        throw createError.notFound(error.message);
      } else if (error.statusCode === 400) {
        throw createError.badRequest(error.message);
      } else {
        throw createError.internal(error.message);
      }
    }
    throw error;
  }
}));

export default router;