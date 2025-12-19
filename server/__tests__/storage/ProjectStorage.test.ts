/**
 * Unit tests for ProjectStorage module
 * 
 * Tests project CRUD operations with mocked database instance.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock the db module before importing ProjectStorage
vi.mock("../../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
    $count: vi.fn(),
  },
}));

// Mock the shared schema to avoid actual schema import issues in tests
vi.mock("@shared/schema", () => ({
  projects: {
    id: Symbol("id"),
    name: Symbol("name"),
    description: Symbol("description"),
    status: Symbol("status"),
    createdAt: Symbol("createdAt"),
    startDate: Symbol("startDate"),
    endDate: Symbol("endDate"),
    budget: Symbol("budget"),
  },
  tasks: {
    id: Symbol("id"),
    title: Symbol("title"),
    projectId: Symbol("projectId"),
  },
  insertTaskSchema: {
    parse: vi.fn((data) => data),
  },
}));

// Import after mocking
import { ProjectStorage } from "../../storage/ProjectStorage";
import { db } from "../../db";

// Mock project data
const mockProject = {
  id: 1,
  name: "Test Project",
  description: "A test project description",
  status: "active",
  managerId: "user-123",
  budget: "50000",
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-12-31"),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockProject2 = {
  ...mockProject,
  id: 2,
  name: "Another Project",
  description: "Another project description",
  status: "on_hold",
};

describe("ProjectStorage", () => {
  let projectStorage: ProjectStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    projectStorage = new ProjectStorage();
  });

  describe("getProjects", () => {
    it("should return all projects ordered by createdAt desc", async () => {
      const allProjects = [mockProject, mockProject2];

      const mockFrom = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(allProjects);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ orderBy: mockOrderBy });

      const result = await projectStorage.getProjects();

      expect(result).toEqual(allProjects);
      expect(result).toHaveLength(2);
      expect(db.select).toHaveBeenCalled();
    });

    it("should return empty array when no projects exist", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue([]);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ orderBy: mockOrderBy });

      const result = await projectStorage.getProjects();

      expect(result).toEqual([]);
    });

    it("should filter projects by search query in name", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue([mockProject]);
      
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });

      const result = await projectStorage.getProjects("Test");

      expect(result).toEqual([mockProject]);
      expect(result).toHaveLength(1);
    });

    it("should filter projects by search query in description", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue([mockProject2]);
      
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });

      const result = await projectStorage.getProjects("Another");

      expect(result).toEqual([mockProject2]);
    });
  });

  describe("getProject", () => {
    it("should return a project when found by ID", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([mockProject]);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });

      const result = await projectStorage.getProject(1);

      expect(result).toEqual(mockProject);
    });

    it("should return undefined when project is not found", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([]);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });

      const result = await projectStorage.getProject(999);

      expect(result).toBeUndefined();
    });
  });

  describe("createProject", () => {
    it("should create and return a new project", async () => {
      const newProjectData = {
        name: "New Project",
        description: "New project description",
        managerId: "user-456",
      };

      const createdProject = { ...mockProject, ...newProjectData, id: 3 };

      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([createdProject]);
      (db.insert as Mock).mockReturnValue({ values: mockValues });
      mockValues.mockReturnValue({ returning: mockReturning });

      const result = await projectStorage.createProject(newProjectData);

      expect(result).toEqual(createdProject);
      expect(result.name).toBe("New Project");
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("updateProject", () => {
    it("should update project and return updated data", async () => {
      const updatedProject = { ...mockProject, name: "Updated Project Name" };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([updatedProject]);

      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });

      const result = await projectStorage.updateProject(1, {
        name: "Updated Project Name",
      });

      expect(result.name).toBe("Updated Project Name");
      expect(db.update).toHaveBeenCalled();
    });

    it("should update project status", async () => {
      const updatedProject = { ...mockProject, status: "completed" };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([updatedProject]);

      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });

      const result = await projectStorage.updateProject(1, {
        status: "completed",
      });

      expect(result.status).toBe("completed");
    });

    it("should handle string dates by converting to Date objects", async () => {
      const updatedProject = {
        ...mockProject,
        startDate: new Date("2024-06-01"),
      };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([updatedProject]);

      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });

      const result = await projectStorage.updateProject(1, {
        startDate: "2024-06-01" as any, // String date that should be converted
      });

      expect(result.startDate).toEqual(new Date("2024-06-01"));
    });

    it("should update multiple fields at once", async () => {
      const updatedProject = {
        ...mockProject,
        name: "Renamed Project",
        description: "New description",
        status: "on_hold",
      };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([updatedProject]);

      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });

      const result = await projectStorage.updateProject(1, {
        name: "Renamed Project",
        description: "New description",
        status: "on_hold",
      });

      expect(result.name).toBe("Renamed Project");
      expect(result.description).toBe("New description");
      expect(result.status).toBe("on_hold");
    });
  });

  describe("deleteProject", () => {
    it("should delete project successfully", async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      (db.delete as Mock).mockReturnValue({ where: mockWhere });

      await expect(projectStorage.deleteProject(1)).resolves.not.toThrow();
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("getProjectsPaginated", () => {
    it("should return paginated results with default values", async () => {
      const paginatedProjects = [mockProject, mockProject2];

      // Mock the Promise.all results
      const mockFromData = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(paginatedProjects);

      const mockFromCount = vi.fn().mockResolvedValue([{ count: 2 }]);
      const mockFromStats = vi.fn().mockResolvedValue([{
        total: 2,
        active: 1,
        onHold: 1,
        totalBudget: 100000,
      }]);

      (db.select as Mock)
        .mockReturnValueOnce({ from: mockFromData })
        .mockReturnValueOnce({ from: mockFromCount })
        .mockReturnValueOnce({ from: mockFromStats });

      mockFromData.mockReturnValue({ orderBy: mockOrderBy });
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ offset: mockOffset });

      const result = await projectStorage.getProjectsPaginated();

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(false);
    });

    it("should apply custom pagination parameters", async () => {
      const paginatedProjects = [mockProject];

      const mockFromData = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(paginatedProjects);

      const mockFromCount = vi.fn().mockResolvedValue([{ count: 10 }]);
      const mockFromStats = vi.fn().mockResolvedValue([{
        total: 10,
        active: 5,
        onHold: 3,
        totalBudget: 500000,
      }]);

      (db.select as Mock)
        .mockReturnValueOnce({ from: mockFromData })
        .mockReturnValueOnce({ from: mockFromCount })
        .mockReturnValueOnce({ from: mockFromStats });

      mockFromData.mockReturnValue({ orderBy: mockOrderBy });
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ offset: mockOffset });

      const result = await projectStorage.getProjectsPaginated(undefined, {
        page: 2,
        limit: 5,
        sortBy: "name",
        sortOrder: "asc",
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(true);
    });

    it("should include stats in the result", async () => {
      const mockFromData = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue([mockProject]);

      const mockFromCount = vi.fn().mockResolvedValue([{ count: 1 }]);
      const mockFromStats = vi.fn().mockResolvedValue([{
        total: 5,
        active: 3,
        onHold: 2,
        totalBudget: 250000,
      }]);

      (db.select as Mock)
        .mockReturnValueOnce({ from: mockFromData })
        .mockReturnValueOnce({ from: mockFromCount })
        .mockReturnValueOnce({ from: mockFromStats });

      mockFromData.mockReturnValue({ orderBy: mockOrderBy });
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ offset: mockOffset });

      const result = await projectStorage.getProjectsPaginated();

      expect(result.stats).toBeDefined();
      expect(result.stats?.total).toBe(5);
      expect(result.stats?.active).toBe(3);
      expect(result.stats?.onHold).toBe(2);
      expect(result.stats?.totalBudget).toBe(250000);
    });
  });

  describe("createProjectWithTasks", () => {
    it("should create project and tasks in a transaction", async () => {
      const projectData = {
        name: "SOW Project",
        description: "Created from SOW",
        managerId: "user-123",
      };

      const taskList = [
        { title: "Task 1", description: "First task" },
        { title: "Task 2", description: "Second task" },
      ];

      const createdProject = { ...mockProject, ...projectData, id: 5 };
      const createdTasks = [
        { id: 1, title: "Task 1", projectId: 5, status: "todo" },
        { id: 2, title: "Task 2", projectId: 5, status: "todo" },
      ];

      // Mock transaction
      (db.transaction as Mock).mockImplementation(async (callback) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn()
                .mockResolvedValueOnce([createdProject])
                .mockResolvedValueOnce(createdTasks),
            }),
          }),
        };
        return callback(tx);
      });

      const result = await projectStorage.createProjectWithTasks(
        projectData,
        taskList
      );

      expect(result.project).toEqual(createdProject);
      expect(result.tasks).toHaveLength(2);
      expect(result.failedTasks).toHaveLength(0);
      expect(db.transaction).toHaveBeenCalled();
    });

    it("should handle empty task list", async () => {
      const projectData = {
        name: "Empty Project",
        description: "No tasks",
        managerId: "user-123",
      };

      const createdProject = { ...mockProject, ...projectData, id: 6 };

      (db.transaction as Mock).mockImplementation(async (callback) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValueOnce([createdProject]),
            }),
          }),
        };
        return callback(tx);
      });

      const result = await projectStorage.createProjectWithTasks(
        projectData,
        []
      );

      expect(result.project).toEqual(createdProject);
      expect(result.tasks).toHaveLength(0);
      expect(result.failedTasks).toHaveLength(0);
    });

    it("should track failed task validations", async () => {
      const projectData = {
        name: "Mixed Results Project",
        managerId: "user-123",
      };

      const createdProject = { ...mockProject, ...projectData, id: 7 };

      // Mock the insertTaskSchema.parse to throw for invalid tasks
      const { insertTaskSchema } = await import("@shared/schema");
      (insertTaskSchema.parse as Mock)
        .mockImplementationOnce((data) => data) // First task passes
        .mockImplementationOnce(() => {
          throw new Error("Validation failed");
        }); // Second task fails

      const taskList = [
        { title: "Valid Task", description: "This works" },
        { title: "Invalid Task", description: "This fails" },
      ];

      (db.transaction as Mock).mockImplementation(async (callback) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn()
                .mockResolvedValueOnce([createdProject])
                .mockResolvedValueOnce([
                  { id: 1, title: "Valid Task", projectId: 7 },
                ]),
            }),
          }),
        };
        return callback(tx);
      });

      const result = await projectStorage.createProjectWithTasks(
        projectData,
        taskList
      );

      expect(result.project).toEqual(createdProject);
      expect(result.tasks).toHaveLength(1);
      expect(result.failedTasks).toHaveLength(1);
      expect(result.failedTasks[0].title).toBe("Invalid Task");
    });
  });
});

