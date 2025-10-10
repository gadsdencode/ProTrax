# ProjectHub - Enterprise Project Management Suite

## Overview

ProjectHub is a comprehensive enterprise project management platform designed for modern teams. It provides a full-featured PM suite with multiple visualization options including Gantt charts, Kanban boards, calendar views, and list views. The application supports Waterfall, Agile, and Hybrid methodologies with portfolio management, AI-powered insights via Google Gemini, and extensive project tracking capabilities.

The platform enables teams to manage projects, tasks, dependencies, risks, budgets, time tracking, expenses, and team collaboration through a unified interface with real-time updates and comprehensive reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 10, 2025 - Project Stakeholder Management System

**Implemented comprehensive stakeholder management:**
- Created new database table (project_stakeholders) with role-based access control
- Added stakeholder roles: Sponsor, Reviewer, Observer, Team Member, Client, Vendor
- Built dedicated stakeholder management UI accessible from each project card
- Stakeholders can be designated to receive email reports (toggle on/off)
- Email dialog automatically pulls eligible stakeholders (those with receiveEmailReports enabled)
- Complete CRUD operations for adding, removing, and updating stakeholder settings
- One-click "Add Project Stakeholders" in email dialog adds all eligible recipients

### October 9, 2025 - One-Click Email Updates from Dashboard

**Implemented streamlined email functionality:**
- Added "Email Updates" dropdown button to Dashboard header
- One-click workflow: Click button → Select report type → Email dialog opens pre-configured
- Four report type options: Project Summary, Status Report, Gantt Chart Data, Kanban Board Data
- Email dialog automatically opens with selected report type pre-filled
- Utilizes Outlook integration for sending beautifully formatted HTML emails to stakeholders
- Seamless UX: Report type persists across dialog opens/closes
- Auto-selects first active project for quick sending

### October 9, 2025 - Critical Bug Fixes & Task Creation Enhancement

**Fixed sidebar "New Project" button:**
- Added missing onClick handler to navigate to /projects page
- Uses SPA navigation (setLocation) to preserve app state

**Fixed Reports page AI features:**
- "Generate Summary" and "Generate Predictions" now call Gemini API
- Backend routes fetch project/task data from database before AI calls
- Improved error handling for Gemini service overload (503 errors)

**Fixed Kanban task creation bug:**
- Implemented auto-selection of first project when none is selected
- Resolves silent form validation failures due to missing projectId
- Task creation now works correctly when navigating to /kanban directly

**Enhanced Task Creation Across All Views:**
- **Gantt Page:** Added "New Task" button to header for creating tasks in current project
- **Projects Page:** Added "Add Task" button to each project card for quick task creation
- **Cache Invalidation:** Fixed query invalidation to refresh all views (Gantt, Kanban, List, Calendar) immediately after task creation
- Tasks created from any view now appear instantly in all other views without page refresh

**Implemented Smooth Animation System:**
- **Page Transitions:** Fade-in animations on all route changes (opacity 0→1, y: 8→0, 150ms easeOut)
- **Staggered Lists:** Project cards and widgets animate with 50ms stagger delay
- **Interactive Feedback:** All buttons, inputs, and elements have smooth 150ms transitions
- **Accessibility:** Full prefers-reduced-motion support - animations disabled for users who prefer reduced motion
- **Implementation:** Framer Motion for React animations, keyed by wouter location for proper route transitions
- **No Bugs:** Zero flickering, double-animations, or visual glitches confirmed via E2E testing

**Comprehensive E2E tests passed:**
- All major features verified: Dashboard, Projects, Kanban, Gantt, Calendar, List, Portfolio, Reports, Team
- Task creation tested across all views with proper cache invalidation
- Animation system tested: smooth page transitions, staggered cards, dialog animations
- All buttons, features, and functions are fully working and functional

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React 18+ with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- React Query (TanStack Query) for server state management and data fetching

**UI Component System:**
- Shadcn/ui component library with Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Hybrid design system combining Linear's minimalism with Material Design 3
- Dark/light theme support with system preference detection
- Custom color palette optimized for enterprise productivity tools

