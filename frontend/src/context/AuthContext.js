import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const [token, setToken] = useState(localStorage.getItem("tls_token"));
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
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error("Auth error:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData, csrf_token } = response.data;
    
    // Store JWT token
    localStorage.setItem("tls_token", access_token);
    setToken(access_token);
    
    // Store CSRF token
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
      { current_password: currentPassword, new_password: newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
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

  const logout = () => {
    localStorage.removeItem("tls_token");
    localStorage.removeItem("tls_csrf_token");
    setToken(null);
    setCsrfToken(null);
    setUser(null);
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
