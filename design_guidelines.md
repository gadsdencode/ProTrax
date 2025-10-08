# Design Guidelines: Enterprise Project Management Suite

## Design Approach

**Selected Approach**: Design System - Hybrid (Linear + Material Design 3)
- **Primary Reference**: Linear (modern, clean productivity aesthetics with excellent data visualization)
- **Secondary Reference**: Material Design 3 (robust component library for complex enterprise features)
- **Justification**: This enterprise PM tool demands clarity, efficiency, and scalability. Linear's refined minimalism combined with Material's comprehensive component system provides the perfect foundation for managing complex workflows and dense information.

## Core Design Principles

1. **Information Hierarchy First**: Clear visual distinction between primary actions, secondary data, and contextual information
2. **Spatial Efficiency**: Maximize screen real estate while maintaining breathing room for complex interfaces
3. **Consistent Interactions**: Predictable behaviors across all views and modules
4. **Progressive Disclosure**: Reveal complexity only when needed

## Color Palette

### Light Mode
- **Background**: 0 0% 100% (pure white)
- **Surface**: 220 13% 98% (soft cool gray)
- **Border**: 220 13% 91%
- **Primary**: 221 83% 53% (deep blue - trust, productivity)
- **Primary Hover**: 221 83% 45%
- **Text Primary**: 222 47% 11%
- **Text Secondary**: 215 16% 47%
- **Success**: 142 71% 45%
- **Warning**: 38 92% 50%
- **Danger**: 0 84% 60%

### Dark Mode
- **Background**: 222 47% 11% (deep navy-black)
- **Surface**: 217 33% 17%
- **Border**: 217 33% 24%
- **Primary**: 221 83% 60%
- **Primary Hover**: 221 83% 68%
- **Text Primary**: 210 40% 98%
- **Text Secondary**: 215 20% 65%
- **Success**: 142 71% 55%
- **Warning**: 38 92% 60%
- **Danger**: 0 84% 70%

## Typography

**Font Stack**: 
- **Primary**: Inter (via Google Fonts) - UI text, data, forms
- **Monospace**: JetBrains Mono - timestamps, IDs, code

**Type Scale**:
- **Display (Project Titles)**: text-2xl font-semibold (24px)
- **Headings (Module Headers)**: text-lg font-semibold (18px)
- **Body (Task Titles, Content)**: text-sm font-medium (14px)
- **Caption (Metadata, Timestamps)**: text-xs font-normal (12px)
- **Micro (Tags, Badges)**: text-xs font-medium (12px)

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16, 24**
- Component padding: p-4 (standard), p-6 (cards), p-8 (modals)
- Vertical rhythm: space-y-4 (default), space-y-6 (sections)
- Grid gaps: gap-4 (standard), gap-6 (dashboards)

**Container Strategy**:
- Full-bleed layouts for main content areas
- max-w-7xl for centered content sections
- Sidebar width: w-64 (navigation), w-80 (detail panels)

## Component Library

### Navigation
- **Top Bar**: Fixed, h-14, border-b, contains logo, global search, user menu, notifications
- **Sidebar**: Collapsible, hierarchical project tree, pinned items, quick filters
- **Breadcrumbs**: Show current location within project hierarchy

### Data Visualization
- **Gantt Chart**: Timeline grid with 24px row height, color-coded task bars, dependency arrows, critical path in accent color
- **Kanban Board**: Cards with rounded-lg, shadow-sm, max 3 cards visible before scroll per column
- **Calendar**: Full-bleed monthly grid, compact event pills, color-coded by project
- **List View**: Striped rows (zebra pattern), sticky header, inline editing

### Forms & Inputs
- **Input Fields**: h-10, rounded-md, border, focus ring in primary color
- **Dropdowns**: Custom styled with Headless UI, max-h-60 with scroll
- **Date Pickers**: Inline calendar popup, range selection support
- **Rich Text Editor**: Minimal toolbar, keyboard shortcuts, slash commands

### Cards & Panels
- **Task Cards**: Compact (Kanban), Detailed (List), rounded-lg, p-4, hover:shadow-md transition
- **Dashboard Widgets**: White/surface background, rounded-xl, p-6, drag handles on hover
- **Detail Panel**: Slide-in from right, w-1/3 viewport, full-height, divided sections

### Overlays
- **Modals**: Centered, max-w-2xl, backdrop-blur-sm, rounded-xl, shadow-2xl
- **Dropdowns**: Attached to trigger, rounded-lg, shadow-lg, max-h-96 overflow-auto
- **Tooltips**: Minimal, rounded, text-xs, 200ms delay

### Status & Feedback
- **Badges**: Rounded-full px-3 py-1, uppercase text-xs, color-coded by status
- **Progress Bars**: h-2 rounded-full, gradient fill for active projects
- **Notifications**: Toast style, top-right, slide-in animation, 5s auto-dismiss
- **Loading States**: Skeleton screens for tables/lists, spinners for actions

## Interaction Patterns

- **Drag & Drop**: Visual lift (shadow-xl), semi-transparent ghost, snap-to-grid on Gantt
- **Inline Editing**: Click to edit, auto-save on blur, undo option
- **Bulk Actions**: Checkbox selection, floating action bar appears
- **Contextual Menus**: Right-click or three-dot menu, common actions first

## Data Density Strategy

- **Comfortable Mode** (default): py-3 rows, full metadata visible
- **Compact Mode**: py-1.5 rows, abbreviated labels, more items per screen
- **Toggle**: Global setting in user preferences

## Animations

**Minimal & Purposeful Only**:
- Page transitions: 150ms ease-out
- Hover states: 100ms ease-in-out
- Modal entry/exit: 200ms scale + fade
- NO scroll-triggered animations, parallax, or decorative motion

## Visual Hierarchy Rules

1. **Primary Actions**: Filled buttons, primary color, prominent placement
2. **Secondary Actions**: Outline buttons, neutral colors
3. **Tertiary Actions**: Ghost buttons or icon buttons
4. **Data Emphasis**: Bold for active items, regular for inactive, muted for metadata

This design system prioritizes clarity, efficiency, and scalability for an enterprise-grade project management suite that handles complex workflows with elegance.