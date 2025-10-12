# Manual Testing Instructions for Sprint Metrics

## Purpose
The sprint metrics endpoint has been updated to use real historical data instead of simulated data.

## What Changed
- **Before**: The burndown and CFD charts were generated using a deterministic simulation based on the current state
- **After**: The charts now use actual task history tracked in the `task_history` table

## How It Works Now

### Data Collection
1. Every time a task is updated, the changes are logged to `task_history` table
2. The following fields are tracked:
   - `status` (todo → in_progress → review → done)
   - `storyPoints` 
   - `sprintId`
   - `assigneeId`
   - `progress`

### Metrics Generation
1. When you request sprint metrics (`/api/sprints/{id}/metrics`), the system:
   - Fetches all historical changes for the sprint period
   - Reconstructs the state of tasks for each day
   - Calculates actual burndown based on real status changes
   - Generates CFD data showing actual task flow through statuses

## How to Test

### 1. Create Test Data
```bash
# In the application UI:
1. Create a new project
2. Create a sprint (set dates appropriately)
3. Add several tasks with story points to the sprint
4. Update task statuses over time (move from todo → in_progress → done)
```

### 2. View Metrics
Navigate to the Sprint Dashboard and check the:
- **Burndown Chart**: Should show actual progress based on when tasks were moved to "done"
- **CFD Chart**: Should show real task distribution changes over time

### 3. Verify Historical Accuracy
- The charts will now accurately reflect:
  - When tasks were actually completed
  - The real velocity of the team
  - Actual workflow bottlenecks (tasks stuck in review, etc.)

## Expected Behavior

### With Historical Data
- Burndown chart shows stepped progress (not smooth curves)
- CFD shows actual task movements between states
- Data matches the exact times when changes were made

### Without Historical Data (New Sprints)
- System falls back to showing current state
- Initial tasks assumed to start as "todo"
- Provides reasonable defaults until history accumulates

## Benefits
1. **Accurate Reporting**: Sprint retrospectives now have real data
2. **Velocity Tracking**: Can see actual team velocity patterns
3. **Bottleneck Identification**: CFD shows where tasks get stuck
4. **Historical Analysis**: Can review past sprint performance accurately

## Technical Details
- Historical data stored in `task_history` table
- Each change records: task ID, field changed, old value, new value, timestamp, user
- Metrics endpoint reconstructs daily state by replaying changes
- Fallback mechanism ensures new sprints still display reasonable charts