import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = authService.getStoredUser();
      console.log('Stored user from token:', storedUser); // DEBUG
      
      if (storedUser) {
        try {
          const response = await authService.getCurrentUser();
          console.log('Current user response:', response); // DEBUG
          
          setUser({
            username: response.user.username,
            isAdmin: response.user.is_admin || false
          });
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (username, password) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await authService.login(username, password);
      
      console.log('Login response:', response); // DEBUG
      
      if (response.success) {
        const userData = {
          username: response.user.username,
          isAdmin: response.user.is_admin || false
        };
        console.log('Setting user:', userData); // DEBUG
        setUser(userData);
        return { success: true };
      } else {
        setError(response.message);
        return { 
          success: false, 
          message: response.message,
          locked: response.locked,
          attemptsRemaining: response.attempts_remaining,
        };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      return { 
        success: false, 
        message,
        locked: err.response?.data?.locked,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // Compute isAdmin from user state
  const isAdmin = user?.isAdmin || false;
  
  console.log('AuthContext state - user:', user, 'isAdmin:', isAdmin); // DEBUG

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin,
    isLoading,
    error,
    login,
    logout,
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}