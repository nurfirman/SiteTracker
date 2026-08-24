"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Role } from "../types";
import { MOCK_USERS } from "../lib/mockData";
import { getUsers, loginUser, getCurrentUserSession } from "../lib/actions";

interface RoleContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];
  setRoleByEnum: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [availableUsers, setAvailableUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);

  // Load from session or localStorage on mount
  useEffect(() => {
    async function syncSession() {
      try {
        const uList: User[] = await getUsers();
        if (uList && uList.length > 0) {
          setAvailableUsers(uList);
        }

        const session = await getCurrentUserSession();
        if (session) {
          const found = (uList || []).find((u: User) => u.id === session.userId) || MOCK_USERS.find((u) => u.id === session.userId);
          if (found) {
            setCurrentUser(found);
            return;
          }
        }
        const savedUserId = localStorage.getItem("sitetracker_active_user_id");
        if (savedUserId) {
          const found = (uList || []).find((u: User) => u.id === savedUserId) || MOCK_USERS.find((u) => u.id === savedUserId);
          if (found) {
            setCurrentUser(found);
            loginUser(found.id);
          }
        } else {
          // Initialize default session
          if (uList.length > 0) {
            setCurrentUser(uList[0]);
            loginUser(uList[0].id);
          }
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
    const found = availableUsers.find((u) => u.role === role) || MOCK_USERS.find((u) => u.role === role);
    if (found) {
      handleSetCurrentUser(found);
    }
  };

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        availableUsers,
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
