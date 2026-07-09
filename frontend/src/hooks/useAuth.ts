/**
 * Authentication hook that exposes the current user/session to components.
 */
import { useEffect, useState } from "react";
import { clearStoredUser, readStoredUser, writeStoredUser } from "@/lib/auth-storage";
import type { MovingsUser } from "@/types/auth";

export type { MovingsUser };

export const useAuth = () => {
  const [user, setUser] = useState<MovingsUser | null>(null);
  const [session, setSession] = useState<null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(readStoredUser());
    setIsLoading(false);

    const syncUser = () => setUser(readStoredUser());
    window.addEventListener("storage", syncUser);
    window.addEventListener("movings-auth-changed", syncUser as EventListener);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("movings-auth-changed", syncUser as EventListener);
    };
  }, []);

  const signOut = async () => {
    clearStoredUser();
    setUser(null);
  };

  const updateUser = (newUser: MovingsUser) => {
    writeStoredUser(newUser);
    setUser(newUser);
  };

  return { user, session, isLoading, signOut, updateUser };
};
