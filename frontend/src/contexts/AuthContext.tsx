'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { io, Socket } from 'socket.io-client';
import { useStripeService } from '@/services/stripe';

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'landlord' | 'tenant' | 'admin';
  avatarUrl?: string;
  isSubscribed?: boolean;
  stripeAccountId?: string;
  subscriptionPlan?: string;
  planUnitLimit?: number;
  planExpiresAt?: Date;
  verificationStatus?: {
    status: 'pending' | 'approved' | 'rejected';
    idVerified?: boolean;
    faceMatched?: boolean;
    uploadedIdUrl?: string;
    selfieUrl?: string;
    idData?: {
      name?: string;
      idNumber?: string;
      birthDate?: string;
    };
  };
  isBlocked?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  socket: Socket | null;
  refreshUser: () => void; // Add this
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null); // ✅ Make socket reactive

  useEffect(() => {
    const storedToken = localStorage.getItem('leasemate_token');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken) as any;
        const currentTime = Date.now() / 1000;

        if (decoded.exp > currentTime) {
          setToken(storedToken);
          fetchUserData(storedToken);
        } else {
          localStorage.removeItem('leasemate_token');
        }
      } catch (error) {
        localStorage.removeItem('leasemate_token');
      }
    }
    setIsLoading(false);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const connectWebSocket = (userId: string) => {
    if (socketRef.current) return;

    socketRef.current = io('http://localhost:5000', {
      transports: ['websocket'],
      withCredentials: true,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ WebSocket connected:', socketRef.current?.id);
      socketRef.current?.emit('join', userId);
      setSocket(socketRef.current); // ✅ Update reactive socket state
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });
  };

  // Remove or increase polling interval to reduce backend load
  useEffect(() => {
    if (token) {
      // Poll every 10 minutes instead of 10 seconds, or remove polling entirely
      const interval = setInterval(() => {
        fetchUserData(token);
      }, 10 * 60 * 1000); // 10 minutes
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    if (user && user._id) {
      connectWebSocket(user._id);
    }
  }, [user]);

  useEffect(() => {
    if (socket && token) {
      const handleSubscriptionUpdated = () => {
        // Fetch latest user data when subscription is updated
        fetchUserData(token);
      };
      
      const handleUserBlocked = (data: { userId: string, isBlocked: boolean }) => {
        console.log('🚫 User blocking event received:', data);
        
        // Check if this event is for the current user
        if (user && data.userId === user._id) {
          if (data.isBlocked) {
            // User has been blocked - update state immediately
            setUser(prev => prev ? { ...prev, isBlocked: true } : null);
            localStorage.setItem('leasemate_user_blocked', 'true');
            console.log('🚫 Current user has been blocked in real-time');
          } else {
            // User has been unblocked - update state immediately
            setUser(prev => prev ? { ...prev, isBlocked: false } : null);
            localStorage.removeItem('leasemate_user_blocked');
            console.log('✅ Current user has been unblocked in real-time');
          }
        }
      };
      
      socket.on('subscriptionUpdated', handleSubscriptionUpdated);
      socket.on('userBlocked', handleUserBlocked);
      
      return () => {
        socket.off('subscriptionUpdated', handleSubscriptionUpdated);
        socket.off('userBlocked', handleUserBlocked);
      };
    }
  }, [socket, token, user]);

  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Store blocked status in localStorage for immediate access on reload
        if (userData.isBlocked) {
          localStorage.setItem('leasemate_user_blocked', 'true');
        } else {
          localStorage.removeItem('leasemate_user_blocked');
        }
        
        // connectWebSocket(userData._id); // 🧠 Connect after user loads - Moved to useEffect
      } else {
        console.error('❌ Failed to fetch user data:', response.status);
        localStorage.removeItem('leasemate_token');
        localStorage.removeItem('leasemate_user_blocked');
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      localStorage.removeItem('leasemate_token');
      localStorage.removeItem('leasemate_user_blocked');
    }
  };

  const login = (authToken: string, userObj: User) => {
    localStorage.setItem('leasemate_token', authToken);
    setToken(authToken);
    setUser(userObj);
    fetchUserData(authToken);
  };

  const logout = () => {
    localStorage.removeItem('leasemate_token');
    localStorage.removeItem('leasemate_user_blocked');
    setToken(null);
    setUser(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null); // ✅ clear reactive socket
    }
  };

  const refreshUser = () => {
    if (token) fetchUserData(token);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, socket, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
