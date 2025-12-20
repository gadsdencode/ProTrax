/**
 * Dashboard Skeleton Component
 * 
 * Layout-level skeleton that matches the dashboard structure
 * for a cohesive loading experience (prevents "popcorn" loading).
 */
import { cn } from "@/lib/utils";

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={cn("bg-muted rounded-lg animate-pulse", className)} />
  );
}

function SkeletonStatCard() {
  return (
    <div className="p-6 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-4">
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-4 w-4" />
      </div>
      <SkeletonPulse className="h-8 w-16" />
    </div>
  );
}

function SkeletonListItem() {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="h-4 w-48" />
        <SkeletonPulse className="h-3 w-32" />
      </div>
      <div className="flex gap-2">
        <SkeletonPulse className="h-6 w-16 rounded-full" />
        <SkeletonPulse className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

function SkeletonListCard({ title, itemCount = 5 }: { title?: boolean; itemCount?: number }) {
  return (
    <div className="rounded-lg border bg-card">
      {title && (
        <div className="p-6 pb-4 flex items-center justify-between">
          <SkeletonPulse className="h-5 w-32" />
          <SkeletonPulse className="h-8 w-24" />
        </div>
      )}
      <div className="p-6 pt-0 space-y-3">
        {Array.from({ length: itemCount }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </div>
  );
}

function SkeletonProjectCard() {
  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-3 w-full" />
        </div>
        <SkeletonPulse className="h-3 w-3 rounded-full ml-3" />
      </div>
      <SkeletonPulse className="h-3 w-48 mt-3" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <SkeletonPulse className="h-8 w-64" />
          <SkeletonPulse className="h-4 w-48" />
        </div>
        <SkeletonPulse className="h-10 w-32" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Recent Tasks skeleton */}
      <SkeletonListCard title itemCount={5} />

      {/* My Tasks skeleton */}
      <SkeletonListCard title itemCount={3} />

      {/* Active Projects skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 pb-4">
          <SkeletonPulse className="h-5 w-32" />
        </div>
        <div className="p-6 pt-0 space-y-3">
          <SkeletonProjectCard />
          <SkeletonProjectCard />
          <SkeletonProjectCard />
        </div>
      </div>
    </div>
  );
}

// Compact version for inline use
export function DashboardContentSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Stats grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Recent Tasks skeleton */}
      <SkeletonListCard title itemCount={5} />

      {/* My Tasks skeleton */}
      <SkeletonListCard title itemCount={3} />
    </div>
  );
}

