# ProjectHub - Enterprise Project Management Suite

## Overview

ProjectHub is a comprehensive enterprise project management platform designed for modern teams, offering a full-featured project management suite with various visualization options like Gantt charts, Kanban boards, calendar, and list views. It supports Waterfall, Agile, and Hybrid methodologies, includes portfolio management, AI-powered insights via Google Gemini, and extensive project tracking capabilities. The platform aims to unify project, task, dependency, risk, budget, time, expense, and team collaboration management within a single interface, providing real-time updates and comprehensive reporting.

### Recent Updates (October 2025)

- **Authentication Implementation**: Successfully implemented and verified Replit Auth (OpenID Connect) for secure user authentication:
  - OIDC integration with support for Google, GitHub, X, Apple, and email/password login
  - PostgreSQL-backed session management with 7-day session TTL
  - Protected routes and API endpoints with `isAuthenticated` middleware
  - Frontend authentication hooks and automatic routing based on auth status
  - User profile persistence with id, email, firstName, lastName, and profileImageUrl

- **Express Routes Refactoring**: Successfully refactored the monolithic server/routes.ts file (previously 1567 lines) into 25 separate, feature-based route modules following Express best practices. Each major feature now has its own router file using express.Router(), organized in the server/routes directory. All complex logic including SOW document parsing, dependency validation with scheduling engine, sprint metrics, file handling with object storage, and AI integrations has been preserved. Nested routes are properly consolidated with parent resources to maintain original URL paths.

### Previous Updates (October 2024)

- **Comprehensive Error Handling**: Implemented multi-layered error handling architecture with React Error Boundary for runtime errors, global mutation error handlers in React Query, enhanced error parsing utilities, and user-friendly error display system.
- **Complete State Management Refactoring**: Successfully unified all global UI state management using Zustand with zero regressions:
  - **Centralized Store**: All dialog visibility, project/task selection, view preferences, theme, and sidebar state now managed through `useUIStore`
  - **ListView State**: Migrated selectedTasks, sortField, sortDirection to Zustand with automatic selection clearing on project navigation to prevent cross-project operations
  - **Theme Management**: Integrated theme state into Zustand while preserving ThemeProvider's defaultTheme prop functionality
  - **Sidebar Integration**: Unified SidebarProvider state with Zustand, eliminating duplicate state management
  - **View Persistence**: Calendar currentDate and Project Settings activeTab now persist across navigation via Zustand
  - **Critical Fixes**: ListView selections now properly clear when navigating between projects (watches projectIdFromUrl changes), preventing incorrect bulk operations
- **Architecture Cleanup**: Eliminated all duplicate state between local useState and Zustand store across all components. Transient UI state (drag & drop, form loading, error boundaries) correctly kept as local state for optimal performance.

### Previous Updates (December 2024)

- **Enhanced Email Notifications**: Email reports now include comprehensive task details with assignee names (not IDs), task descriptions, progress bars, estimated hours, story points, and proper status/priority color coding.
- **Improved Gantt Chart**: Gantt view now separates tasks into "Scheduled" and "Unscheduled" sections with badge indicators for better visibility of tasks needing dates.
- **Task Editing Workflow**: Streamlined task editing with pre-filled forms and proper cache invalidation for immediate UI updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:** React 18+ with TypeScript, Vite, Wouter for routing, and React Query for server state management.

**UI Component System:** Shadcn/ui (built on Radix UI primitives), Tailwind CSS for styling with a custom palette, hybrid design inspired by Linear and Material Design 3, and dark/light theme support.

**State Management:** 
- **Server State**: React Query (@tanstack/react-query) for data fetching, caching, and synchronization
- **Global UI State**: Zustand store (`useUIStore`) with localStorage persistence for:
  - Dialog management (activeDialog, task/project selection)
  - View preferences (Gantt zoom level, ListView sort/selection, Calendar current date)
  - Theme management (light/dark/system with defaultTheme prop support)
  - Sidebar state (open/closed)
  - Global search query
- **Local Component State**: useState for transient UI (drag & drop states, form loading states, error boundaries, component-specific inputs)

**Key Features:** Drag-and-drop with @dnd-kit, form validation with React Hook Form and Zod, real-time updates via WebSockets, and responsive design.

