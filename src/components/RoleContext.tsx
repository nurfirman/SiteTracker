"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Role } from "../types";
import { MOCK_USERS } from "../lib/mockData";
import { getUsers, loginUser, getCurrentUserSession } from "../lib/actions";

interface RoleContextType {
  currentUser: User;
  setCurrentUser: (user: User, skipServerLogin?: boolean) => void;
  availableUsers: User[];
  setRoleByEnum: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const LOADING_PLACEHOLDER_USER: User = {
  id: "loading-session",
  name: "Memuat Akun...",
  email: "",
  role: "CMD",
  phoneNumber: "-",
  projectId: null,
};

export function RoleProvider({
  children,
  initialSessionUser,
}: {
  children: React.ReactNode;
  initialSessionUser?: User | null;
}) {
  const [availableUsers, setAvailableUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (initialSessionUser && initialSessionUser.id) {
      return initialSessionUser;
    }
    if (typeof window !== "undefined") {
      try {
        const cachedProfile = localStorage.getItem("sitetracker_active_user_profile");
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          if (parsed && parsed.id && parsed.name) {
            return parsed;
          }
        }
      } catch {
        // Abaikan jika gagal parse cache
      }
    }
    return LOADING_PLACEHOLDER_USER;
  });

  // Sinkronisasi jika initialSessionUser dari server berubah
  useEffect(() => {
    if (initialSessionUser && initialSessionUser.id) {
      setCurrentUser((prev) => {
        if (prev.id === "loading-session" || prev.id !== initialSessionUser.id) {
          return initialSessionUser;
        }
        return prev;
      });
    }
  }, [initialSessionUser]);

  // Load full user metadata (project, division, employeeCode) from DB on mount
  useEffect(() => {
    async function syncSession() {
      try {
        const [session, uList] = await Promise.all([
          getCurrentUserSession(),
          getUsers(),
        ]);

        if (uList && uList.length > 0) {
          setAvailableUsers(uList);
        }

        if (session) {
          const found =
            (uList || []).find(
              (u: User) =>
                u.id === session.userId ||
                (session.email && u.email.toLowerCase() === session.email.toLowerCase())
            ) ||
            MOCK_USERS.find((u) => u.id === session.userId) || {
              id: session.userId,
              name: session.name,
              email: session.email,
              role: session.role,
              phoneNumber: "-",
              projectId: null,
            };

          if (found) {
            setCurrentUser(found);
            localStorage.setItem("sitetracker_active_user_id", found.id);
            localStorage.setItem("sitetracker_active_user_profile", JSON.stringify(found));
            return;
          }
        }

        const savedUserId = localStorage.getItem("sitetracker_active_user_id");
        if (savedUserId) {
          const found =
            (uList || []).find((u: User) => u.id === savedUserId) ||
            MOCK_USERS.find((u) => u.id === savedUserId);
          if (found) {
            setCurrentUser(found);
            localStorage.setItem("sitetracker_active_user_profile", JSON.stringify(found));
          }
        }
      } catch (err) {
        console.warn("Session sync warning:", err);
      }
    }
    syncSession();
  }, []);

  const handleSetCurrentUser = (user: User, skipServerLogin: boolean = false) => {
    if (!user || !user.id) return;
    setCurrentUser(user);
    localStorage.setItem("sitetracker_active_user_id", user.id);
    localStorage.setItem("sitetracker_active_user_profile", JSON.stringify(user));
    if (!skipServerLogin) {
      loginUser(user.id).catch((e) => console.warn("Failed to set session cookie:", e));
    }
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
