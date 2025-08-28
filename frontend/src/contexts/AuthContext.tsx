import React, { createContext, useContext, useEffect, useState } from "react";
import { useDescope } from "@descope/react-sdk";

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: any, sessionToken: string) => void;
  logout: () => void;
  hasPermission: (scope: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    isAuthenticated,
    sessionToken: descopeToken,
    user: descopeUser,
  } = useDescope();

  useEffect(() => {
    setIsLoading(true);

    if (isAuthenticated && descopeToken && descopeUser) {
      const userData = {
        id: descopeUser.userId,
        email: descopeUser.email || "",
        name: descopeUser.name || descopeUser.email || "User",
        picture: descopeUser.picture,
      };

      setUser(userData);
      setSessionToken(descopeToken);

      // Store in localStorage for persistence
      localStorage.setItem("sessionToken", descopeToken);
      localStorage.setItem("user", JSON.stringify(userData));
    } else {
      // Clear auth data
      setUser(null);
      setSessionToken(null);
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("user");
    }

    setIsLoading(false);
  }, [isAuthenticated, descopeToken, descopeUser]);

  const login = (userData: any, token: string) => {
    setUser(userData);
    setSessionToken(token);
    localStorage.setItem("sessionToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("user");
    // Descope logout will be handled by useDescope hook
  };

  const hasPermission = (scope: string): boolean => {
    // Check if user has specific permission/scope
    // This would typically decode the JWT and check scopes
    return sessionToken !== null; // Simplified for now
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isLoading,
        isAuthenticated: !!user && !!sessionToken,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
