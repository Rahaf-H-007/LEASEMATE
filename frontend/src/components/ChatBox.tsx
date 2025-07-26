import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

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
}

interface Message {
  _id?: string;
  sender: string;
  text: string;
  createdAt?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ chatId, setChatId, userId, receiverId, unitId, receiverName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // معالجة: لو البيانات الأساسية غير متوفرة
  if (!userId || !receiverId || !unitId) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <span className="text-orange-500 font-bold text-lg">جاري تحميل بيانات الشات...</span>
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
      const res = await axios.post('http://localhost:5000/api/chat/create-with-message', {
        tenantId: userId,
        landlordId: receiverId,
        unitId,
        senderId: userId,
        text,
      });
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
    }
    // إذا كان هناك chatId بالفعل
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
  };

  return (
    <div className="flex flex-col h-[28rem] sm:h-[32rem] w-full border rounded-2xl shadow-2xl bg-gradient-to-br from-white to-orange-50 relative">
      {/* عنوان الشات */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-white rounded-t-2xl flex items-center gap-2 sticky top-0 z-10">
        <span className="font-bold text-orange-600 text-lg">المحادثة</span>
        {receiverName && <span className="text-gray-500 text-sm">مع {receiverName}</span>}
      </div>
      {/* الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-orange-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === userId ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`relative max-w-[75%] px-4 py-2 rounded-2xl shadow-md text-base break-words
                ${msg.sender === userId
                  ? 'bg-orange-500 text-white rounded-br-md rounded-tl-2xl'
                  : 'bg-white text-gray-800 border border-orange-100 rounded-bl-md rounded-tr-2xl'}
              `}
              style={{
                borderBottomRightRadius: msg.sender === userId ? '0.5rem' : '1rem',
                borderBottomLeftRadius: msg.sender !== userId ? '0.5rem' : '1rem',
              }}
            >
              {msg.text}
              <div className={`text-xs mt-1 ${msg.sender === userId ? 'text-orange-100' : 'text-gray-400'}`}>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* شريط الإدخال */}
      <form onSubmit={handleSend} className="p-3 flex gap-2 border-t bg-white rounded-b-2xl sticky bottom-0 z-10">
        <input
          className="flex-1 border border-orange-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-base bg-orange-50"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="اكتب رسالتك..."
        />
        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full font-bold shadow transition"
        >
          إرسال
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 