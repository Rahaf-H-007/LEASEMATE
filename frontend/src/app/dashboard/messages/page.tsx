"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useMessages } from "../../../contexts/MessagesContext";
import { useSearchParams, useRouter } from "next/navigation";
import io from 'socket.io-client';
import axios from 'axios';

interface Chat {
  _id: string;
  tenant: { _id: string; name: string };
  landlord: { _id: string; name: string };
  unit?: { _id: string; name: string };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessageSenderId?: string;
}

interface Message {
  _id?: string;
  sender: string;
  text: string;
  createdAt?: string;
  receiverId?: string;
}

const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
  withCredentials: true,
});

export default function MessagesPage() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const { resetUnreadCount, updateUnreadCount } = useMessages();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // إعادة تعيين عداد الرسائل غير المقروءة عند فتح الصفحة
  useEffect(() => {
    if (user) {
      resetUnreadCount();
    }
  }, [user, resetUnreadCount]);

  // تحديث العداد عند تغيير المحادثات
  useEffect(() => {
    if (chats.length > 0) {
      const totalUnread = chats.reduce((total: number, chat: any) => {
        return total + (chat.unreadCount || 0);
      }, 0);
      updateUnreadCount(totalUnread);
    }
  }, [chats, updateUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const url = user.role === 'landlord'
      ? `http://localhost:5000/api/chat/landlord/${user._id}`
      : `http://localhost:5000/api/chat/tenant/${user._id}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setChats(data);
        setLoading(false);
        
        // التحقق من وجود chatId في query parameters
        const chatIdFromUrl = searchParams.get('chatId');
        if (chatIdFromUrl) {
          const targetChat = data.find((chat: Chat) => chat._id === chatIdFromUrl);
          if (targetChat) {
            setSelectedChat(targetChat);
            // تأكد من أن السايدبار مفتوح عند اختيار محادثة محددة
            setSidebarOpen(true);
          } else {
            console.warn('Chat not found in user\'s chat list:', chatIdFromUrl);
          }
        }
      });
  }, [user, searchParams]);

  // جلب رسائل المحادثة عند اختيار محادثة
  useEffect(() => {
    if (!selectedChat) return;
    socket.emit('joinChat', selectedChat._id);
    axios.get(`http://localhost:5000/api/chat/${selectedChat._id}/messages`).then(res => {
      setMessages(res.data);
    });
    // عند فتح المحادثة، علم الرسائل كمقروءة
    if (user) {
      // 1. عدّل unreadCount محليًا فورًا
      setChats(prev =>
        prev.map(chat =>
          chat._id === selectedChat._id ? { ...chat, unreadCount: 0 } : chat
        )
      );
      // 2. أرسل الطلب للسيرفر ثم أعد جلب المحادثات
      axios.post(`http://localhost:5000/api/chat/${selectedChat._id}/read`, { userId: user._id })
        .then(() => {
          const url = user.role === 'landlord'
            ? `http://localhost:5000/api/chat/landlord/${user._id}`
            : `http://localhost:5000/api/chat/tenant/${user._id}`;
          fetch(url)
            .then((res) => res.json())
            .then((data) => {
              setChats(data);
              // تحديث المحادثات فقط، العداد سيتم تحديثه تلقائياً من useEffect السابق
            });
        });
    }
  }, [selectedChat, user]);

  // عند استقبال رسالة جديدة عبر socket:
  useEffect(() => {
    if (!user) return;
    const handleNewMessage = (msg: Message & { senderId?: string; chatId?: string; createdAt?: string }) => {
      const senderId = String(msg.sender || msg.senderId);
      const myId = String(user?._id);
      setMessages(prev => {
        // إذا هناك رسالة Optimistic بنفس النص والتوقيت، استبدلها
        const idx = prev.findIndex(m => m._id?.startsWith('temp-') && m.text === msg.text && m.sender === senderId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...msg,
            sender: senderId,
          };
          return updated;
        }
        return [
          ...prev,
          {
            ...msg,
            sender: senderId,
          }
        ];
      });
      setChats(prev => {
        if (!user) return prev;
        const updated = prev.map(chat => {
          if (chat._id === (msg.chatId || selectedChat?._id)) {
            const isReceiver = senderId !== myId;
            return {
              ...chat,
              lastMessage: msg.text,
              lastMessageAt: msg.createdAt || new Date().toISOString(),
              unreadCount:
                selectedChat && chat._id === selectedChat._id
                  ? 0 // إذا الشات مفتوح، اعتبرها مقروءة
                  : isReceiver
                    ? (chat.unreadCount || 0) + 1 // لو أنا المستقبل، زود العداد
                    : chat.unreadCount || 0, // لو أنا المرسل، لا تغير العداد
              lastMessageSenderId: senderId,
            };
          }
          return chat;
        });
        // ترتيب المحادثات: الأحدث أولاً
        return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      });
    };
    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [selectedChat, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // عند إرسال رسالة:
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedChat || !user) return;
    const receiver = user.role === 'landlord' ? selectedChat.tenant : selectedChat.landlord;
    if (!receiver || !receiver._id) return;
    const receiverId = receiver._id;
    // تحديث محلي سريع لآخر رسالة وتوقيتها وترتيب المحادثات
    setChats(prev => {
      const updated = prev.map(chat =>
        chat._id === selectedChat._id
          ? {
              ...chat,
              lastMessage: text,
              lastMessageAt: new Date().toISOString(),
              lastMessageSenderId: user._id,
              unreadCount: 0, // لأن المستخدم هو المرسل
            }
          : chat
      );
      // ترتيب المحادثات: الأحدث أولاً
      return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    });
    // أضف الرسالة مباشرة للواجهة مع توقيت الجهاز (Optimistic)
    const optimisticId = 'temp-' + Date.now();
    const optimisticCreatedAt = new Date().toISOString();
    setMessages(prev => [
      ...prev,
      {
        _id: optimisticId,
        sender: user._id,
        text,
        createdAt: optimisticCreatedAt,
      }
    ]);
    await axios.post(`http://localhost:5000/api/chat/${selectedChat._id}/messages`, {
      senderId: user._id,
      text,
    });
    socket.emit('sendMessage', {
      chatId: selectedChat._id,
      senderId: user._id,
      receiverId,
      text,
    });
    setText('');
  };

  // التحقق من حالة التحميل أولاً
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل المحادثات...</p>
        </div>
      </div>
    );
  }

  // التحقق من تسجيل الدخول بعد انتهاء التحميل
  if (!user) {
    return <div className="p-8 text-center dark:text-white"></div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'w-1/3 min-w-[260px] max-w-xs' : 'w-0 min-w-0 max-w-0'} h-screen sticky top-0 z-20 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-200 dark:scrollbar-thumb-orange-600 scrollbar-track-orange-50 dark:scrollbar-track-gray-700`} style={{ scrollbarWidth: 'thin', scrollbarColor: '#f97316 #fef3c7' }}>
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-gray-800 z-30 p-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">المحادثات</h2>
          <button
            className="p-1 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900 transition"
            onClick={() => setSidebarOpen(false)}
            aria-label="إخفاء القائمة"
          >
            <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        </div>
        {sidebarOpen && (
          loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <div className="text-gray-600 dark:text-gray-400">جاري تحميل المحادثات...</div>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-gray-600 dark:text-gray-400">لا توجد محادثات</div>
          ) : (
            <ul>
              {chats.map((chat) => (
                <li
                  key={chat._id}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors
                    ${selectedChat?._id === chat._id 
                      ? 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 font-bold' 
                      : 'bg-white dark:bg-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20'}
                    border border-gray-200 dark:border-gray-600`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold truncate text-gray-900 dark:text-white">
                      {chat.unit?.name || 'محادثة عامة'}
                    </div>
                    {chat.unreadCount > 0 && chat.lastMessageSenderId !== user._id && (
                      <span className="ml-2 bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {user.role === 'landlord' ? `من: ${chat.tenant?.name}` : `مع: ${chat.landlord?.name}`}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleString() : ""}</div>
                  <div className="text-sm mt-1 truncate text-gray-700 dark:text-gray-300">{chat.lastMessage}</div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-screen items-stretch justify-stretch transition-all duration-300 ${sidebarOpen ? '' : 'w-full'}`}>
        {/* زر إظهار السايدبار عند الإخفاء */}
        {!sidebarOpen && (
          <button
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 shadow"
            onClick={() => setSidebarOpen(true)}
            aria-label="إظهار القائمة"
          >
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
        {selectedChat ? (
          <div className="flex flex-col h-full w-full">
            {/* عنوان المحادثة ثابت */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400">
                {user.role === 'landlord'
                  ? `محادثة مع المستأجر: ${selectedChat.tenant?.name}${selectedChat.unit?.name ? ` - الوحدة: ${selectedChat.unit.name}` : ''}`
                  : `محادثة مع المالك: ${selectedChat.landlord?.name}${selectedChat.unit?.name ? ` - الوحدة: ${selectedChat.unit.name}` : ''}`}
              </h3>
              {/* زر العودة للوحة التحكم */}
              <button
                onClick={() => router.push('/dashboard')}
                className="group relative p-2 rounded-full bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 transition-all duration-200 shadow-md"
                aria-label="العودة للوحة التحكم"
              >
                <svg 
                  className="w-6 h-6 text-orange-600 dark:text-orange-400 transition-transform group-hover:scale-110" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                  />
                </svg>
                {/* Tooltip */}
                <div className="absolute top-1/2 left-full ml-2 transform -translate-y-1/2 px-3 py-1 bg-orange-500 dark:bg-orange-600 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  العودة للوحة التحكم
                  <div className="absolute top-1/2 right-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-orange-500 dark:border-r-orange-600"></div>
                </div>
              </button>
            </div>
            {/* الرسائل */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-br from-white to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4 space-y-2 scrollbar-thin scrollbar-thumb-orange-200 dark:scrollbar-thumb-orange-600 scrollbar-track-orange-50 dark:scrollbar-track-gray-700">
              {messages.map((msg, idx) => (
                <div key={msg._id || idx} className={`flex ${msg.sender === user._id ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`relative max-w-[75%] px-4 py-2 rounded-2xl shadow-md text-base break-words
                      ${msg.sender === user._id
                        ? 'bg-orange-500 text-white rounded-br-md rounded-tl-2xl'
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-orange-100 dark:border-orange-600 rounded-bl-md rounded-tr-2xl'}
                    `}
                    style={{
                      borderBottomRightRadius: msg.sender === user._id ? '0.5rem' : '1rem',
                      borderBottomLeftRadius: msg.sender !== user._id ? '0.5rem' : '1rem',
                    }}
                  >
                    {msg.text}
                    <div className={`text-xs mt-1 ${msg.sender === user._id ? 'text-orange-100' : 'text-gray-400 dark:text-gray-500'}`}>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {/* شريط الإدخال */}
            <form onSubmit={handleSend} className="p-3 flex gap-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0 z-10">
              <input
                className="flex-1 border border-orange-200 dark:border-orange-600 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 transition text-base bg-orange-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="اكتب رسالتك..."
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 dark:hover:bg-orange-700 text-white px-6 py-2 rounded-full font-bold shadow transition"
              >
                إرسال
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">اختر محادثة لعرض الرسائل</div>
        )}
      </div>
    </div>
  );
} 