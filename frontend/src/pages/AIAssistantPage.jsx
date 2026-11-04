import React from 'react';
import { Bot, ShieldCheck, BookOpen, Layers } from 'lucide-react';
import PageTitle from '../components/PageTitle';
import ChatInterface from '../components/ChatInterface';

export default function AIAssistantPage() {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <PageTitle
        title="Clinical AI Assistant"
        subtitle="Intelligent medical question answering grounded strictly in the 9 approved clinical reference publications and launch decks."
        badge="Evidence-Grounded AI"
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
              9 Publications Indexed
            </span>
          </div>
        }
      />

      {/* Main Interactive Chat Interface */}
      <ChatInterface />
    </div>
  );
}