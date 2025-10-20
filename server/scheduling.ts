import type { Task, TaskDependency } from "@shared/schema";

export interface ScheduleUpdateResult {
  updatedTasks: Task[];
  criticalPath: number[];
  violations: DependencyViolation[];
}

export interface DependencyViolation {
  taskId: number;
  dependencyId: number;
  message: string;
}

interface TaskNode {
  task: Task;
  predecessors: { dependency: TaskDependency; task: Task }[];
  successors: { dependency: TaskDependency; task: Task }[];
  earlyStart: Date | null;
  earlyFinish: Date | null;
  lateStart: Date | null;
  lateFinish: Date | null;
  slack: number;
}

export class SchedulingEngine {
  private tasks: Map<number, TaskNode>;
  
  constructor(tasks: Task[], dependencies: TaskDependency[]) {
    this.tasks = new Map();
    
    // Initialize task nodes
    tasks.forEach(task => {
      this.tasks.set(task.id, {
        task,
        predecessors: [],
        successors: [],
        earlyStart: null,
        earlyFinish: null,
        lateStart: null,
        lateFinish: null,
        slack: 0,
      });
    });
    
    // Build dependency relationships
    dependencies.forEach(dep => {
      const successor = this.tasks.get(dep.successorId);
      const predecessor = this.tasks.get(dep.predecessorId);
      
      if (successor && predecessor) {
        successor.predecessors.push({ dependency: dep, task: predecessor.task });
        predecessor.successors.push({ dependency: dep, task: successor.task });
      }
    });
  }
  
