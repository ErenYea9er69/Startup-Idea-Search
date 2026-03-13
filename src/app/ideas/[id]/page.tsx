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
    <div style={{ paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 40 }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: '3rem', lineHeight: 1.1 }}>{idea.name}</h1>
          <div className="tag-container" style={{ marginTop: 16 }}>
            <span className="tag tag-accent" style={{ fontSize: '0.9rem', padding: '6px 16px' }}>{idea.industry}</span>
            {idea.category && <span className="tag tag-violet" style={{ fontSize: '0.9rem', padding: '6px 16px' }}>{idea.category}</span>}
            {idea.businessType && <span className="tag tag-emerald" style={{ fontSize: '0.9rem', padding: '6px 16px' }}>{idea.businessType}</span>}
            {idea.status === 'trap' && <span className="tag tag-rose" style={{ fontSize: '0.9rem', padding: '6px 16px' }}>⚠️ AVOID: TRAP IDEA</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div className={`score-badge ${getScoreClass(idea.overallScore)}`} style={{ width: 80, height: 80, fontSize: '2.5rem', borderRadius: 24 }}>
            {idea.overallScore || '?'}
          </div>
          <button className={`btn ${idea.status === 'bookmarked' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }} onClick={toggleBookmark}>
            {idea.status === 'bookmarked' ? '★ Saved' : '☆ Save Idea'}
          </button>
        </div>
      </div>

      {/* Composite Scores */}
      {idea.compositeScores && (
        <div className="stats-grid" style={{ marginBottom: 32, gap: 24 }}>
          <div className="card stat-card" style={{ padding: '24px', borderTop: '2px solid var(--accent)' }}>
            <div className="stat-value" style={{ fontSize: '2.5rem' }}>{idea.compositeScores.overallWinnability || 0}</div>
            <div className="stat-label">Winnability</div>
          </div>
          <div className="card stat-card" style={{ padding: '24px', borderTop: '2px solid var(--emerald)' }}>
            <div className="stat-value" style={{ fontSize: '2.5rem' }}>{idea.compositeScores.cashFlowPotential || 0}</div>
            <div className="stat-label">Cash-Flow</div>
          </div>
          <div className="card stat-card" style={{ padding: '24px', borderTop: '2px solid var(--cyan)' }}>
            <div className="stat-value" style={{ fontSize: '2.5rem' }}>{idea.compositeScores.ventureScalePotential || 0}</div>
            <div className="stat-label">Venture Scale</div>
          </div>
          <div className="card stat-card" style={{ padding: '24px', borderTop: '2px solid var(--violet)' }}>
            <div className="stat-value" style={{ fontSize: '2.5rem' }}>{idea.compositeScores.soloFounderFeasibility || 0}</div>
            <div className="stat-label">Solo Founder</div>
          </div>
        </div>
      )}

      {/* Idea Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) minmax(400px, 1fr)', gap: 24, marginBottom: 32 }}>
        <div className="card" style={{ padding: 32 }}>
          <h3 className="section-title">Problem & Customer</h3>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Problem:</strong><br/>{idea.problem}
          </p>
          <div style={{ display: 'grid', gap: 12, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            {idea.customer && <div><strong style={{ color: 'var(--text-primary)' }}>Customer:</strong> {idea.customer}</div>}
            {idea.budgetOwner && <div><strong style={{ color: 'var(--text-primary)' }}>Budget Owner:</strong> {idea.budgetOwner}</div>}
            {idea.currentWorkaround && <div><strong style={{ color: 'var(--text-primary)' }}>Workaround:</strong> {idea.currentWorkaround}</div>}
          </div>
        </div>
        <div className="card" style={{ padding: 32 }}>
          <h3 className="section-title">Opportunity & Execution</h3>
          <div style={{ display: 'grid', gap: 16, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {idea.whyNow && <div><strong style={{ color: 'var(--text-primary)' }}>Why Now:</strong><br/>{idea.whyNow}</div>}
            {idea.fastestMVP && <div><strong style={{ color: 'var(--text-primary)' }}>Fastest MVP:</strong><br/>{idea.fastestMVP}</div>}
            {idea.goToMarket && <div><strong style={{ color: 'var(--text-primary)' }}>Go-to-Market:</strong><br/>{idea.goToMarket}</div>}
          </div>
        </div>
      </div>

      {/* 14-Dimension Scores */}
      {idea.scores && (
        <div className="card" style={{ marginBottom: 40, padding: 32 }}>
          <h3 className="section-title">14-Dimension Validation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {Object.entries(SCORE_LABELS).map(([key, label]) => {
              const val = (idea.scores as Record<string, number>)?.[key] || 0;
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: getBarColor(val) }}>{val}<span style={{ fontSize: '0.8rem', opacity: 0.5 }}>/10</span></div>
                  </div>
                  <div style={{ height: 10, borderRadius: 5, background: 'rgba(0,0,0,0.3)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ height: '100%', width: `${val * 10}%`, borderRadius: 4, background: getBarColor(val), transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 32 }}>
        <button className={`tab ${activeTab === 'validation' ? 'active' : ''}`} onClick={() => setActiveTab('validation')}>
          <span style={{ fontSize: '1.2rem', marginRight: 8 }}>🔬</span> Validation Phases
        </button>
        <button className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <span style={{ fontSize: '1.2rem', marginRight: 8 }}>💬</span> Deep-Dive Chat
        </button>
        <button className={`tab ${activeTab === 'action-plan' ? 'active' : ''}`} onClick={() => setActiveTab('action-plan')}>
          <span style={{ fontSize: '1.2rem', marginRight: 8 }}>📝</span> Action Plan
        </button>
      </div>

      {/* Validation Phases */}
      {activeTab === 'validation' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {phases.map((phase, i) => (
            <div key={i} className="expandable card" style={{ padding: 0, overflow: 'hidden' }}>
              <div 
                className="expandable-header" 
                onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
                style={{ padding: '24px 32px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expandedPhase === i ? 'rgba(255,255,255,0.02)' : 'transparent' }}
              >
                <div style={{ fontSize: '1.1rem' }}><strong style={{ color: 'var(--accent)' }}>Phase {i + 1}:</strong> {PHASE_NAMES[i] || `Phase ${i + 1}`}</div>
                <div style={{ color: 'var(--text-muted)', transform: expandedPhase === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>▼</div>
              </div>
              {expandedPhase === i && (
                <div className="expandable-content" style={{ padding: '0 32px 32px 32px', borderTop: '1px solid var(--border-subtle)' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 24 }}>
                    {JSON.stringify(phase, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {/* Sources */}
          {idea.sources && (idea.sources as string[]).length > 0 && (
            <div className="card" style={{ marginTop: 24, padding: 32 }}>
              <h3 className="section-title">Verified Sources</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(idea.sources as string[]).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.95rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ opacity: 0.5 }}>🔗</span> {url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat */}
      {activeTab === 'chat' && (
        <div className="chat-container card" style={{ padding: 0, height: 600, display: 'flex', flexDirection: 'column' }}>
          <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {idea.chatMessages.length === 0 && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 'auto', maxWidth: 400 }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🤖</div>
                <h3>AI Co-Founder Ready</h3>
                <p>Ask anything about this idea — the AI has full context of all validation phases, scores, and competitive research.</p>
              </div>
            )}
            {idea.chatMessages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`} style={{ 
                maxWidth: '80%', 
                padding: '16px 24px', 
                borderRadius: 'var(--radius-xl)', 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-glass)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                lineHeight: 1.6,
                boxShadow: msg.role === 'user' ? '0 4px 20px rgba(59, 130, 246, 0.3)' : 'none'
              }}>
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 12, alignItems: 'center', color: 'var(--text-muted)', padding: '16px 24px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
                <div className="spinner" /> Analyzing...
              </div>
            )}
          </div>
          <div className="chat-input-area" style={{ padding: 24, borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <input
                className="input"
                style={{ flex: 1, borderRadius: 'var(--radius-xl)', padding: '16px 24px' }}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !chatLoading && sendChat()}
                placeholder="Message your AI co-founder..."
                disabled={chatLoading}
              />
              <button className="btn btn-primary" style={{ padding: '0 32px', borderRadius: 'var(--radius-xl)' }} onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Plan */}
      {activeTab === 'action-plan' && (
        <div className="card" style={{ padding: 32 }}>
          <h3 className="section-title">Execution Roadmap</h3>
          {idea.actionPlan ? (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              {JSON.stringify(idea.actionPlan, null, 2)}
            </pre>
          ) : (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>⏳</div>
              <div className="empty-state-title">No action plan yet</div>
              <div className="empty-state-text" style={{ maxWidth: 400, margin: '0 auto' }}>Action plans are automatically generated for highly promising ideas that exceed your scoring threshold.</div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="card" style={{ marginTop: 40, padding: 32, borderTop: '2px dashed var(--border-subtle)' }}>
        <h3 className="section-title">Founder Notes</h3>
        <textarea
          className="textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Jot down your thoughts, potential early adopters, or variations of this idea..."
          style={{ minHeight: 120, fontSize: '1rem', padding: 20 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={saveNote}>
            Save Notes
          </button>
        </div>
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
