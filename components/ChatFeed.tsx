'use client';
import { useEffect, useRef } from 'react';
import SweepCard from './SweepCard';

interface Message {
  role: string;
  content: string;
  timestamp: string;
  type?: 'sweep' | 'message';
  sweep_data?: {
    findings: Array<{ company_ticker: string; classification: string; headline: string }>;
    signals: Array<{ signal: string }>;
  };
}

interface ChatFeedProps {
  messages: Message[];
  agentName: string;
  isLoading?: boolean;
}

export default function ChatFeed({ messages, agentName, isLoading }: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="font-mono text-lg mb-2">{agentName}</p>
          <p className="text-base">No messages yet. Start by asking a question.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((msg, i) => {
        if (msg.type === 'sweep' && msg.sweep_data) {
          const date = new Date(msg.timestamp).toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric'
          });
          return (
            <SweepCard
              key={i}
              date={date}
              findings={msg.sweep_data.findings}
              signals={msg.sweep_data.signals}
              agentName={agentName}
            />
          );
        }

        const isUser = msg.role === 'user';
        return (
          <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
            {!isUser && (
              <div className="w-7 h-7 rounded-md bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-[9px] font-mono font-bold">{agentName.slice(0, 2)}</span>
              </div>
            )}
            <div className={`max-w-[75%] ${isUser ? 'order-first' : ''}`}>
              {!isUser && (
                <p className="text-[10px] font-mono text-gray-400 mb-1">{agentName}</p>
              )}
              <div className={`px-3 py-2 rounded-xl text-base leading-relaxed whitespace-pre-wrap ${
                isUser 
                  ? 'bg-gray-900 text-white rounded-br-sm' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              <p className="text-[10px] text-gray-400 font-mono mt-1 px-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start gap-2">
          <div className="w-7 h-7 rounded-md bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-[9px] font-mono font-bold">{agentName.slice(0, 2)}</span>
          </div>
          <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl rounded-bl-sm">
            <div className="flex gap-1 items-center h-5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
