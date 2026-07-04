import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import SkillXTLogo from '../components/SkillXTLogo';
import { X, Send, MessageCircle, Minimize2, Bot, User } from 'lucide-react';

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  const suggestions = [
    "How do I earn points?",
    "How do I redeem points?",
    "What is 1 point worth?",
    "How do I signup?",
    "How do I contact support?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    const userMessage = text.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage, time: new Date() }]);
    setInput('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const res = await api.post('/api/chatbot/message', {
        question: userMessage,
        userRole: user?.role || 'guest',
        userId: user?.id || null
      });

      const botMessage = {
        role: 'bot',
        text: res.data.response || res.data.answer,
        time: new Date(),
        matched: res.data.matched,
        title: res.data.title,
        topics: res.data.topics || [],
        questions: res.data.questions || []
      };
      
      setMessages(prev => [...prev, botMessage]);

      if (!res.data.matched) {
        setShowSuggestions(true);
      }
    } catch (err) {
      toast.error('Failed to get response. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-20 right-4 z-[9999] font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-bold">Ask SkillXT</span>
        </button>
      )}

      {isOpen && (
        <div className="w-[350px] h-[480px] bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-slate-200 dark:border-dark-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <SkillXTLogo size="sm" />
              <div>
                <h3 className="text-sm font-bold">SkillXT Assistant</h3>
                <p className="text-[10px] text-indigo-200">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                  <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Hello! How can I help you today?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ask me anything about SkillXT rewards</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 rounded-bl-md'
                  }`}>
                    {msg.matched && msg.title ? (
                      <div>
                        <p className="font-bold mb-1">{msg.title}</p>
                        <p className="mb-2">{msg.text}</p>
                        {msg.topics && msg.topics.length > 0 && (
                          <ul className="list-disc list-inside text-slate-500 dark:text-slate-400 mb-2 space-y-0.5">
                            {msg.topics.map((topic, i) => (
                              <li key={i} className="text-[10px]">{topic}</li>
                            ))}
                          </ul>
                        )}
                        {msg.questions && msg.questions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {msg.questions.map((q, i) => (
                              <button
                                key={i}
                                onClick={() => handleSend(q)}
                                className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-400 rounded text-[9px] transition-all"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {formatTime(msg.time)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="px-4 py-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && messages.length === 0 && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-dark-border bg-white dark:bg-dark-card">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Suggested questions</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-[11px] font-medium transition-all border border-slate-200 dark:border-dark-border"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
