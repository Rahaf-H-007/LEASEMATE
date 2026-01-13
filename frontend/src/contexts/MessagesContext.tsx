"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface MessagesContextType {
  unreadCount: number;
  updateUnreadCount: (count: number) => void;
  resetUnreadCount: () => void;
  incrementUnreadCount: () => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within MessagesProvider');
  }
  return context;
};

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // جلب الرسائل غير المقروءة من قاعدة البيانات
  useEffect(() => {
    if (!user) return;
    
    const fetchUnreadMessages = async () => {
      try {
        const url = user.role === 'landlord'
          ? `http://localhost:5000/api/chat/landlord/${user._id}`
          : `http://localhost:5000/api/chat/tenant/${user._id}`;
        
        const response = await fetch(url);
        const chats = await response.json();
        
        // حساب إجمالي الرسائل غير المقروءة
        const totalUnread = chats.reduce((total: number, chat: any) => {
          return total + (chat.unreadCount || 0);
        }, 0);
        
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };

    fetchUnreadMessages();
  }, [user]);

  const updateUnreadCount = (count: number) => {
    setUnreadCount(count);
  };

  const resetUnreadCount = () => {
    setUnreadCount(0);
  };

  const incrementUnreadCount = () => {
    setUnreadCount(prev => prev + 1);
  };

  return (
    <MessagesContext.Provider value={{
      unreadCount,
      updateUnreadCount,
      resetUnreadCount,
      incrementUnreadCount
    }}>
      {children}
    </MessagesContext.Provider>
  );
}; 