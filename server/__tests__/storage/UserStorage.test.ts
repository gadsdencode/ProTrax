/**
 * Unit tests for UserStorage module
 * 
 * Tests CRUD operations with mocked database instance.
 * Follows the pattern of dependency injection for testability.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { eq, sql } from "drizzle-orm";

// Mock the db module before importing UserStorage
vi.mock("../../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mocking
import { UserStorage } from "../../storage/UserStorage";
import { db } from "../../db";

// Mock user data
const mockUser = {
  id: "user-123",
  username: "johndoe",
  email: "john@example.com",
  firstName: "John",
  lastName: "Doe",
  profileImageUrl: null,
  role: "member" as const,
  weeklyCapacity: 40,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockAdminUser = {
  ...mockUser,
  id: "admin-456",
  username: "admin",
  email: "admin@example.com",
  role: "admin" as const,
};

describe("UserStorage", () => {
  let userStorage: UserStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    userStorage = new UserStorage();
  });

  describe("getUser", () => {
    it("should return a user when found by ID", async () => {
      // Setup mock chain
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([mockUser]);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });

      const result = await userStorage.getUser("user-123");

      expect(result).toEqual(mockUser);
      expect(db.select).toHaveBeenCalled();
    });

    it("should return undefined when user is not found", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([]);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });

      const result = await userStorage.getUser("nonexistent-id");

      expect(result).toBeUndefined();
    });
  });

  describe("getUserByUsername", () => {
    it("should return a user when found by username", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([mockUser]);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });

      const result = await userStorage.getUserByUsername("johndoe");

      expect(result).toEqual(mockUser);
    });

    it("should return undefined when username not found", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([]);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });

      const result = await userStorage.getUserByUsername("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("createUser", () => {
    it("should create and return a new user", async () => {
      const newUserData = {
        id: "new-user-789",
        username: "newuser",
        email: "new@example.com",
      };

      const createdUser = { ...mockUser, ...newUserData };

      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([createdUser]);
      (db.insert as Mock).mockReturnValue({ values: mockValues });
      mockValues.mockReturnValue({ returning: mockReturning });

      const result = await userStorage.createUser(newUserData);

      expect(result).toEqual(createdUser);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("upsertUser", () => {
    it("should insert a new user when ID does not exist", async () => {
      const userData = {
        id: "new-user-123",
        username: "newuser",
        email: "new@example.com",
      };

      const upsertedUser = { ...mockUser, ...userData };

      const mockValues = vi.fn().mockReturnThis();
      const mockOnConflict = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([upsertedUser]);

      (db.insert as Mock).mockReturnValue({ values: mockValues });
      mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflict });
      mockOnConflict.mockReturnValue({ returning: mockReturning });

      const result = await userStorage.upsertUser(userData);

      expect(result).toEqual(upsertedUser);
      expect(db.insert).toHaveBeenCalled();
    });

    it("should update existing user on conflict", async () => {
      const existingUserData = {
        id: "user-123",
        username: "johndoe",
        email: "john.updated@example.com",
      };

      const updatedUser = { ...mockUser, email: "john.updated@example.com" };

      const mockValues = vi.fn().mockReturnThis();
      const mockOnConflict = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([updatedUser]);

      (db.insert as Mock).mockReturnValue({ values: mockValues });
      mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflict });
      mockOnConflict.mockReturnValue({ returning: mockReturning });

      const result = await userStorage.upsertUser(existingUserData);

      expect(result.email).toBe("john.updated@example.com");
    });
  });

  describe("getAllUsers", () => {
    it("should return all users", async () => {
      const allUsers = [mockUser, mockAdminUser];

      const mockFrom = vi.fn().mockResolvedValue(allUsers);
      (db.select as Mock).mockReturnValue({ from: mockFrom });

      const result = await userStorage.getAllUsers();

      expect(result).toEqual(allUsers);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no users exist", async () => {
      const mockFrom = vi.fn().mockResolvedValue([]);
      (db.select as Mock).mockReturnValue({ from: mockFrom });

      const result = await userStorage.getAllUsers();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("updateUserRole", () => {
    it("should update user role successfully", async () => {
      const updatedUser = { ...mockUser, role: "admin" as const };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([updatedUser]);

      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });

      const result = await userStorage.updateUserRole("user-123", "admin");

      expect(result.role).toBe("admin");
      expect(db.update).toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([]);

      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });

      await expect(
        userStorage.updateUserRole("nonexistent-id", "admin")
      ).rejects.toThrow("User with id nonexistent-id not found");
    });
  });

  describe("updateUser", () => {
    it("should update user profile data", async () => {
      const updatedUser = { ...mockUser, firstName: "Jonathan" };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([updatedUser]);

      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });

      const result = await userStorage.updateUser("user-123", {
        firstName: "Jonathan",
      });

      expect(result.firstName).toBe("Jonathan");
    });

    it("should update multiple fields at once", async () => {
      const updatedUser = {
        ...mockUser,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
      };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([updatedUser]);

      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });

      const result = await userStorage.updateUser("user-123", {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
      });

      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Smith");
      expect(result.email).toBe("jane.smith@example.com");
    });

    it("should throw error when user not found", async () => {
      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([]);

      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ returning: mockReturning });

      await expect(
        userStorage.updateUser("nonexistent-id", { firstName: "Test" })
      ).rejects.toThrow("User with id nonexistent-id not found");
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue(undefined);

      (db.delete as Mock).mockReturnValue({ where: mockWhere });

      await expect(userStorage.deleteUser("user-123")).resolves.not.toThrow();
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("getUserCountByRole", () => {
    it("should return counts for all roles", async () => {
      const mockResults = [
        { role: "admin", count: 2 },
        { role: "project_manager", count: 5 },
        { role: "member", count: 20 },
        { role: "viewer", count: 3 },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockGroupBy = vi.fn().mockResolvedValue(mockResults);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ groupBy: mockGroupBy });

      const result = await userStorage.getUserCountByRole();

      expect(result).toEqual({
        admin: 2,
        project_manager: 5,
        member: 20,
        viewer: 3,
      });
    });

    it("should return zeros for missing roles", async () => {
      const mockResults = [{ role: "admin", count: 1 }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockGroupBy = vi.fn().mockResolvedValue(mockResults);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ groupBy: mockGroupBy });

      const result = await userStorage.getUserCountByRole();

      expect(result).toEqual({
        admin: 1,
        project_manager: 0,
        member: 0,
        viewer: 0,
      });
    });
  });

  describe("ensureAdminExists", () => {
    it("should return existing admin if one exists", async () => {
      // First call to check for admin
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([mockAdminUser]);
      (db.select as Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });

      const result = await userStorage.ensureAdminExists();

      expect(result).toEqual(mockAdminUser);
    });

    it("should return null when no users exist", async () => {
      // Mock: no admin, no users
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([]); // no admin
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([]); // no first user

      (db.select as Mock)
        .mockReturnValueOnce({ from: mockFrom })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: mockOrderBy,
          }),
        });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockOrderBy.mockReturnValue({ limit: mockLimit });

      const result = await userStorage.ensureAdminExists();

      expect(result).toBeNull();
    });

    it("should promote first user to admin when no admin exists", async () => {
      const firstUser = { ...mockUser };
      const promotedUser = { ...mockUser, role: "admin" as const };

      // Mock chain for ensureAdminExists
      // First select: check for existing admin
      const mockFromAdmin = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });
      
      // Second select: get first user
      const mockFromFirst = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([firstUser]),
        }),
      });

      // Update for promoting user
      const mockSet = vi.fn().mockReturnThis();
      const mockUpdateWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([promotedUser]);

      (db.select as Mock)
        .mockReturnValueOnce({ from: mockFromAdmin })
        .mockReturnValueOnce({ from: mockFromFirst });
      
      (db.update as Mock).mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockUpdateWhere });
      mockUpdateWhere.mockReturnValue({ returning: mockReturning });

      const result = await userStorage.ensureAdminExists();

      expect(result?.role).toBe("admin");
    });
  });
});

