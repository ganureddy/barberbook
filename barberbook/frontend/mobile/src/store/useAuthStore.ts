/**
 * Authentication state.
 *
 * Two layers of state:
 *   - The Frappe `sid` lives in SecureStore (see `api/secureSession`). The
 *     axios client is the only thing that needs it day-to-day.
 *   - The hydrated `SessionUser` + active role lives here, in zustand,
 *     because UI code reads it on every render (avatar, nav guards, role-
 *     gated routes).
 *
 * `hydrate()` is idempotent and safe to call multiple times.
 */

import { create } from 'zustand';

import { hydrateSidFromStorage, logout as logoutApi, me } from '../api/auth';
import { setSessionId } from '../api/client';
import { clearActiveRole, loadActiveRole, saveActiveRole } from '../api/secureSession';
import type { SessionUser, UserRole } from '../api/types';

interface AuthStore {
  status: 'idle' | 'hydrating' | 'authenticated' | 'unauthenticated';
  user: SessionUser | null;
  sid: string | null;
  activeRole: UserRole | null;

  hydrate: () => Promise<void>;
  setSession: (user: SessionUser, sid: string) => void;
  setActiveRole: (role: UserRole) => void;
  logout: () => Promise<void>;

  /**
   * DEV-ONLY: install a fake authenticated session with all three roles
   * available, then pin the active role. Used by the Role Switcher to jump
   * between role flows during scaffolding work without going through OTP.
   * No-op outside of `__DEV__`.
   */
  setDevRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'idle',
  user: null,
  sid: null,
  activeRole: null,

  async hydrate() {
    if (get().status === 'hydrating' || get().status === 'authenticated') return;
    set({ status: 'hydrating' });

    const sid = await hydrateSidFromStorage();
    const storedRole = loadActiveRole() as UserRole | null;

    if (!sid) {
      set({ status: 'unauthenticated', sid: null, user: null, activeRole: null });
      return;
    }

    const user = await me();
    if (!user) {
      // Stale sid — clear and treat as logged out.
      setSessionId(null);
      set({ status: 'unauthenticated', sid: null, user: null, activeRole: null });
      return;
    }

    const activeRole =
      storedRole && user.roles.includes(storedRole)
        ? storedRole
        : (user.active_role ?? user.roles[0] ?? null);

    set({
      status: 'authenticated',
      sid,
      user,
      activeRole,
    });
  },

  setSession(user, sid) {
    setSessionId(sid);
    const role = user.active_role ?? user.roles[0] ?? null;
    if (role) saveActiveRole(role);
    set({
      status: 'authenticated',
      user,
      sid,
      activeRole: role,
    });
  },

  setActiveRole(role) {
    saveActiveRole(role);
    set({ activeRole: role });
  },

  async logout() {
    await logoutApi();
    clearActiveRole();
    set({
      status: 'unauthenticated',
      user: null,
      sid: null,
      activeRole: null,
    });
  },

  setDevRole(role) {
    if (!__DEV__) return;
    const devUser: SessionUser = {
      email: 'dev@barberbook.local',
      full_name: 'Dev User',
      phone: '+91 90000 00000',
      avatar_seed: 'dev-user',
      roles: ['Customer', 'Owner', 'Staff', 'Admin'],
      active_role: role,
      sid: 'dev-sid-local',
    };
    saveActiveRole(role);
    setSessionId(devUser.sid ?? null);
    set({
      status: 'authenticated',
      user: devUser,
      sid: devUser.sid ?? null,
      activeRole: role,
    });
  },
}));
