"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNotifications } from '../../../contexts/NotificationsContext';
import { useRouter } from 'next/navigation';

interface SupportMessage {
  _id?: string;
  sender: string | { _id: string; name: string; role: string };
  text: string;
  createdAt?: string;
}

interface SupportChat {
  _id: string;
  user: {
    _id: string;
    name: string;
    role: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export default function SupportChatPage() {
  const { user, isLoading, socket } = useAuth();
  const { theme } = useTheme();
  const { notifications, markSingleAsRead } = useNotifications();
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasJoinedRoom = useRef(false);
  
  // Count unread support messages from admin
  const unreadSupportMessages = notifications.filter(
    (n) => !n.isRead && n.type === 'SUPPORT_MESSAGE_TO_USER'
  ).length;

  // Check if user is authenticated (allow blocked users to access support)
  useEffect(() => {
    console.log('🔍 Support chat auth check:', { user: user?._id, isLoading, isBlocked: user?.isBlocked });
    
    if (!isLoading && !user) {
      console.log('❌ No user found, redirecting to login');
      router.push('/auth/login');
      return;
    }
    
    if (user && user.role === 'admin') {
      console.log('👨‍💼 Admin user, redirecting to admin dashboard');
      router.push('/admin/dashboard');
      return;
    }
    
    if (user && user.isBlocked) {
      console.log('🚫 Blocked user accessing support chat - ALLOWED');
    }
    
    console.log('✅ User authenticated and allowed to access support chat');
  }, [user, isLoading, router]);

  // Initialize chat and join room - consolidated into one useEffect (allow blocked users)
  useEffect(() => {
    if (!user || user.role === 'admin') return;

    // Mark support notifications as read when entering the page
    const supportNotifications = notifications.filter(
      (n) => !n.isRead && n.type === 'SUPPORT_MESSAGE_TO_USER'
    );
    
    for (const notification of supportNotifications) {
      markSingleAsRead(notification._id);
    }

    const initializeChat = async () => {
      try {
        setLoading(true);
        console.log('🟢 Initializing support chat for user:', user._id);
        
        // Check if support chat exists for this user
        const response = await fetch(`http://localhost:5000/api/support-chat/user/${user._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('leasemate_token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 Support chat data:', data);
          
          if (data.chatId) {
            setChatId(data.chatId);
            console.log('🟢 Chat ID set:', data.chatId);
            
            // Fetch existing messages with retry logic
            let retryCount = 0;
            const maxRetries = 3;
            
            const fetchMessages = async () => {
              try {
                const messagesResponse = await fetch(`http://localhost:5000/api/support-chat/${data.chatId}/messages`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('leasemate_token')}`
                  }
                });
                
                if (messagesResponse.ok) {
                  const messagesData = await messagesResponse.json();
                  console.log('📨 Fetched messages:', messagesData.length, 'messages');
                  console.log('📝 Messages details:', messagesData.map((m: any) => ({ id: m._id, sender: m.sender, text: m.text.substring(0, 30) })));
                  setMessages(messagesData);
                } else {
                  console.error('❌ Failed to fetch messages:', messagesResponse.status);
                  if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`🔄 Retrying fetch messages (${retryCount}/${maxRetries})...`);
                    setTimeout(fetchMessages, 1000); // Retry after 1 second
                  }
                }
              } catch (error) {
                console.error('❌ Error fetching messages:', error);
                if (retryCount < maxRetries) {
                  retryCount++;
                  console.log(`🔄 Retrying fetch messages (${retryCount}/${maxRetries})...`);
                  setTimeout(fetchMessages, 1000); // Retry after 1 second
                }
              }
            };
            
            await fetchMessages();
            
