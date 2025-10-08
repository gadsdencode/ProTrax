import { useQuery } from "@tanstack/react-query";
import type { User } from "../../../shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isAuthenticated: !!user && !error,
    isLoading,
  };
}
