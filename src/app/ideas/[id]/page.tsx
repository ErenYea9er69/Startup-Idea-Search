'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Idea {
  id: string;
  name: string;
  industry: string;
  businessType: string | null;
  problem: string;
  customer: string;
  budgetOwner: string | null;
  currentWorkaround: string | null;
  whyNow: string | null;
  fastestMVP: string | null;
  goToMarket: string | null;
  status: string;
  category: string | null;
  overallScore: number | null;
  scores: Record<string, number> | null;
  compositeScores: Record<string, number> | null;
  validation: Record<string, unknown> | null;
  sources: string[] | null;
  competitors: Record<string, unknown>[] | null;
  failureReasons: unknown;
  founderFitScore: number | null;
  userNotes: string | null;
  actionPlan: Record<string, unknown> | null;
  chatMessages: { id: string; role: string; content: string; createdAt: string }[];
}

const SCORE_LABELS: Record<string, string> = {
  competitionRealism: 'Competition Realism',
  painIntensity: 'Pain Intensity',
  buyerUrgency: 'Buyer Urgency',
  budgetClarity: 'Budget Clarity',
  easeOfMVP: 'Ease of MVP',
  easeOfDistribution: 'Distribution Ease',
  speedToFirstRevenue: 'Revenue Speed',
  retentionPotential: 'Retention',
  capitalEfficiency: 'Capital Efficiency',
  smallTeamFeasibility: 'Small Team',
  defensibilityOverTime: 'Defensibility',
  expansionPotential: 'Expansion',
  serviceBusinessRisk: 'Product vs Service',
  hiddenRedOceanRisk: 'Open Market',
};

const PHASE_NAMES = [
  'Problem Reality Test',
  'Competitor Investigation',
  'Competition Saturation',
  'Build Feasibility',
  'Market & Monetization',
  'Differentiation Stress Test',
  'Failure Scenarios',
  'Final Scoring & Verdict',
];

