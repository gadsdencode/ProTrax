import type { IStorage } from '../storage';
import type { User, Project, Task } from '@shared/schema';

export interface EnrichedTask extends Task {
  assigneeName: string;
  assigneeEmail: string | null;
}

export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  progress: number;
}

export interface ProjectReportData {
  id: number;
  name: string;
  description: string | null;
  status: string | null;
  manager: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  progress: number;
  tasks: EnrichedTask[];
}

export interface StatusReportData {
  overallStatus: 'on_track' | 'at_risk' | 'delayed';
  progress: number;
  accomplishments: EnrichedTask[];
  upcoming: EnrichedTask[];
  risks: any[];
  tasks: EnrichedTask[];
}

export class ReportService {
  constructor(private storage: IStorage) {}

  private createUserMap(users: User[]): Map<string, User> {
    return new Map(users.map((u) => [u.id, u]));
  }

  private enrichTasksWithAssigneeNames(
    tasks: Task[],
    userMap: Map<string, User>
  ): EnrichedTask[] {
    return tasks.map(task => {
      const assignee = task.assigneeId ? userMap.get(task.assigneeId) : null;
      const assigneeName = assignee
        ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.email || 'Unassigned'
        : 'Unassigned';
      
      return {
        ...task,
        assigneeName,
        assigneeEmail: assignee?.email || null
      };
    });
  }

  private calculateTaskStatistics(tasks: EnrichedTask[]): TaskStatistics {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      progress
    };
  }

  private getManagerName(managerId: string | null, userMap: Map<string, User>): string {
    if (!managerId) return 'N/A';
    
    const manager = userMap.get(managerId);
    if (!manager) return 'N/A';
    
    return `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email || 'N/A';
  }

  async getPortfolioSummaryData(): Promise<ProjectReportData[]> {
    console.log('[PORTFOLIO SERVICE] Starting portfolio data collection...');
    
    const allProjects = await this.storage.getProjects();
    console.log(`[PORTFOLIO SERVICE] Total projects in database: ${allProjects.length}`);
    
    const activeProjects = allProjects.filter(p => p.status === 'active');
    console.log(`[PORTFOLIO SERVICE] Active projects found: ${activeProjects.length}`);
    
    if (activeProjects.length === 0) {
      throw new Error("No active projects found");
    }

    const allUsers = await this.storage.getAllUsers();
    const userMap = this.createUserMap(allUsers);

    const projectsData = await Promise.all(
      activeProjects.map(async (project) => {
        console.log(`[PORTFOLIO SERVICE] Fetching tasks for project ${project.id} ("${project.name}")...`);
        const tasks = await this.storage.getTasks(project.id);
        console.log(`[PORTFOLIO SERVICE] Project ${project.id} has ${tasks.length} tasks`);
        
        if (!tasks || !Array.isArray(tasks)) {
          throw new Error(`Failed to fetch tasks for project ${project.id} ("${project.name}")`);
        }
        
        const enrichedTasks = this.enrichTasksWithAssigneeNames(tasks, userMap);
        const statistics = this.calculateTaskStatistics(enrichedTasks);
        const managerName = this.getManagerName(project.managerId, userMap);
        
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          manager: managerName,
          startDate: project.startDate,
          endDate: project.endDate,
          budget: project.budget,
          ...statistics,
          tasks: enrichedTasks
        };
      })
    );

    console.log(`[PORTFOLIO SERVICE] Prepared ${projectsData.length} projects for report`);
    const totalTasksInPortfolio = projectsData.reduce((sum, p) => sum + p.totalTasks, 0);
    console.log(`[PORTFOLIO SERVICE] Total tasks across all projects: ${totalTasksInPortfolio}`);
    
    return projectsData;
  }

  async getSingleProjectReportData(
    projectId: number,
    reportType: string
  ): Promise<any> {
    console.log(`[REPORT SERVICE] Fetching data for project ${projectId}, report type: ${reportType}`);
    
    const project = await this.storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const tasks = await this.storage.getTasks(projectId);
    console.log(`[REPORT SERVICE] Found ${tasks.length} tasks for project ${projectId}`);
    
    const allUsers = await this.storage.getAllUsers();
    const userMap = this.createUserMap(allUsers);
    
    const enrichedTasks = this.enrichTasksWithAssigneeNames(tasks, userMap);
    console.log(`[REPORT SERVICE] Successfully enriched ${enrichedTasks.length} tasks`);
    
    if (reportType === 'summary') {
      const statistics = this.calculateTaskStatistics(enrichedTasks);
      const managerName = this.getManagerName(project.managerId, userMap);
      
      console.log(`[REPORT SERVICE] Summary report statistics:`, statistics);
      
      return {
        description: project.description,
        status: project.status,
        manager: managerName,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget,
        ...statistics,
        tasks: enrichedTasks
      };
    } 
    
    if (reportType === 'status') {
      const statistics = this.calculateTaskStatistics(enrichedTasks);
      const risks = await this.storage.getRisks(projectId);
      
      const recentCompleted = enrichedTasks
        .filter(t => t.status === 'done')
        .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))
        .slice(0, 5);
      
      const upcomingTasks = enrichedTasks
        .filter(t => t.status === 'todo' || t.status === 'in_progress')
        .sort((a, b) => {
          if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        })
        .slice(0, 5);
      
      const overallStatus = statistics.progress >= 80 ? 'on_track' : 
                           statistics.progress >= 50 ? 'at_risk' : 'delayed';
      
      return {
        overallStatus,
        progress: statistics.progress,
        accomplishments: recentCompleted,
        upcoming: upcomingTasks,
        risks: risks.slice(0, 5),
        tasks: enrichedTasks
      };
    }
    
    // For gantt/kanban reports, return enriched tasks directly
    return enrichedTasks;
  }
}