**Error Handling Architecture:**
- **React Error Boundary** (`client/src/components/error-boundary.tsx`): Catches unexpected runtime errors and prevents app crashes with user-friendly fallback UI
- **Reusable Mutation Error Handler** (`client/src/lib/queryClient.ts`): Exported `handleMutationError` function provides consistent error handling for mutations. Import and use in `onError` to avoid duplicate toast notifications
- **Enhanced Error Parsing** (`client/src/lib/errorUtils.ts`): Parses structured backend error responses (validation errors, database errors, custom errors) with HTTP status code context (401/403/404/500) into user-friendly messages
- **Layered Error Strategy**: 
  - Layer 1: Import `handleMutationError` from `@/lib/queryClient` and use in mutation `onError` for standard error handling
  - Layer 2: Custom `onError` logic for mutations requiring special error handling
  - Layer 3: React Error Boundary catches unexpected runtime errors as last resort
- **Backend Integration**: Works seamlessly with `server/errorHandler.ts` to parse standardized error responses

### Authentication System

**Authentication Provider:** Replit Auth (OpenID Connect) with support for:
- Google login
- GitHub login
- X (Twitter) login
- Apple login
- Email/password login

**Backend Authentication:**
- OIDC integration implemented in `server/replitAuth.ts`
- Passport.js with openid-client for OAuth flow
- Session management using PostgreSQL (`sessions` table)
- Automatic token refresh for expired sessions
- User profile synchronization on login

**Authentication Routes:**
- `/api/login` - Initiates OAuth login flow
- `/api/logout` - Logs out user and clears session
- `/api/callback` - OAuth callback handler
- `/api/auth/user` - Returns current authenticated user (protected)

**Frontend Authentication:**
- `useAuth` hook (`client/src/hooks/useAuth.ts`) for checking auth status
- Automatic routing: Landing page for unauthenticated, Dashboard for authenticated users
- Protected routes that redirect to landing if not authenticated
- `isUnauthorizedError` utility for handling 401 responses

**Session Configuration:**
- 7-day session TTL (Time To Live)
- Secure, HttpOnly cookies in production
- PostgreSQL-backed session storage for reliability
- Automatic session refresh using refresh tokens

### Backend Architecture

**Server Framework:** Express.js for HTTP, WebSocket server for real-time features, and session-based authentication with Replit Auth.

**API Design:** RESTful endpoints, business logic in a storage layer, and authentication middleware for protected routes.

**Data Access Layer:** Drizzle ORM for type-safe database operations, schema definitions shared between client and server, and Zod schemas for validation.

**Authentication & Authorization:** Replit OpenID Connect (OIDC) integration using Passport.js, session management with PostgreSQL, and user profiles.

### Database Schema

**Core Entities:** Users, Projects, Tasks (hierarchical with dependencies), Custom Fields, Kanban Columns.

**Authentication Tables:**
- `users`: Stores user profiles (id, email, firstName, lastName, profileImageUrl)
- `sessions`: PostgreSQL session storage for authentication

**Project Management Features:** Comments, File Attachments, Risks, Budget Items, Time Entries, Expenses, Resource Capacity, Automation Rules, Dashboard Widgets, Project Templates, and Notifications.

**Enums for Standardization:** Task status, priority, project status, risk levels, and dependency types.

## External Dependencies

**Primary Services:**
- **Neon Database**: PostgreSQL serverless database.
- **Google Gemini AI**: AI-powered summaries and predictions using `gemini-2.5-flash` and `gemini-2.5-pro`.
- **Replit Authentication**: OpenID Connect provider.

**Third-Party Libraries:**
- **UI Components**: Radix UI primitives.
- **Drag & Drop**: @dnd-kit.
- **Form Handling**: React Hook Form with Zod resolvers.
- **Data Fetching**: @tanstack/react-query.
- **Database ORM**: Drizzle ORM.
- **Styling**: Tailwind CSS.
- **Validation**: Zod.
- **Authentication**: Passport.js with openid-client.

**Development Tools:** TypeScript, ESBuild, Vite plugins, and 'ws' for WebSockets.

**Font Services:** Google Fonts (Inter, JetBrains Mono).

**Data Export:** CSV/Excel export for various reports.

## Security Features

- Secure authentication with Replit OIDC
- Session-based authentication with PostgreSQL storage
- Protected API endpoints with `isAuthenticated` middleware
- Automatic token refresh for expired sessions
- HttpOnly, Secure cookies in production
- CSRF protection through SameSite cookie attribute
- Proper error handling without exposing sensitive information