export default function IdeaDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'validation' | 'chat' | 'action-plan'>('validation');
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    loadIdea();
  }, [id]);

  const loadIdea = async () => {
    try {
      const res = await fetch(`/api/ideas/${id}`);
      if (res.ok) {
        const data = await res.json();
        setIdea(data);
        setNote(data.userNotes || '');
      }
    } catch {}
    setLoading(false);
  };

  const saveNote = async () => {
    await fetch(`/api/ideas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userNotes: note }),
    });
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    const msg = chatInput;
    setChatInput('');

    if (idea) {
      setIdea({
        ...idea,
        chatMessages: [...idea.chatMessages, { id: 'temp', role: 'user', content: msg, createdAt: new Date().toISOString() }],
      });
    }

    try {
      const res = await fetch(`/api/ideas/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (idea) {
        setIdea({
          ...idea,
          chatMessages: [
            ...idea.chatMessages,
            { id: 'temp', role: 'user', content: msg, createdAt: new Date().toISOString() },
            { id: 'temp2', role: 'assistant', content: data.content, createdAt: new Date().toISOString() },
          ],
        });
      }
    } catch {}
    setChatLoading(false);
  };

  const toggleBookmark = async () => {
    if (!idea) return;
    const newStatus = idea.status === 'bookmarked' ? 'promising' : 'bookmarked';
    await fetch(`/api/ideas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    loadIdea();
  };

  if (loading) return <div><h1 className="page-title">Loading...</h1><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!idea) return <div><h1 className="page-title">Idea not found</h1></div>;

  const validation = idea.validation || {};
  const phases = Object.values(validation);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{idea.name}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span className="tag tag-accent">{idea.industry}</span>
            {idea.category && <span className="tag tag-violet">{idea.category}</span>}
            {idea.businessType && <span className="tag tag-emerald">{idea.businessType}</span>}
            {idea.status === 'trap' && <span className="tag tag-rose">⚠️ TRAP IDEA</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className={`score-badge ${getScoreClass(idea.overallScore)}`} style={{ width: 56, height: 56, fontSize: 22 }}>
            {idea.overallScore || '?'}
          </div>
          <button className="btn btn-secondary" onClick={toggleBookmark}>
            {idea.status === 'bookmarked' ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
        </div>
      </div>

      {/* Composite Scores */}
      {idea.compositeScores && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="card stat-card">
            <div className="stat-value">{idea.compositeScores.overallWinnability || 0}</div>
            <div className="stat-label">Winnability</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{idea.compositeScores.cashFlowPotential || 0}</div>
            <div className="stat-label">Cash-Flow</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{idea.compositeScores.ventureScalePotential || 0}</div>
            <div className="stat-label">Venture Scale</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{idea.compositeScores.soloFounderFeasibility || 0}</div>
            <div className="stat-label">Solo Founder</div>
          </div>
        </div>
      )}

      {/* Idea Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 className="section-title">Problem</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{idea.problem}</p>
          {idea.customer && <><br /><strong>Customer:</strong> {idea.customer}</>}
          {idea.budgetOwner && <><br /><strong>Budget Owner:</strong> {idea.budgetOwner}</>}
        </div>
        <div className="card">
          <h3 className="section-title">Opportunity</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {idea.whyNow && <><strong>Why Now:</strong> {idea.whyNow}<br /><br /></>}
            {idea.fastestMVP && <><strong>MVP:</strong> {idea.fastestMVP}<br /><br /></>}
            {idea.goToMarket && <><strong>Go-to-Market:</strong> {idea.goToMarket}</>}
          </p>
        </div>
      </div>

      {/* 14-Dimension Scores */}
      {idea.scores && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">14-Dimension Analysis</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {Object.entries(SCORE_LABELS).map(([key, label]) => {
              const val = (idea.scores as Record<string, number>)?.[key] || 0;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, textAlign: 'right', fontSize: 14, fontWeight: 700, color: getBarColor(val) }}>{val}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${val * 10}%`, borderRadius: 3, background: getBarColor(val), transition: 'width 0.5s' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'validation' ? 'active' : ''}`} onClick={() => setActiveTab('validation')}>🔬 Validation Phases</button>
        <button className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>💬 Deep-Dive Chat</button>
        <button className={`tab ${activeTab === 'action-plan' ? 'active' : ''}`} onClick={() => setActiveTab('action-plan')}>📝 Action Plan</button>
      </div>

      {/* Validation Phases */}
      {activeTab === 'validation' && (
        <div>
          {phases.map((phase, i) => (
            <div key={i} className="expandable">
              <div className="expandable-header" onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}>
                <span><strong>Phase {i + 1}:</strong> {PHASE_NAMES[i] || `Phase ${i + 1}`}</span>
                <span>{expandedPhase === i ? '▲' : '▼'}</span>
              </div>
              {expandedPhase === i && (
                <div className="expandable-content">
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {JSON.stringify(phase, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {/* Sources */}
          {idea.sources && (idea.sources as string[]).length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="section-title">Sources</h3>
              {(idea.sources as string[]).map((url, i) => (
                <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                  <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat */}
      {activeTab === 'chat' && (
        <div className="chat-container">
          <div className="chat-messages">
            {idea.chatMessages.length === 0 && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
                Ask anything about this idea — the AI has full context of all validation phases
              </div>
            )}
            {idea.chatMessages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>{msg.content}</div>
            ))}
            {chatLoading && <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)' }}><div className="spinner" /> Thinking...</div>}
          </div>
          <div className="chat-input-area">
            <input
              className="input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !chatLoading && sendChat()}
              placeholder="Ask about this idea..."
              disabled={chatLoading}
            />
            <button className="btn btn-primary" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* Action Plan */}
      {activeTab === 'action-plan' && (
        <div className="card">
          {idea.actionPlan ? (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {JSON.stringify(idea.actionPlan, null, 2)}
            </pre>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">No action plan yet</div>
              <div className="empty-state-text">Action plans are auto-generated for promising ideas with score ≥ threshold</div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="section-title">Your Notes</h3>
        <textarea
          className="textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add your personal notes about this idea..."
          style={{ minHeight: 100 }}
        />
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={saveNote}>
          Save Notes
        </button>
      </div>
    </div>
  );
}

function getScoreClass(score: number | null): string {
  if (!score) return 'score-low';
  if (score >= 70) return 'score-high';
  if (score >= 45) return 'score-medium';
  return 'score-low';
}

function getBarColor(val: number): string {
  if (val >= 7) return 'var(--emerald)';
  if (val >= 4) return 'var(--amber)';
  return 'var(--rose)';
}