            // Join the room immediately after getting chatId
            if (socket && !hasJoinedRoom.current) {
              console.log('🟢 User joining support chat room:', data.chatId);
              socket.emit('joinSupportChat', data.chatId);
              hasJoinedRoom.current = true;
            }
          } else {
            console.log('📭 No existing chat found for user');
          }
        } else {
          console.error('❌ Failed to get support chat:', response.status);
        }
      } catch (error) {
        console.error('❌ Error initializing support chat:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [user?._id, notifications, markSingleAsRead]); // Depend on user ID, notifications, and markSingleAsRead

  // Join room when socket is available and chatId is set
  useEffect(() => {
    if (socket && chatId && !hasJoinedRoom.current) {
      console.log('🟢 User joining support chat room:', chatId);
      socket.emit('joinSupportChat', chatId);
      hasJoinedRoom.current = true;
      
      // Also fetch latest messages when joining room
      console.log('🟢 Fetching latest messages after joining room');
      fetch(`http://localhost:5000/api/support-chat/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('leasemate_token')}`
        }
      })
      .then(res => res.json())
      .then(data => {
        console.log('📨 Latest messages after joining room:', data.length, 'messages');
        setMessages(data);
      })
      .catch(error => {
        console.error('❌ Error fetching latest messages:', error);
      });
    }
  }, [socket, chatId]);

  // Listen for new messages - simplified and optimized
    useEffect(() => {
      if (!socket) return;

      const handleNewMessage = (msg: any) => {
        console.log('🟢 User received new support message:', msg);
        
        // Add message if it's for our chat or if we have a chatId and the message doesn't have a specific chatId
        if (chatId && (msg.chatId === chatId || !msg.chatId)) {
          console.log('✅ Adding message to chat:', chatId, 'Message chatId:', msg.chatId);
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(existingMsg => 
              existingMsg._id === msg._id || 
              (existingMsg.sender === msg.senderId && existingMsg.text === msg.text)
            );
            
            if (messageExists) {
              console.log('🟡 Message already exists, skipping duplicate');
              return prev;
            }
            
            // Replace optimistic message with real message if it exists
            const hasOptimistic = prev.some(m => m._id?.startsWith('temp-') && m.text === msg.text && m.sender === msg.senderId);
            if (hasOptimistic) {
              console.log('🔄 Replacing optimistic message with real message');
              return prev.map(m => 
                m._id?.startsWith('temp-') && m.text === msg.text && m.sender === msg.senderId
                  ? { _id: msg._id, sender: msg.senderId, text: msg.text, createdAt: msg.createdAt }
                  : m
              );
            }
            
            console.log('✅ Adding new message to user chat');
            return [...prev, {
              _id: msg._id || `temp-${Date.now()}`,
              sender: msg.senderId,
              text: msg.text,
              createdAt: msg.createdAt || new Date().toISOString()
            }];
          });
          
          // Mark support messages as read when receiving a message from admin
          if (chatId && user && msg.senderId !== user._id) {
            try {
              fetch(`http://localhost:5000/api/support-chat/${chatId}/read`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('leasemate_token')}`
                },
                body: JSON.stringify({
                  userId: user!._id
                })
              });
              
              // Mark support notifications as read
              const supportNotifications = notifications.filter(
                (n) => !n.isRead && n.type === 'SUPPORT_MESSAGE_TO_USER'
              );
              
              for (const notification of supportNotifications) {
                markSingleAsRead(notification._id);
              }
              
              console.log('✅ Support messages and notifications marked as read after receiving message');
            } catch (error) {
              console.error('❌ Error marking support messages/notifications as read:', error);
            }
          }
        }
      };

      socket.on('newSupportMessage', handleNewMessage);

      return () => {
        socket.off('newSupportMessage', handleNewMessage);
      };
    }, [socket, chatId, user, notifications, markSingleAsRead]); // Depend on socket, chatId, user, notifications, and markSingleAsRead

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Refresh messages when page becomes visible (user clicks notification)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && chatId && user) {
        console.log('🟢 Page became visible, refreshing messages');
        // Fetch latest messages from server
        fetch(`http://localhost:5000/api/support-chat/${chatId}/messages`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('leasemate_token')}`
          }
        })
        .then(res => res.json())
        .then(data => {
          console.log('📨 Refreshed messages:', data.length, 'messages');
          setMessages(data);
        })
        .catch(error => {
          console.error('❌ Error refreshing messages:', error);
        });
      }
    };

    // Also refresh messages when component mounts (user navigates to page)
    if (chatId && user) {
      console.log('🟢 Component mounted, refreshing messages');
      fetch(`http://localhost:5000/api/support-chat/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('leasemate_token')}`
        }
      })
      .then(res => res.json())
      .then(data => {
        console.log('📨 Initial messages loaded:', data.length, 'messages');
        setMessages(data);
      })
      .catch(error => {
        console.error('❌ Error loading initial messages:', error);
      });
    }

    // Also refresh messages when user focuses the window (clicks on notification)
    const handleFocus = () => {
      if (chatId && user) {
        console.log('🟢 Window focused, refreshing messages');
        fetch(`http://localhost:5000/api/support-chat/${chatId}/messages`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('leasemate_token')}`
          }
        })
        .then(res => res.json())
        .then(data => {
          console.log('📨 Focus messages loaded:', data.length, 'messages');
          setMessages(data);
        })
        .catch(error => {
          console.error('❌ Error loading focus messages:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [chatId, user]);

  // Cleanup function for when component unmounts
  useEffect(() => {
    return () => {
      hasJoinedRoom.current = false;
    };
  }, []);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    console.log('🟢 User sending message:', text);

    try {
      if (!chatId) {
        console.log('🟢 Creating new support chat');
        // Create new support chat with first message
        const response = await fetch('http://localhost:5000/api/support-chat/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('leasemate_token')}`
          },
          body: JSON.stringify({
            userId: user._id,
            text: text
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ New chat created:', data);
          setChatId(data.chatId);
          // Add the first message to state since user might not be in the room yet
          // The Socket.IO listener will handle duplicates if the message comes through
          setMessages([{
            _id: data.message._id,
            sender: data.message.sender,
            text: data.message.text,
            createdAt: data.message.createdAt
          }]);
          
          // Join the room for the new chat
          if (socket && !hasJoinedRoom.current) {
            socket.emit('joinSupportChat', data.chatId);
            hasJoinedRoom.current = true;
          }
        }
      } else {
        console.log('🟢 Sending message to existing chat:', chatId);
        // Add optimistic message first
        const optimisticMessage = {
          _id: `temp-${Date.now()}`,
          sender: user._id,
          text: text,
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMessage]);
        
        // Send message via Socket.IO (it will save to database and broadcast)
        if (socket) {
          socket.emit('sendSupportMessage', {
            chatId,
            senderId: user._id,
            text
          });
        }
        
        // Mark support messages as read and clear notifications when user sends a message
        try {
          // Mark support messages as read
          await fetch(`http://localhost:5000/api/support-chat/${chatId}/read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('leasemate_token')}`
            },
            body: JSON.stringify({
              userId: user._id
            })
          });
          
          // Mark support notifications as read
          const supportNotifications = notifications.filter(
            (n) => !n.isRead && n.type === 'SUPPORT_MESSAGE_TO_USER'
          );
          
          for (const notification of supportNotifications) {
            markSingleAsRead(notification._id);
          }
          
          console.log('✅ Support messages and notifications marked as read');
        } catch (error) {
          console.error('❌ Error marking support messages/notifications as read:', error);
        }
      }

      setText('');
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }, [text, user, chatId, socket, notifications]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto p-4 pt-20">
        {/* Header */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl shadow-xl border border-orange-200 dark:border-orange-800 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-400">التواصل مع الدعم</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                يمكنك التواصل مع فريق الدعم الفني للحصول على المساعدة
              </p>
              {unreadSupportMessages > 0 && (
                <div className="mt-2">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    لديك {unreadSupportMessages} رسالة جديدة من فريق الدعم
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              العودة للوحة التحكم
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex flex-col h-[32rem] w-full border rounded-2xl shadow-2xl bg-gradient-to-br from-white to-orange-100 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-orange-200 dark:border-orange-700 bg-gradient-to-r from-orange-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-t-2xl flex items-center gap-3 sticky top-0 z-10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
            <div>
              <span className="font-bold text-orange-600 dark:text-orange-400 text-lg">فريق الدعم الفني</span>
              <p className="text-orange-500 dark:text-orange-300 text-sm">سنقوم بالرد عليك في أقرب وقت ممكن</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-orange-50">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p className="text-gray-600 dark:text-gray-400">جاري تحميل المحادثة...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-orange-400 dark:text-orange-300 mb-6">
                  <svg className="w-20 h-20 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">ابدأ المحادثة مع فريق الدعم</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">اكتب رسالتك أدناه وسنقوم بالرد عليك قريباً</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender._id;
                return (
                  <div key={msg._id || idx} className={`flex ${senderId === user._id ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`relative max-w-[75%] px-4 py-3 rounded-2xl shadow-md text-base break-words
                        ${senderId === user._id
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                          : 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white'}
                      `}
                      style={{
                        borderRadius: senderId === user._id 
                          ? '1rem 1rem 0.5rem 1rem' 
                          : '1rem 1rem 1rem 0.5rem',
                      }}
                    >
                      {msg.text}
                      <div className={`text-xs mt-2 ${senderId === user._id ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSend} className="p-4 flex gap-3 border-t border-orange-200 dark:border-orange-700 bg-white dark:bg-gray-800 rounded-b-2xl sticky bottom-0 z-10">
            <input
              className="flex-1 border border-orange-200 dark:border-orange-700 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-base bg-orange-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب رسالتك..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!text.trim() || loading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:transform-none"
            >
              إرسال
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 