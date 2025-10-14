import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = ""
}: EmptyStateProps) {
  return (
    <Card className={`p-8 text-center ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <div className="rounded-full p-3 bg-muted">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold" data-testid="text-empty-state-title">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto" data-testid="text-empty-state-description">
            {description}
          </p>
        </div>
        {action && (
          <Button 
            onClick={action.onClick}
            data-testid={`button-empty-state-action`}
          >
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}