'use client';

import { useState, useEffect } from 'react';

// Color map for agent colours
const colourMap: Record<string, { bg: string; text: string; ring: string }> = {
  green:  { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-300' },
  blue:   { bg: 'bg-blue-500',    text: 'text-white', ring: 'ring-blue-300' },
  gold:   { bg: 'bg-yellow-500',  text: 'text-black', ring: 'ring-yellow-300' },
  purple: { bg: 'bg-purple-500',  text: 'text-white', ring: 'ring-purple-300' },
  amber:  { bg: 'bg-amber-500',   text: 'text-black', ring: 'ring-amber-300' },
  red:    { bg: 'bg-red-500',     text: 'text-white', ring: 'ring-red-300' },
  teal:   { bg: 'bg-teal-500',    text: 'text-white', ring: 'ring-teal-300' },
  pink:   { bg: 'bg-pink-500',    text: 'text-white', ring: 'ring-pink-300' },
  lime:   { bg: 'bg-lime-500',    text: 'text-black', ring: 'ring-lime-300' },
  sky:    { bg: 'bg-sky-500',     text: 'text-white', ring: 'ring-sky-300' },
  orange: { bg: 'bg-orange-500',  text: 'text-white', ring: 'ring-orange-300' },
  stone:  { bg: 'bg-stone-500',   text: 'text-white', ring: 'ring-stone-300' },
  slate:  { bg: 'bg-slate-500',   text: 'text-white', ring: 'ring-slate-300' },
  grey:   { bg: 'bg-gray-400',    text: 'text-white', ring: 'ring-gray-300' },
};

interface Agent {
  agent_key: string;
  agent_name: string;
  sector_name: string;
  colour: string;
  pending_proposal_id?: number;
}

interface SidebarProps {
  agents: Agent[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function Sidebar({ agents, activeKey, onSelect }: SidebarProps) {
  const [search, setSearch] = useState('');
  const [unread, setUnread] = useState<Set<string>>(new Set());

  // Read unread flags from localStorage on mount
  useEffect(() => {
    const u = new Set<string>();
    try {
      agents.forEach(a => {
        if (localStorage.getItem(`kabuten_unread_${a.agent_key}`) === '1') {
          u.add(a.agent_key);
        }
      });
    } catch {
      // localStorage unavailable (SSR safety)
    }
    setUnread(u);
  }, [agents]);

  const handleSelect = (key: string) => {
    // Mark as read on open
    try {
      localStorage.removeItem(`kabuten_unread_${key}`);
    } catch {
      // ignore
    }
    setUnread(prev => {
      const s = new Set(prev);
      s.delete(key);
      return s;
    });
    onSelect(key);
  };

  const filtered = agents.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.agent_name.toLowerCase().includes(q) ||
      a.sector_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-[230px] bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Sector Agents</p>
        {/* Search input */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agents..."
          className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400 font-mono"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {filtered.length === 0 && (
          <p className="px-4 py-3 text-xs text-gray-400 font-mono">No agents match.</p>
        )}
        {filtered.map((agent) => {
          const colours = colourMap[agent.colour] || colourMap.teal;
          const isActive = agent.agent_key === activeKey;
          const hasUnread = unread.has(agent.agent_key);
          return (
            <button
              key={agent.agent_key}
              onClick={() => handleSelect(agent.agent_key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              {/* Avatar with optional unread dot */}
              <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colours.bg} ${colours.text}`}>
                <span className="text-xs font-mono font-bold">{agent.agent_name.slice(0, 2)}</span>
                {hasUnread && (
                  <span
                    className="absolute bottom-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"
                    style={{ transform: 'translate(25%, 25%)' }}
                  />
                )}
              </div>
              {/* Name + sector */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-mono font-semibold text-gray-900 truncate">{agent.agent_name}</span>
                  {agent.pending_proposal_id && (
                    <span className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0" title="Pending brief proposal" />
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{agent.sector_name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
