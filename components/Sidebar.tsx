'use client';

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
  return (
    <div className="w-[230px] bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">Sector Agents</p>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {agents.map((agent) => {
          const colours = colourMap[agent.colour] || colourMap.teal;
          const isActive = agent.agent_key === activeKey;
          return (
            <button
              key={agent.agent_key}
              onClick={() => onSelect(agent.agent_key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colours.bg} ${colours.text}`}>
                <span className="text-xs font-mono font-bold">{agent.agent_name.slice(0, 2)}</span>
              </div>
              {/* Name + sector */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-mono font-semibold text-gray-900 truncate">{agent.agent_name}</span>
                  {agent.pending_proposal_id && (
                    <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title="Pending proposal" />
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
