/**
 * Utility functions for AI Risk Analysis components
 */
import { 
  Target, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Activity, 
  AlertTriangle 
} from "lucide-react";
import type { RiskLevel, RiskType, Priority } from "./types";

export const getRiskLevelColor = (level: RiskLevel): string => {
  switch (level) {
    case 'low': return 'bg-emerald-500';
    case 'medium': return 'bg-amber-500';
    case 'high': return 'bg-orange-500';
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export const getRiskLevelBadge = (level: RiskLevel): string => {
  switch (level) {
    case 'low': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityBadge = (priority: Priority): string => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getRiskTypeIcon = (type: RiskType) => {
  const iconClass = "h-4 w-4";
  switch (type) {
    case 'dependency_bottleneck': return <Target className={iconClass} />;
    case 'deadline_pressure': return <Clock className={iconClass} />;
    case 'resource_overload': return <Users className={iconClass} />;
    case 'scope_creep': return <TrendingUp className={iconClass} />;
    case 'blocked_tasks': return <AlertCircle className={iconClass} />;
    case 'unassigned_tasks': return <Users className={iconClass} />;
    case 'missing_estimates': return <Activity className={iconClass} />;
    default: return <AlertTriangle className={iconClass} />;
  }
};

export const getRiskTypeLabel = (type: RiskType): string => {
  switch (type) {
    case 'dependency_bottleneck': return 'Dependency Bottleneck';
    case 'deadline_pressure': return 'Deadline Pressure';
    case 'resource_overload': return 'Resource Overload';
    case 'scope_creep': return 'Scope Creep';
    case 'blocked_tasks': return 'Blocked Tasks';
    case 'unassigned_tasks': return 'Unassigned Tasks';
    case 'missing_estimates': return 'Missing Estimates';
    default: return type;
  }
};