  /**
   * Calculate the Critical Path Method (CPM) and update task critical path flags
   */
  calculateCriticalPath(): number[] {
    // Forward pass - calculate early start and early finish
    this.forwardPass();
    
    // Backward pass - calculate late start and late finish
    this.backwardPass();
    
    // Calculate slack and identify critical path
    const criticalPath: number[] = [];
    
    this.tasks.forEach((node, taskId) => {
      if (node.earlyStart && node.lateStart && node.earlyFinish && node.lateFinish) {
        node.slack = Math.floor(
          (node.lateStart.getTime() - node.earlyStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Tasks with zero slack are on the critical path
        if (node.slack === 0) {
          criticalPath.push(taskId);
          node.task.isOnCriticalPath = true;
        } else {
          node.task.isOnCriticalPath = false;
        }
      }
    });
    
    return criticalPath;
  }
  
  /**
   * Forward pass: Calculate early start and early finish dates
   */
  private forwardPass() {
    const visited = new Set<number>();
    
    const visit = (taskId: number) => {
      if (visited.has(taskId)) return;
      
      const node = this.tasks.get(taskId);
      if (!node) return;
      
      // Visit all predecessors first
      node.predecessors.forEach(({ task }) => visit(task.id));
      
      // Calculate early start/finish based on predecessors
      if (node.predecessors.length === 0) {
        // No predecessors - use task's own start date or project start
        node.earlyStart = node.task.startDate ? new Date(node.task.startDate) : new Date();
        const duration = this.calculateTaskDuration(node.task);
        node.earlyFinish = new Date(node.earlyStart);
        node.earlyFinish.setDate(node.earlyFinish.getDate() + duration);
      } else {
        let maxConstraintStart: Date | null = null;
        let maxConstraintFinish: Date | null = null;
        
        node.predecessors.forEach(({ dependency, task: predTask }) => {
          const predNode = this.tasks.get(predTask.id);
          if (!predNode || !predNode.earlyStart || !predNode.earlyFinish) return;
          
          const depType = dependency.type as 'fs' | 'ss' | 'ff' | 'sf';
          const lag = dependency.lag || 0;
          
          if (depType === 'fs' || depType === 'ss') {
            // These constrain the successor's START
            const constraintDate = this.calculateConstraintDate(
              predNode.earlyStart,
              predNode.earlyFinish,
              depType,
              lag,
              'early',
              'start'
            );
            if (!maxConstraintStart || constraintDate > maxConstraintStart) {
              maxConstraintStart = constraintDate;
            }
          } else {
            // FF and SF constrain the successor's FINISH
            const constraintDate = this.calculateConstraintDate(
              predNode.earlyStart,
              predNode.earlyFinish,
              depType,
              lag,
              'early',
              'finish'
            );
            if (!maxConstraintFinish || constraintDate > maxConstraintFinish) {
              maxConstraintFinish = constraintDate;
            }
          }
        });
        
        const duration = this.calculateTaskDuration(node.task);
        
        // Set early start and finish based on constraints
        if (maxConstraintFinish) {
          // Finish is constrained, calculate start backwards
          node.earlyFinish = maxConstraintFinish;
          node.earlyStart = new Date(node.earlyFinish);
          node.earlyStart.setDate(node.earlyStart.getDate() - duration);
          
          // Also check if start constraint pushes us later
          if (maxConstraintStart && node.earlyStart) {
            const startTime = node.earlyStart.getTime();
            const constraintTime = (maxConstraintStart as Date).getTime();
            if (startTime < constraintTime) {
              node.earlyStart = maxConstraintStart;
              node.earlyFinish = new Date(node.earlyStart);
              node.earlyFinish.setDate(node.earlyFinish.getDate() + duration);
            }
          }
        } else if (maxConstraintStart) {
          // Only start is constrained
          node.earlyStart = maxConstraintStart;
          node.earlyFinish = new Date(node.earlyStart);
          node.earlyFinish.setDate(node.earlyFinish.getDate() + duration);
        } else {
          // Shouldn't happen, but fallback
          node.earlyStart = new Date();
          node.earlyFinish = new Date(node.earlyStart);
          node.earlyFinish.setDate(node.earlyFinish.getDate() + duration);
        }
      }
      
      visited.add(taskId);
    };
    
    // Visit all tasks
    this.tasks.forEach((_, taskId) => visit(taskId));
  }
  
  /**
   * Backward pass: Calculate late start and late finish dates
   */
  private backwardPass() {
    // Find project end date (maximum early finish)
    let projectEnd: Date | null = null;
    this.tasks.forEach(node => {
      if (node.earlyFinish && (!projectEnd || node.earlyFinish > projectEnd)) {
        projectEnd = node.earlyFinish;
      }
    });
    
    if (!projectEnd) return;
    
    const visited = new Set<number>();
    
    const visit = (taskId: number) => {
      if (visited.has(taskId)) return;
      
      const node = this.tasks.get(taskId);
      if (!node) return;
      
      // Visit all successors first
      node.successors.forEach(({ task }) => visit(task.id));
      
      // Calculate late finish/start based on successors
      if (node.successors.length === 0) {
        // No successors - use project end date
        node.lateFinish = new Date(projectEnd!);
        const duration = this.calculateTaskDuration(node.task);
        node.lateStart = new Date(node.lateFinish);
        node.lateStart.setDate(node.lateStart.getDate() - duration);
      } else {
        let minConstraintStart: Date | null = null;
        let minConstraintFinish: Date | null = null;
        
        node.successors.forEach(({ dependency, task: succTask }) => {
          const succNode = this.tasks.get(succTask.id);
          if (!succNode || !succNode.lateStart || !succNode.lateFinish) return;
          
          const depType = dependency.type as 'fs' | 'ss' | 'ff' | 'sf';
          const lag = dependency.lag || 0;
          
          if (depType === 'fs') {
            // FS: This task's finish constrains successor's start
            // Late finish = successor's late start - lag
            const constraintDate = new Date(succNode.lateStart);
            constraintDate.setDate(constraintDate.getDate() - lag);
            if (!minConstraintFinish || constraintDate < minConstraintFinish) {
              minConstraintFinish = constraintDate;
            }
          } else if (depType === 'ss') {
            // SS: This task's start constrains successor's start
            // Late start = successor's late start - lag
            const constraintDate = new Date(succNode.lateStart);
            constraintDate.setDate(constraintDate.getDate() - lag);
            if (!minConstraintStart || constraintDate < minConstraintStart) {
              minConstraintStart = constraintDate;
            }
          } else if (depType === 'ff') {
            // FF: This task's finish constrains successor's finish
            // Late finish = successor's late finish - lag
            const constraintDate = new Date(succNode.lateFinish);
            constraintDate.setDate(constraintDate.getDate() - lag);
            if (!minConstraintFinish || constraintDate < minConstraintFinish) {
              minConstraintFinish = constraintDate;
            }
          } else if (depType === 'sf') {
            // SF: This task's start constrains successor's finish
            // Late start = successor's late finish - lag
            const constraintDate = new Date(succNode.lateFinish);
            constraintDate.setDate(constraintDate.getDate() - lag);
            if (!minConstraintStart || constraintDate < minConstraintStart) {
              minConstraintStart = constraintDate;
            }
          }
        });
        
        const duration = this.calculateTaskDuration(node.task);
        
        // Set late start and finish based on constraints
        if (minConstraintFinish && minConstraintStart) {
          // Both constrained, use the earlier one
          node.lateFinish = minConstraintFinish;
          node.lateStart = new Date(node.lateFinish);
          node.lateStart.setDate(node.lateStart.getDate() - duration);
          
          // Check if start constraint is tighter
          const startTime = (node.lateStart as Date).getTime();
          const constraintTime = (minConstraintStart as Date).getTime();
          if (startTime > constraintTime) {
            node.lateStart = minConstraintStart;
            node.lateFinish = new Date(node.lateStart);
            node.lateFinish.setDate(node.lateFinish.getDate() + duration);
          }
        } else if (minConstraintFinish) {
          // Only finish is constrained
          node.lateFinish = minConstraintFinish;
          node.lateStart = new Date(node.lateFinish);
          node.lateStart.setDate(node.lateStart.getDate() - duration);
        } else if (minConstraintStart) {
          // Only start is constrained
          node.lateStart = minConstraintStart;
          node.lateFinish = new Date(node.lateStart);
          node.lateFinish.setDate(node.lateFinish.getDate() + duration);
        } else {
          // Shouldn't happen, but fallback to project end
          node.lateFinish = new Date(projectEnd!);
          node.lateStart = new Date(node.lateFinish);
          node.lateStart.setDate(node.lateStart.getDate() - duration);
        }
      }
      
      visited.add(taskId);
    };
    
    // Visit all tasks in reverse topological order
    this.tasks.forEach((_, taskId) => visit(taskId));
  }
  
  /**
   * Calculate constraint date based on dependency type and lag
   */
  private calculateConstraintDate(
    predStart: Date,
    predFinish: Date,
    depType: 'fs' | 'ss' | 'ff' | 'sf',
    lag: number,
    direction: 'early' | 'late',
    constraintType: 'start' | 'finish' = 'start'
  ): Date {
    let baseDate: Date;
    
    // Determine base date based on dependency type
    switch (depType) {
      case 'fs': // Finish-to-Start: successor starts after predecessor finishes
        baseDate = new Date(predFinish);
        break;
      case 'ss': // Start-to-Start: successor starts after predecessor starts
        baseDate = new Date(predStart);
        break;
      case 'ff': // Finish-to-Finish: successor finishes after predecessor finishes
        baseDate = new Date(predFinish);
        break;
      case 'sf': // Start-to-Finish: successor finishes after predecessor starts
        baseDate = new Date(predStart);
        break;
      default:
        baseDate = new Date(predFinish);
    }
    
    // Apply lag based on direction
    const result = new Date(baseDate);
    if (direction === 'early') {
      // Forward pass: add lag (positive = delay, negative = lead)
      result.setDate(result.getDate() + lag);
    } else {
      // Backward pass: subtract lag (to find when predecessor must finish/start)
      result.setDate(result.getDate() - lag);
    }
    
    return result;
  }
  
  /**
   * Calculate task duration in days
   */
  private calculateTaskDuration(task: Task): number {
    if (task.isMilestone) return 0;
    
    if (task.startDate && task.dueDate) {
      const start = new Date(task.startDate);
      const end = new Date(task.dueDate);
      return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
    
    // Default duration if dates not set
    return task.duration ? Math.ceil(task.duration / 8) : 1; // Convert hours to days (8-hour workday)
  }
  
  /**
   * Validate if a task date change violates any dependencies
   */
  validateTaskDateChange(taskId: number, newStartDate: Date, newDueDate: Date): DependencyViolation[] {
    const violations: DependencyViolation[] = [];
    const node = this.tasks.get(taskId);
    
    if (!node) return violations;
    
    // Check predecessor constraints
    node.predecessors.forEach(({ dependency, task: predTask }) => {
      const predNode = this.tasks.get(predTask.id);
      if (!predNode || !predNode.task.startDate || !predNode.task.dueDate) return;
      
      const predStart = new Date(predNode.task.startDate);
      const predFinish = new Date(predNode.task.dueDate);
      
      const constraintDate = this.calculateConstraintDate(
        predStart,
        predFinish,
        dependency.type as 'fs' | 'ss' | 'ff' | 'sf',
        dependency.lag || 0,
        'early'
      );
      
      let violates = false;
      let message = '';
      
      switch (dependency.type) {
        case 'fs': // Finish-to-Start
          if (newStartDate < constraintDate) {
            violates = true;
            message = `Task cannot start before ${predTask.title} finishes`;
          }
          break;
        case 'ss': // Start-to-Start
          if (newStartDate < constraintDate) {
            violates = true;
            message = `Task cannot start before ${predTask.title} starts`;
          }
          break;
        case 'ff': // Finish-to-Finish
          if (newDueDate < constraintDate) {
            violates = true;
            message = `Task cannot finish before ${predTask.title} finishes`;
          }
          break;
        case 'sf': // Start-to-Finish
          if (newDueDate < constraintDate) {
            violates = true;
            message = `Task cannot finish before ${predTask.title} starts`;
          }
          break;
      }
      
      if (violates) {
        if (dependency.lag) {
          message += ` (with ${dependency.lag > 0 ? '+' : ''}${dependency.lag} day lag)`;
        }
        violations.push({
          taskId,
          dependencyId: dependency.id,
          message,
        });
      }
    });
    
    return violations;
  }
  
  /**
   * Update task dates and cascade changes to dependent tasks
   */
  cascadeScheduleUpdate(taskId: number, newStartDate: Date, newDueDate: Date): Task[] {
    const updatedTasks: Task[] = [];
    const node = this.tasks.get(taskId);
    
    if (!node) return updatedTasks;
    
    // Update the task itself
    node.task.startDate = newStartDate;
    node.task.dueDate = newDueDate;
    updatedTasks.push({ ...node.task });
    
    // Cascade to successors using topological sort
    const visited = new Set<number>();
    const queue: number[] = [taskId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      const currentNode = this.tasks.get(currentId);
      if (!currentNode) continue;
      
      // Update each successor based on this task
      currentNode.successors.forEach(({ dependency, task: succTask }) => {
        const succNode = this.tasks.get(succTask.id);
        if (!succNode) return;
        
        // Calculate new start date for successor
        const currentStart = currentNode.task.startDate ? new Date(currentNode.task.startDate) : new Date();
        const currentFinish = currentNode.task.dueDate ? new Date(currentNode.task.dueDate) : new Date();
        
        const newSuccessorStartDate = this.calculateConstraintDate(
          currentStart,
          currentFinish,
          dependency.type as 'fs' | 'ss' | 'ff' | 'sf',
          dependency.lag || 0,
          'early'
        );
        
        // Calculate successor's duration
        const succDuration = this.calculateTaskDuration(succNode.task);
        const newSuccessorDueDate = new Date(newSuccessorStartDate);
        
        if (dependency.type === 'ff') {
          // For Finish-to-Finish, calculate backwards from finish date
          newSuccessorDueDate.setDate(newSuccessorStartDate.getDate());
          newSuccessorStartDate.setDate(newSuccessorStartDate.getDate() - succDuration);
        } else {
          newSuccessorDueDate.setDate(newSuccessorStartDate.getDate() + succDuration);
        }
        
        // Only update if the constraint pushes the successor later
        const existingStart = succNode.task.startDate ? new Date(succNode.task.startDate) : new Date(0);
        
        if (newSuccessorStartDate > existingStart) {
          succNode.task.startDate = newSuccessorStartDate;
          succNode.task.dueDate = newSuccessorDueDate;
          
          // Check if this task was already updated
          const existingIndex = updatedTasks.findIndex(t => t.id === succTask.id);
          if (existingIndex >= 0) {
            updatedTasks[existingIndex] = { ...succNode.task };
          } else {
            updatedTasks.push({ ...succNode.task });
          }
          
          // Queue successors of this task
          queue.push(succTask.id);
        }
      });
    }
    
    return updatedTasks;
  }
  
  /**
   * Get all updated tasks with critical path calculated
   */
  getUpdatedTasks(): Task[] {
    return Array.from(this.tasks.values()).map(node => node.task);
  }
}
