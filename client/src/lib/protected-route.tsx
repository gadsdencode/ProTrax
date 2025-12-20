// Blueprint: javascript_auth_all_persistance
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const { organizations, isLoading: orgLoading, hasOrganization } = useOrganization();

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Show loading while fetching organizations
  if (orgLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Redirect to onboarding if user has no organizations
  // Only redirect after we've confirmed there are no organizations
  if (!orgLoading && organizations.length === 0 && !hasOrganization) {
    return (
      <Route path={path}>
        <Redirect to="/onboarding" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
