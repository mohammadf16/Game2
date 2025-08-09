import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastAxiosRequestAtRef = useRef(0);
  const requestChainRef = useRef(Promise.resolve());
  const MIN_GLOBAL_REQUEST_GAP_MS = 2000; // enforce 2s min gap between ANY requests

  // Configure axios defaults
  useEffect(() => {
    axios.defaults.baseURL = 'http://127.0.0.1:8000/api';
    axios.defaults.withCredentials = true;
    // Hydrate auth token from localStorage if present
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      axios.defaults.headers.common['Authorization'] = `Token ${storedToken}`;
    }
    
    // Add request interceptor: CSRF + Global rate limiter (serialized + min gap)
    axios.interceptors.request.use((config) => {
      // Ensure CSRF header
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }

      // Serialize and delay requests to enforce global minimum gap
      return new Promise((resolve) => {
        requestChainRef.current = requestChainRef.current.then(async () => {
          const now = Date.now();
          const elapsed = now - lastAxiosRequestAtRef.current;
          if (elapsed < MIN_GLOBAL_REQUEST_GAP_MS) {
            const waitMs = MIN_GLOBAL_REQUEST_GAP_MS - elapsed;
            await new Promise((r) => setTimeout(r, waitMs));
          }
          lastAxiosRequestAtRef.current = Date.now();
          resolve(config);
        });
      });
    });

    // Add response interceptor for handling auth errors
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setUser(null);
          setProfile(null);
          localStorage.removeItem('user');
          localStorage.removeItem('profile');
          localStorage.removeItem('authToken');
          delete axios.defaults.headers.common['Authorization'];
        }
        return Promise.reject(error);
      }
    );
  }, []);

  // Helper function to get CSRF cookie
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Avatar emoji mapping
  const getAvatarEmoji = (avatarKey) => {
    const avatarMap = {
      detective_1: '🕵️‍♂️',
      detective_2: '🕵️‍♀️',
      spy_1: '🥷',
      spy_2: '👤',
      agent_1: '👨‍💼',
      agent_2: '👩‍💼',
      hacker_1: '👨‍💻',
      hacker_2: '👩‍💻',
      scientist_1: '👨‍🔬',
      scientist_2: '👩‍🔬',
      ninja_1: '🥷',
      ninja_2: '🥷',
      robot_1: '🤖',
      robot_2: '🤖',
      alien_1: '👽',
      alien_2: '👽',
      superhero_1: '🦸‍♂️',
      superhero_2: '🦸‍♀️',
      vampire_1: '🧛‍♂️',
      vampire_2: '🧛‍♀️'
    };
    return avatarMap[avatarKey] || '🕵️‍♂️';
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get user from localStorage first
        const savedUser = localStorage.getItem('user');
        const savedProfile = localStorage.getItem('profile');
        
        if (savedUser && savedProfile) {
          setUser(JSON.parse(savedUser));
          setProfile(JSON.parse(savedProfile));
        }

        // Verify with server
        const response = await axios.get('/profile/');
        const payload = response.data;
        // Accept either shape
        // A) payload = { user, profile }
        // B) payload = { ...profileFields, user }
        const serverUser = payload?.user ?? null;
        const serverProfile = payload?.profile ?? (payload?.user ? { ...payload } : payload);

        if (serverUser) setUser(serverUser);
        if (serverProfile) setProfile(serverProfile);

        // Update localStorage
        if (serverUser) localStorage.setItem('user', JSON.stringify(serverUser));
        if (serverProfile) localStorage.setItem('profile', JSON.stringify(serverProfile));
      } catch (error) {
        // Not authenticated
        setUser(null);
        setProfile(null);
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await axios.post('/auth/login/', credentials);
      
      if (response.data?.success) {
        // Support both shapes:
        // 1) { success, data: { user, profile } }
        // 2) { success, user, profile, token }
        const payload = response.data;
        const userData = payload?.data?.user ?? payload?.user ?? null;
        const profileData = payload?.data?.profile ?? payload?.profile ?? null;

        if (!userData || !profileData) {
          // Backend returned success but missing expected fields
          console.warn('Login succeeded but response missing user/profile fields:', payload);
        }

        setUser(userData);
        setProfile(profileData);

        // Persist to localStorage
        if (userData) localStorage.setItem('user', JSON.stringify(userData));
        if (profileData) localStorage.setItem('profile', JSON.stringify(profileData));
        if (payload.token) {
          localStorage.setItem('authToken', payload.token);
          axios.defaults.headers.common['Authorization'] = `Token ${payload.token}`;
        }

        return { success: true, data: { user: userData, profile: profileData, token: payload.token } };
      } else {
        return { success: false, errors: response.data?.errors ?? { general: ['Invalid credentials.'] } };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        errors: { general: ['Login failed. Please try again.'] }
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register/', userData);
      
      if (response.data?.success) {
        // Support both shapes as in login
        const payload = response.data;
        const newUser = payload?.data?.user ?? payload?.user ?? null;
        const newProfile = payload?.data?.profile ?? payload?.profile ?? null;

        setUser(newUser);
        setProfile(newProfile);

        if (newUser) localStorage.setItem('user', JSON.stringify(newUser));
        if (newProfile) localStorage.setItem('profile', JSON.stringify(newProfile));
        if (payload.token) {
          localStorage.setItem('authToken', payload.token);
          axios.defaults.headers.common['Authorization'] = `Token ${payload.token}`;
        }

        return { success: true, data: { user: newUser, profile: newProfile, token: payload.token } };
      } else {
        return { success: false, errors: response.data?.errors ?? { general: ['Registration failed.'] } };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        errors: { general: ['Registration failed. Please try again.'] }
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setProfile(null);
      localStorage.removeItem('user');
      localStorage.removeItem('profile');
      localStorage.removeItem('authToken');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/profile/', profileData);
      setProfile(response.data);
      localStorage.setItem('profile', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const value = {
    user,
    profile,
    loading,
    login,
    register,
    logout,
    updateProfile,
    getAvatarEmoji,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
