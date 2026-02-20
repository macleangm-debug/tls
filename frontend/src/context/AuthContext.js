import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Configure axios to send credentials (cookies) with all requests
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("tls_token")); // Keep for backward compat
  const [csrfToken, setCsrfToken] = useState(localStorage.getItem("tls_csrf_token"));
  const [loading, setLoading] = useState(true);

  // Configure axios defaults for CSRF
  useEffect(() => {
    // Set up axios interceptor to add CSRF token to all requests
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const storedCsrf = localStorage.getItem("tls_csrf_token");
        if (storedCsrf) {
          config.headers["X-CSRF-Token"] = storedCsrf;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    // Try to fetch user on mount (cookie will be sent automatically)
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      // Not logged in or token expired
      console.log("Not authenticated");
      setUser(null);
      // Clear any stale tokens
      localStorage.removeItem("tls_token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData, csrf_token } = response.data;
    
    // Store JWT token in localStorage (backward compatibility during transition)
    localStorage.setItem("tls_token", access_token);
    setToken(access_token);
    
    // Store CSRF token (required for all state-changing requests)
    if (csrf_token) {
      localStorage.setItem("tls_csrf_token", csrf_token);
      setCsrfToken(csrf_token);
    }
    
    setUser(userData);
    
    // Return user data including force_password_reset flag
    return userData;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const response = await axios.post(
      `${API}/auth/change-password`,
      { current_password: currentPassword, new_password: newPassword }
    );
    // Update user to remove force_password_reset flag
    if (user) {
      setUser({ ...user, force_password_reset: false });
    }
    return response.data;
  };

  const register = async (data) => {
    const response = await axios.post(`${API}/auth/register`, data);
    // Check if email verification is required (new flow)
    if (response.data.requires_verification) {
      // Don't set token - user needs to verify email first
      return response.data;
    }
    // Legacy flow (if token is returned)
    const { access_token } = response.data;
    if (access_token) {
      localStorage.setItem("tls_token", access_token);
      setToken(access_token);
    }
    return response.data;
  };

  const logout = async () => {
    try {
      // Call backend to clear HttpOnly cookie
      await axios.post(`${API}/auth/logout`);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage
      localStorage.removeItem("tls_token");
      localStorage.removeItem("tls_csrf_token");
      setToken(null);
      setCsrfToken(null);
      setUser(null);
    }
  };

  const getAuthHeaders = () => ({
    headers: { 
      Authorization: `Bearer ${token}`,
      "X-CSRF-Token": csrfToken || localStorage.getItem("tls_csrf_token") || ""
    }
  });

  return (
    <AuthContext.Provider value={{ user, token, csrfToken, loading, login, register, logout, getAuthHeaders, fetchUser, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
