"use client";

import { useSyncExternalStore } from "react";
import {
  getStoredUserId,
  getStoredBreakGlassRole,
  getStoredUserRole,
  subscribeAuthSession,
} from "../_lib/auth-session";

export function useCurrentUserRole() {
  return useSyncExternalStore(subscribeAuthSession, getStoredUserRole, () => "");
}

export function useCurrentUserId() {
  return useSyncExternalStore(subscribeAuthSession, getStoredUserId, () => "");
}

export function useIsAdminAccess() {
  return useCurrentUserRole() === "admin";
}

export function useBreakGlassRole() {
  return useSyncExternalStore(subscribeAuthSession, getStoredBreakGlassRole, () => "");
}
