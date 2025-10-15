import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { asyncHandler } from "../errorHandler";

const router = Router();

// Get active projects debug info
router.get('/active-projects', isAuthenticated, asyncHandler(async (req, res) => {
  // Get all projects from storage
  const allProjects = await storage.getProjects();
  const activeProjects = allProjects.filter(p => p.status === 'active');
  
  // For each active project, get task count
  const projectsWithTasks = await Promise.all(
    activeProjects.map(async (project) => {
      const tasks = await storage.getTasks(project.id);
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        taskCount: tasks.length,
        firstThreeTasks: tasks.slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status
        }))
      };
    })
  );
  
  res.json({
    totalProjects: allProjects.length,
    activeProjects: activeProjects.length,
    projectsWithTasks
  });
}));

// Additional debug routes can be added here as needed

export default router;