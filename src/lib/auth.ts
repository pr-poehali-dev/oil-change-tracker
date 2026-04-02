import { createContext, useContext } from "react";

export interface AuthUser {
  token: string;
  phone: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
