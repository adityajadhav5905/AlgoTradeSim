/**
 * USER GLOBAL STATE CONTEXT PROVIDER
 * 
 * For Beginners:
 * What is a Context in React?
 * In React, data is typically passed top-down (parent to child) via "props".
 * However, this is cumbersome for global data (like user login details) that many components need.
 * A "Context" allows us to broadcast this data globally to any component in the tree,
 * without manually passing props down through every single level (a problem known as "prop drilling").
 * 
 * Flow of this file:
 * 1. Creates a `UserContext` using React.createContext().
 * 2. Defines a `UserProvider` wrapper component that maintains the `user` state.
 * 3. Uses `useEffect` on startup to check if a user is already cached in `localStorage` (so they don't have to re-enter their name on refresh).
 * 4. Exposes actions (`login`, `changeName`, `resetAccount`, `logout`) that call the backend API and update state/cache.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createUser as apiCreateUser, updateUser as apiUpdateUser, resetAccount as apiResetAccount } from '../services/api';

// The key used to read/write the serialized user details string from browser local storage.
const STORAGE_KEY = 'algotrade_user';

// Initialize our React context. It defaults to null.
const UserContext = createContext(null);

export function UserProvider({ children }) {
  // `user` holds the logged-in user object: { userId, name, createdAt }
  const [user, setUser] = useState(null);
  
  // `loading` is true while we verify if a cached user exists in localStorage.
  const [loading, setLoading] = useState(true);

  // Hook that runs once after the provider component mounts.
  // We check if the user has an active session saved in their browser.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { 
        // localStorage stores data as strings, so we parse it back to a JSON object.
        setUser(JSON.parse(stored)); 
      } catch { 
        // If parsing fails (corrupted string), delete the invalid cache item.
        localStorage.removeItem(STORAGE_KEY); 
      }
    }
    // Set loading to false so the application route guards can evaluate page transitions.
    setLoading(false);
  }, []);

  // Helper function to write to localStorage and sync React state in one call.
  const persistUser = (userData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  // Called when the user types their name and submits the onboarding screen.
  const login = async (name) => {
    // 1. Call the backend API to create a new user record in the database.
    const res = await apiCreateUser(name);
    // 2. Prepare the session object.
    const userData = {
      userId: res.data.userId,
      name: res.data.name,
      createdAt: res.data.createdAt,
    };
    // 3. Save to localStorage and React state.
    persistUser(userData);
    return userData;
  };

  // Called when the user edits their profile name.
  const changeName = async (newName) => {
    // 1. Tell the backend API to update the name (which updates strategies and leaderboard listings too).
    await apiUpdateUser(user.userId, newName);
    // 2. Update local state and cached session.
    persistUser({ ...user, name: newName });
  };

  // Resets the entire profile by deleting all saved strategies, backtests, and the user record.
  const resetAccount = async () => {
    // 1. Tell backend to wipe all databases entries linked to this userId.
    await apiResetAccount(user.userId);
    // 2. Clean up browser storage.
    localStorage.removeItem(STORAGE_KEY);
    // 3. Reset state to null, which automatically redirects the user to onboarding.
    setUser(null);
  };

  // Simple log out that clears local cache without wiping database records.
  // useCallback is an optimization that memoizes (caches) this function definition, 
  // preventing unnecessary child component re-renders.
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    // We wrap children in UserContext.Provider, exposing variables and function handlers.
    // Any child component can consume these values by calling the custom `useUser` hook.
    <UserContext.Provider value={{ user, loading, login, changeName, resetAccount, logout, isLoggedIn: !!user }}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook helper.
// Instead of writing `useContext(UserContext)` in every page, we can write `useUser()`.
// It includes a helpful developer validation check to ensure context is loaded.
export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