**State Management:**
- React Query for all server state (projects, tasks, users)
- React Context for theme management
- Local component state for UI interactions
- No global client-side state management (Redux/Zustand) - relies on React Query cache

**Key Features:**
- Drag-and-drop functionality using @dnd-kit for Kanban boards
- Form validation using React Hook Form with Zod schemas
- Real-time updates via WebSocket connections
- Responsive design with mobile-first approach

### Backend Architecture

**Server Framework:**
- Express.js as the HTTP server
- WebSocket server for real-time collaboration features
- Session-based authentication with Replit Auth integration

**API Design:**
- RESTful API endpoints organized by resource type
- Route handlers in `/server/routes.ts`
- Business logic separated into storage layer (`/server/storage.ts`)
- Authentication middleware for protected routes

**Data Access Layer:**
- Drizzle ORM for type-safe database operations
- Schema definitions in `/shared/schema.ts` shared between client and server
- Zod schemas for runtime validation derived from Drizzle schemas
- Comprehensive relational schema with proper foreign key constraints

**Authentication & Authorization:**
- Replit OpenID Connect (OIDC) integration for user authentication
- Passport.js strategy for OAuth flow
- Session management using connect-pg-simple with PostgreSQL storage
- User profiles with email, name, and profile image support

### Database Schema

**Core Entities:**
- **Users**: Authentication and profile information
- **Projects**: Project metadata, status, budget, timeline, charter
- **Tasks**: Hierarchical task structure with status, priority, assignments, due dates
- **Task Dependencies**: Support for FS, SS, FF, SF dependency types for Gantt charts
- **Custom Fields**: Extensible metadata (text, number, date, dropdown types)
- **Kanban Columns**: Configurable board columns per project

**Project Management Features:**
- **Comments**: Task and project discussions with threading
- **File Attachments**: Document management
- **Risks**: Risk register with probability and impact assessments
- **Budget Items**: Cost tracking and categorization
- **Time Entries**: Time tracking per task/project
- **Expenses**: Expense tracking with categories and approval workflow
- **Resource Capacity**: Team workload planning

**Automation & Intelligence:**
- **Automation Rules**: Event-driven workflows (triggers and actions)
- **Dashboard Widgets**: Customizable dashboard with various widget types
- **Project Templates**: Reusable project structures
- **Notifications**: User notification system

**Enums for Standardization:**
- Task status: todo, in_progress, review, done, blocked
- Task priority: low, medium, high, urgent
- Project status: planning, active, on_hold, completed, cancelled
- Risk levels: very_low to very_high for probability and impact
- Dependency types for critical path analysis

### External Dependencies

**Primary Services:**
- **Neon Database**: PostgreSQL serverless database via @neondatabase/serverless
- **Google Gemini AI**: AI-powered project summaries and deadline predictions via @google/genai
  - Uses gemini-2.5-flash for content generation
  - Uses gemini-2.5-pro for structured prediction analysis
- **Replit Authentication**: OpenID Connect provider for user authentication

**Third-Party Libraries:**
- **UI Components**: Radix UI primitives (@radix-ui/react-*)
- **Drag & Drop**: @dnd-kit for Kanban board interactions
- **Form Handling**: React Hook Form with @hookform/resolvers for Zod integration
- **Data Fetching**: @tanstack/react-query for server state
- **Database ORM**: Drizzle ORM with drizzle-kit for migrations
- **Styling**: Tailwind CSS with PostCSS
- **Validation**: Zod for schema validation (shared between client/server)

**Development Tools:**
- TypeScript for type safety across the stack
- ESBuild for production server bundling
- Vite plugins for development experience (@replit/vite-plugin-*)
- WebSocket support via 'ws' library

**Font Services:**
- Google Fonts: Inter (UI text), JetBrains Mono (monospace)

**Data Export:**
- CSV/Excel export capabilities for reports and Gantt charts
- Multiple report types: financial, burndown, risk register