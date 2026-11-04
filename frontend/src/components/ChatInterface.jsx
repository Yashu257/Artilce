import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { chatbotService } from '../services/api';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hello Doctor. I am your **Clinical Knowledge AI Assistant**, directly grounded in the 12 peer-reviewed clinical reference protocols and therapeutic guidelines. How can I assist your clinical practice today?",
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const sampleQuestions = [
    'What are the baseline triage criteria in Clinical Protocol 01?',
    'What are the titration checkpoints in Pharmacology Framework 03?',
    'Compare documentation requirements across assessment phases',
    'Summarize patient monitoring intervals from Category D'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText) => {
    const textToSend = (typeof queryText === 'string' ? queryText : input).trim();
    if (!textToSend || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatbotService.ask(textToSend);
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response.answer || 'No specific answer found in the clinical repository.',
        citations: response.citations || [],
        confidence: response.confidence || 'Evidence-Grounded (High)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: 'An error occurred while retrieving clinical evidence. Please try again.',
          citations: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: "Conversation refreshed. I am ready to assist with clinical queries across any of the 12 approved medical protocols.",
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[750px] bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                MedKnowledge Clinical AI Assistant
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
                Active Knowledge Core
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Grounded in 12 verified medical protocols and therapeutic matrices
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-2xs"
          title="Reset conversation"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>New Consultation</span>
        </button>
      </div>

      {/* Safety Notice */}
      <div className="px-6 py-2.5 bg-teal-50/50 border-b border-teal-100/60 flex items-center gap-2 text-xs text-teal-900 font-medium">
        <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
        <span>All answers are strictly synthesized from indexed clinical protocols with clickable source citations.</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-5 sm:p-6 space-y-3.5 ${
                msg.sender === 'user'
                  ? 'bg-teal-700 text-white rounded-tr-xs shadow-sm'
                  : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-4 text-[11px] pb-1 border-b border-white/20 border-slate-100">
                <span className={`font-bold ${msg.sender === 'user' ? 'text-teal-100' : 'text-teal-800'}`}>
                  {msg.sender === 'user' ? 'Attending Physician' : 'Clinical AI Engine'}
                </span>
                <span className={`text-[10px] ${msg.sender === 'user' ? 'text-teal-200' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </span>
              </div>

              {/* Message text with bold / bullet parsing */}
              <div className={`text-sm leading-relaxed whitespace-pre-line font-sans ${msg.sender === 'user' ? 'text-white' : 'text-slate-700'}`}>
                {msg.text}
              </div>

              {/* Citations Card if AI response */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                    <span>Evidence-Grounded Citations:</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {msg.citations.map((c, idx) => (
                      <Link
                        key={idx}
                        to={`/articles/${c.slug || c.id}`}
                        className="group flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-300 transition-all text-xs"
                      >
                        <div className="space-y-0.5 min-w-0 pr-3">
                          <p className="font-bold text-slate-900 group-hover:text-teal-800 truncate">
                            {c.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            Specialty: {c.category}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 font-bold text-teal-700 shrink-0">
                          <span>Read Protocol</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3.5 justify-start">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-xs p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3 text-xs text-slate-600">
              <Loader2 className="w-4 h-4 text-teal-700 animate-spin" />
              <span className="font-medium">Searching 12 clinical reference articles & synthesizing answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
          Prompts:
        </span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q)}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-300 text-slate-700 hover:text-teal-900 whitespace-nowrap transition-all disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a clinical question (e.g. dosage, triage benchmarks, protocol comparison)..."
          disabled={loading}
          className="flex-1 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="inline-flex items-center justify-center p-3 sm:px-5 sm:py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send query"
        >
          <span className="hidden sm:inline mr-2">Consult AI</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}