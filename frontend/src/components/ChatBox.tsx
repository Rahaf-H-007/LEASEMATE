import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
  withCredentials: true,
});

interface ChatBoxProps {
  chatId: string | null;
  setChatId: (id: string) => void;
  userId?: string;
  receiverId?: string;
  unitId?: string;
  receiverName?: string;
  userRole?: string;
  receiverRole?: string;
}

interface Message {
  _id?: string;
  sender: string;
  text: string;
  createdAt?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ chatId, setChatId, userId, receiverId, unitId, receiverName, userRole, receiverRole }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // معالجة: لو البيانات الأساسية غير متوفرة
  if (!userId || !receiverId) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <span className={`font-bold text-lg ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`}>
          جاري تحميل بيانات الشات...
        </span>
      </div>
    );
  }

  useEffect(() => {
    if (!chatId) return;
    socket.emit('joinChat', chatId);
    axios.get(`http://localhost:5000/api/chat/${chatId}/messages`).then(res => {
      setMessages(res.data);
    });
    socket.on('newMessage', (msg: Message & { senderId?: string }) => {
      setMessages(prev => [
        ...prev,
        {
          ...msg,
          sender: msg.sender || msg.senderId || '',
        }
      ]);
    });
    return () => {
      socket.off('newMessage');
    };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!chatId) {
      // أول رسالة: أنشئ شات جديد مع الرسالة
      
      // تحديد من هو المستأجر ومن هو المالك بناءً على الأدوار
      let tenantId, landlordId;
      if (userRole === 'tenant' && receiverRole === 'landlord') {
        tenantId = userId;
        landlordId = receiverId;
      } else if (userRole === 'landlord' && receiverRole === 'tenant') {
        tenantId = receiverId;
        landlordId = userId;
      } else {
        // إذا لم تكن الأدوار محددة، نفترض أن المستخدم الحالي هو المستأجر
        tenantId = userId;
        landlordId = receiverId;
      }
      
      const requestData: any = {
        tenantId,
        landlordId,
        senderId: userId,
        text,
      };
      
      // إضافة unitId - إذا كان فارغ نرسل "profile" للشات من البروفايل
      requestData.unitId = unitId && unitId.trim() !== '' ? unitId : 'profile';
      
      console.log('Sending request data:', requestData);
      try {
        const res = await axios.post('http://localhost:5000/api/chat/create-with-message', requestData);
        console.log('Response received:', res.data);
        setChatId(res.data.chatId);
        setMessages([res.data.message]);
        socket.emit('joinChat', res.data.chatId);
        socket.emit('sendMessage', {
          chatId: res.data.chatId,
          senderId: userId,
          receiverId,
          text,
        });
        setText('');
        return;
      } catch (error: any) {
        console.error('Error creating chat:', error.response?.data || error.message);
        alert('حدث خطأ أثناء إنشاء المحادثة: ' + (error.response?.data?.error || error.message));
        return;
      }
    }
    // إذا كان هناك chatId بالفعل
    try {
      await axios.post(`http://localhost:5000/api/chat/${chatId}/messages`, {
        senderId: userId,
        text,
      });
      socket.emit('sendMessage', {
        chatId,
        senderId: userId,
        receiverId,
        text,
      });
      setText('');
    } catch (error: any) {
      console.error('Error sending message:', error.response?.data || error.message);
      alert('حدث خطأ أثناء إرسال الرسالة: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className={`flex flex-col h-[28rem] sm:h-[32rem] w-full border rounded-2xl shadow-2xl relative ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' 
        : 'bg-gradient-to-br from-white to-orange-50 border-orange-200'
    }`}>
      {/* عنوان الشات */}
      <div className={`px-4 py-3 border-b rounded-t-2xl flex items-center gap-2 sticky top-0 z-10 ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700'
          : 'bg-gradient-to-r from-orange-50 to-white border-orange-200'
      }`}>
        <span className={`font-bold text-lg ${
          theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
        }`}>
          المحادثة
        </span>
        {receiverName && (
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            مع {receiverName}
          </span>
        )}
      </div>
      
      {/* الرسائل */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin ${
        theme === 'dark'
          ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800'
          : 'scrollbar-thumb-orange-200 scrollbar-track-orange-50'
      }`}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === userId ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`relative max-w-[75%] px-4 py-2 rounded-2xl shadow-md text-base break-words
                ${msg.sender === userId
                  ? theme === 'dark'
                    ? 'bg-orange-600 text-white rounded-br-md rounded-tl-2xl'
                    : 'bg-orange-500 text-white rounded-br-md rounded-tl-2xl'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-100 border border-gray-600 rounded-bl-md rounded-tr-2xl'
                    : 'bg-white text-gray-800 border border-orange-100 rounded-bl-md rounded-tr-2xl'
                }
              `}
              style={{
                borderBottomRightRadius: msg.sender === userId ? '0.5rem' : '1rem',
                borderBottomLeftRadius: msg.sender !== userId ? '0.5rem' : '1rem',
              }}
            >
              {msg.text}
              <div className={`text-xs mt-1 ${
                msg.sender === userId 
                  ? theme === 'dark' ? 'text-orange-200' : 'text-orange-100'
                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
              }`}>
                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* شريط الإدخال */}
      <form onSubmit={handleSend} className={`p-3 flex gap-2 border-t rounded-b-2xl sticky bottom-0 z-10 ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-orange-200'
      }`}>
        <input
          className={`flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-base ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
              : 'bg-orange-50 border-orange-200 text-gray-800 placeholder-gray-500'
          }`}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="اكتب رسالتك..."
        />
        <button
          type="submit"
          className={`px-6 py-2 rounded-full font-bold shadow transition ${
            theme === 'dark'
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          إرسال
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 