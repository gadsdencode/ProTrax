# ProjectHub - Enterprise Project Management Suite

## Overview

ProjectHub is a comprehensive enterprise project management platform designed for modern teams, offering a full-featured project management suite with various visualization options like Gantt charts, Kanban boards, calendar, and list views. It supports Waterfall, Agile, and Hybrid methodologies, includes portfolio management, AI-powered insights via Google Gemini, and extensive project tracking capabilities. The platform aims to unify project, task, dependency, risk, budget, time, expense, and team collaboration management within a single interface, providing real-time updates and comprehensive reporting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:** React 18+ with TypeScript, Vite, Wouter for routing, and React Query for server state management.

**UI Component System:** Shadcn/ui (built on Radix UI primitives), Tailwind CSS for styling with a custom palette, hybrid design inspired by Linear and Material Design 3, and dark/light theme support.

**State Management:** React Query for server state, React Context for themes, and local component state for UI interactions.

**Key Features:** Drag-and-drop with @dnd-kit, form validation with React Hook Form and Zod, real-time updates via WebSockets, and responsive design.

### Backend Architecture

**Server Framework:** Express.js for HTTP, WebSocket server for real-time features, and session-based authentication with Replit Auth.

**API Design:** RESTful endpoints, business logic in a storage layer, and authentication middleware for protected routes.

**Data Access Layer:** Drizzle ORM for type-safe database operations, schema definitions shared between client and server, and Zod schemas for validation.

**Authentication & Authorization:** Replit OpenID Connect (OIDC) integration using Passport.js, session management with PostgreSQL, and user profiles.

### Database Schema

**Core Entities:** Users, Projects, Tasks (hierarchical with dependencies), Custom Fields, Kanban Columns.

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

**Development Tools:** TypeScript, ESBuild, Vite plugins, and 'ws' for WebSockets.

**Font Services:** Google Fonts (Inter, JetBrains Mono).

**Data Export:** CSV/Excel export for various reports.