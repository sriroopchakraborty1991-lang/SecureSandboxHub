import React from 'react';
import type {User} from './services/api';
import {getToken, setToken} from './services/api';

type AuthState = {
  token: string | null;
  user: User | null;
};

type AuthContextValue = AuthState & {
  setAuth: (input: AuthState) => void;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider(props: {children: React.ReactNode}) {
  const [state, setState] = React.useState<AuthState>({token: getToken(), user: null});

  const value: AuthContextValue = React.useMemo(
    () => ({
      ...state,
      setAuth: (input) => {
        setToken(input.token);
        setState(input);
      },
      logout: () => {
        setToken(null);
        setState({token: null, user: null});
      }
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}

