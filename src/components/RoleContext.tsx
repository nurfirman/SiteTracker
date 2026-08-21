"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Role } from "../types";
import { MOCK_USERS } from "../lib/mockData";
import { loginUser, getCurrentUserSession } from "../lib/actions";

interface RoleContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];
  setRoleByEnum: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);

  // Load from session or localStorage on mount
  useEffect(() => {
    async function syncSession() {
      try {
        const session = await getCurrentUserSession();
        if (session) {
          const found = MOCK_USERS.find((u) => u.id === session.userId);
          if (found) {
            setCurrentUser(found);
            return;
          }
        }
        const savedUserId = localStorage.getItem("sitetracker_active_user_id");
        if (savedUserId) {
          const found = MOCK_USERS.find((u) => u.id === savedUserId);
          if (found) {
            setCurrentUser(found);
            loginUser(found.id);
          }
        } else {
          // Initialize default session
          loginUser(MOCK_USERS[0].id);
        }
      } catch (err) {
        console.warn("Session sync warning:", err);
      }
    }
    syncSession();
  }, []);

  const handleSetCurrentUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("sitetracker_active_user_id", user.id);
    loginUser(user.id).catch((e) => console.warn("Failed to set session cookie:", e));
  };

  const setRoleByEnum = (role: Role) => {
    const found = MOCK_USERS.find((u) => u.role === role);
    if (found) {
      handleSetCurrentUser(found);
    }
  };

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        availableUsers: MOCK_USERS,
        setRoleByEnum,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
