'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatFeed from '@/components/ChatFeed';
import AgentPanel from '@/components/AgentPanel';
import Composer from '@/components/Composer';
import BriefProposal from '@/components/BriefProposal';

interface Agent {
  agent_key: string;
  agent_name: string;
  sector_name: string;
  colour: string;
  thesis?: string;
  drivers?: string[];
  risks?: string[];
  ratings?: Record<string, string>;
  pending_proposal_id?: number;
}

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

interface AgentDetail extends Agent {
  thread_history: Message[];
  companies: Array<{ ticker: string; name: string; sector: string }>;
}

interface Proposal {
  id: number;
  agent_key: string;
  proposed_thesis?: string;
  proposed_drivers?: string[];
  proposed_risks?: string[];
  proposed_ratings?: Record<string, string>;
  reasoning?: string;
  proposed_at: string;
}

export default function SectorsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeKey, setActiveKey] = useState<string>('nova'); // default to NOVA
  const [agentDetail, setAgentDetail] = useState<AgentDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [showProposal, setShowProposal] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [bbgStatus, setBbgStatus] = useState<{
    last_sync: string | null;
    total_with_data: number;
    stale_count: number;
    no_data_count: number;
  } | null>(null);

  // Load all agents
  const loadAgents = useCallback(async () => {
    const res = await fetch('/api/agents');
    if (res.ok) {
      const data = await res.json();
      setAgents(data);
    }
  }, []);

  // Load active agent detail
  const loadAgentDetail = useCallback(async (key: string) => {
    const res = await fetch(`/api/agents/${key}`);
    if (res.ok) {
      const data = await res.json();
      setAgentDetail(data);
      setMessages(data.thread_history || []);
    }
  }, []);

  // Load proposal
  const loadProposal = useCallback(async (key: string) => {
    const res = await fetch(`/api/agents/${key}/proposal`);
    if (res.ok) {
      const data = await res.json();
      setProposal(data);
    }
  }, []);

  useEffect(() => {
    loadAgents();
    fetch('/api/bloomberg/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setBbgStatus(d))
      .catch(() => {});
  }, [loadAgents]);

  useEffect(() => {
    if (activeKey) {
      loadAgentDetail(activeKey);
      loadProposal(activeKey);
    }
  }, [activeKey, loadAgentDetail, loadProposal]);

  const handleSelectAgent = (key: string) => {
    setActiveKey(key);
    setAgentDetail(null);
    setMessages([]);
    setProposal(null);
    setShowProposal(false);
  };

  const handleSend = async (message: string) => {
    if (!activeKey) return;
    
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentKey: activeKey, message }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          timestamp: data.timestamp,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Network error. Please check your connection.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSweep = async () => {
    if (!activeKey || sweeping) return;
    setSweeping(true);
    try {
      const res = await fetch(`/api/sector-sweep?agent=${activeKey.toUpperCase()}`, {
        method: 'POST',
        headers: { 'x-cron-secret': '2d59c82e3b6784db3860d64d14474c22cfcdac916c64d4029fee41e88cc807cd' },
      });
      if (res.ok) {
        // Reload agent detail to get updated messages
        await loadAgentDetail(activeKey);
        await loadAgents();
        await loadProposal(activeKey);
      }
    } catch (e) {
      console.error('Sweep failed:', e);
    } finally {
      setSweeping(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!activeKey) return;
    const res = await fetch(`/api/agents/${activeKey}/proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });
    if (res.ok) {
      setShowProposal(false);
      setProposal(null);
      await loadAgentDetail(activeKey);
      await loadAgents();
    }
  };

  const handleRejectProposal = async () => {
    if (!activeKey) return;
    const res = await fetch(`/api/agents/${activeKey}/proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });
    if (res.ok) {
      setShowProposal(false);
      setProposal(null);
      await loadAgents();
    }
  };

  const activeAgentForPanel = agentDetail ? {
    ...agentDetail,
    pending_proposal_id: proposal?.id,
  } : null;

  return (
    <div className="sectors-page">
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden bg-[#f4f4ef]">
      {/* Bloomberg status bar */}
      {bbgStatus && (
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-1 flex items-center gap-4 text-xs font-mono text-gray-400">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${bbgStatus.no_data_count > 0 || bbgStatus.stale_count > 0 ? 'bg-amber-400' : 'bg-green-400'}`} />
          <span>BBG</span>
          <span>
            {bbgStatus.last_sync
              ? `Last sync ${new Date(bbgStatus.last_sync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : 'No sync yet'}
          </span>
          <span>·</span>
          <span>{bbgStatus.total_with_data} updated</span>
          {bbgStatus.stale_count > 0 && <><span>·</span><span className="text-amber-500">{bbgStatus.stale_count} stale</span></>}
          {bbgStatus.no_data_count > 0 && <><span>·</span><span className="text-red-400">{bbgStatus.no_data_count} missing</span></>}
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        agents={agents.map(a => ({
          ...a,
          pending_proposal_id: a.pending_proposal_id,
        }))}
        activeKey={activeKey}
        onSelect={handleSelectAgent}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-[#f8f8f5] min-w-0">
        {/* Chat header */}
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-mono font-bold text-gray-900">
              {agentDetail?.agent_name || activeKey.toUpperCase()}
            </h1>
            <p className="text-xs text-gray-400">{agentDetail?.sector_name || '...'}</p>
          </div>
          {agentDetail && agentDetail.companies.length > 0 && (
            <button
              onClick={handleManualSweep}
              disabled={sweeping}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-mono transition-colors disabled:opacity-50"
              title="Run sweep now"
            >
              <span className={sweeping ? 'animate-spin' : ''}>↻</span>
              {sweeping ? 'Sweeping...' : 'Sweep'}
            </button>
          )}
        </div>

        {/* Feed */}
        <ChatFeed
          messages={messages}
          agentName={agentDetail?.agent_name || activeKey.toUpperCase()}
          isLoading={isLoading}
        />

        {/* Composer */}
        <Composer
          onSend={handleSend}
          disabled={isLoading}
          placeholder={`Ask ${agentDetail?.agent_name || activeKey.toUpperCase()} anything...`}
        />
      </div>

      {/* Agent Panel */}
      <AgentPanel
        agent={activeAgentForPanel}
        onReviewProposal={() => setShowProposal(true)}
        onRefreshAgent={() => {
          loadAgentDetail(activeKey);
          loadAgents();
          loadProposal(activeKey);
        }}
      />

      {/* Brief Proposal Modal */}
      {showProposal && proposal && agentDetail && (
        <BriefProposal
          proposal={proposal}
          currentBrief={{
            thesis: agentDetail.thesis,
            drivers: agentDetail.drivers,
            risks: agentDetail.risks,
            ratings: agentDetail.ratings,
          }}
          agentName={agentDetail.agent_name}
          onClose={() => setShowProposal(false)}
          onAccept={handleAcceptProposal}
          onReject={handleRejectProposal}
        />
      )}
      </div>
    </div>
    </div>
  );
}
