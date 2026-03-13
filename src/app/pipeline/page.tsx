'use client';

import { useState, useEffect, useRef } from 'react';

interface PipelineEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const PHASE_LABELS: Record<string, string> = {
  research_planning: '📋 Research Planning',
  building_queries: '🔍 Building Search Queries',
  searching: '🌐 Multi-Angle Web Search',
  synthesizing: '🧠 Synthesizing Research',
  generating_ideas: '💡 Generating Ideas',
  trap_detection: '⚠️ Detecting Trap Ideas',
  screening: '⚡ Quick Screening',
  deep_validation: '🔬 Deep Validation (8 Phases)',
  scoring: '📊 14-Dimension Scoring',
  action_plan: '📝 Generating Action Plans',
};

export default function PipelinePage() {
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [focusInput, setFocusInput] = useState('');
  const [excluded, setExcluded] = useState<string[]>([]);
  const [excludeInput, setExcludeInput] = useState('');
  const [threshold, setThreshold] = useState(70);
  const [maxIterations, setMaxIterations] = useState(3);
  const [customCriteria, setCustomCriteria] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState('');
  const [completedPhases, setCompletedPhases] = useState<string[]>([]);
  const [iteration, setIteration] = useState(0);
  const [maxIter, setMaxIter] = useState(0);
  const [estimate, setEstimate] = useState<Record<string, unknown> | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Load saved preferences
  useEffect(() => {
    fetch('/api/preferences')
      .then((r) => r.json())
      .then((prefs) => {
        if (!prefs || prefs.error) return;
        
        try { 
          const focus = typeof prefs.focusAreas === 'string' ? JSON.parse(prefs.focusAreas) : (prefs.focusAreas || []);
          if (focus.length) setFocusAreas(focus);
        } catch {}
        
        try {
          const excl = typeof prefs.excludedCategories === 'string' ? JSON.parse(prefs.excludedCategories) : (prefs.excludedCategories || []);
          if (excl.length) setExcluded(excl);
        } catch {}
        
        if (prefs.scoringThreshold) setThreshold(prefs.scoringThreshold);
        if (prefs.maxIterations) setMaxIterations(prefs.maxIterations);
        if (prefs.customCriteria) setCustomCriteria(prefs.customCriteria);
      })
      .catch(() => {});
  }, []);

  const addFocus = () => {
    if (focusInput.trim() && !focusAreas.includes(focusInput.trim())) {
      setFocusAreas([...focusAreas, focusInput.trim()]);
      setFocusInput('');
    }
  };

  const addExclude = () => {
    if (excludeInput.trim() && !excluded.includes(excludeInput.trim())) {
      setExcluded([...excluded, excludeInput.trim()]);
      setExcludeInput('');
    }
  };

  const getEstimate = async () => {
    const res = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxIterations, searchDepth: 'advanced' }),
    });
    const data = await res.json();
    setEstimate(data);
  };

  const startPipeline = async () => {
    setIsRunning(true);
    setEvents([]);
    setCompletedPhases([]);
    setCurrentPhase('');

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focusAreas,
          excludedCategories: excluded,
          scoringThreshold: threshold,
          maxIterations,
          searchDepth: 'advanced',
          customCriteria: customCriteria || undefined,
        }),
      });

      const data = await res.json();
      setRunId(data.id);

      // Start SSE
      const eventSource = new EventSource(`/api/pipeline/${data.id}/stream`);
      eventSource.onmessage = (e) => {
        try {
          const event: PipelineEvent = JSON.parse(e.data);
          setEvents((prev) => [...prev, event]);

          if (event.type === 'phase_start') {
            const phase = event.data.phase as string;
            setCurrentPhase(phase);
            setCompletedPhases((prev) =>
              prev.includes(currentPhase) ? prev : currentPhase ? [...prev, currentPhase] : prev
            );
          }

          if (event.type === 'iteration_start') {
            setIteration(event.data.iteration as number);
            setMaxIter(event.data.maxIterations as number);
          }

          if (event.type === 'stream_end' || event.type === 'complete' || event.type === 'error') {
            eventSource.close();
            setIsRunning(false);
          }
        } catch {}
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsRunning(false);
      };
    } catch {
      setIsRunning(false);
    }
  };

  const controlPipeline = async (action: string) => {
    if (!runId) return;
    await fetch(`/api/pipeline/${runId}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (action === 'cancel') setIsRunning(false);
  };

  return (
    <div>
      <h1 className="page-title">Pipeline Runner</h1>
      <p className="page-subtitle">Configure and launch your startup idea search pipeline</p>

      {!isRunning ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <h3 className="section-title">Configuration</h3>

            <div className="form-group">
              <label className="label">Focus Areas / Industries</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="input"
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFocus()}
                  placeholder="e.g. healthcare, logistics..."
                />
                <button className="btn btn-secondary btn-sm" onClick={addFocus}>Add</button>
              </div>
              <div className="tag-container">
                {focusAreas.map((a) => (
                  <span key={a} className="tag tag-accent">
                    {a}
                    <span className="tag-remove" onClick={() => setFocusAreas(focusAreas.filter((x) => x !== a))}>✕</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="label">Excluded Categories</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="input"
                  value={excludeInput}
                  onChange={(e) => setExcludeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExclude()}
                  placeholder="e.g. crypto, social media..."
                />
                <button className="btn btn-secondary btn-sm" onClick={addExclude}>Add</button>
              </div>
              <div className="tag-container">
                {excluded.map((a) => (
                  <span key={a} className="tag tag-rose">
                    {a}
                    <span className="tag-remove" onClick={() => setExcluded(excluded.filter((x) => x !== a))}>✕</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Score Threshold: {threshold}/100</label>
                <input
                  type="range"
                  className="slider"
                  min={30}
                  max={90}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="label">Max Iterations: {maxIterations}</label>
                <input
                  type="range"
                  className="slider"
                  min={1}
                  max={10}
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Custom Criteria (optional)</label>
              <textarea
                className="textarea"
                value={customCriteria}
                onChange={(e) => setCustomCriteria(e.target.value)}
                placeholder="Any additional criteria for the AI to consider..."
              />
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 className="section-title">Cost Estimate</h3>
              {estimate ? (
                <div>
                  <div className="stat-value" style={{ fontSize: 20, marginBottom: 8 }}>
                    ~{((estimate.estimatedTokens as number) / 1000).toFixed(0)}K tokens
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    ~{estimate.estimatedTavilyCredits as number} Tavily credits
                  </div>
                </div>
              ) : (
                <button className="btn btn-secondary" onClick={getEstimate}>Calculate Estimate</button>
              )}
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={startPipeline}
              disabled={isRunning}
            >
              🚀 Launch Pipeline
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button className="btn btn-secondary" onClick={() => controlPipeline('pause')}>⏸ Pause</button>
            <button className="btn btn-danger" onClick={() => controlPipeline('cancel')}>❌ Cancel</button>
            {iteration > 0 && (
              <span className="tag tag-accent" style={{ padding: '8px 16px', fontSize: 14 }}>
                Iteration {iteration}/{maxIter}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
            <div className="card">
              <h3 className="section-title">Progress</h3>
              <div className="pipeline-phases">
                {Object.entries(PHASE_LABELS).map(([key, label]) => {
                  const isDone = completedPhases.includes(key);
                  const isActive = currentPhase === key;
                  return (
                    <div key={key} className={`phase-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                      <div className="phase-dot" />
                      <span className="phase-name">{label}</span>
                      <span className="phase-status">{isDone ? '✓' : isActive ? '...' : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ maxHeight: 600, overflowY: 'auto' }}>
              <h3 className="section-title">Live Feed</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {events.map((e, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: getEventColor(e.type), fontWeight: 600 }}>
                      {getEventIcon(e.type)} {e.type}
                    </span>
                    {' — '}
                    <span>{formatEventData(e)}</span>
                  </div>
                ))}
                <div ref={eventsEndRef} />
              </div>
              {events.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                  <div className="spinner" /> Starting pipeline...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getEventColor(type: string): string {
  if (type.includes('error')) return 'var(--rose)';
  if (type.includes('accept') || type === 'complete') return 'var(--emerald)';
  if (type.includes('reject') || type.includes('killed')) return 'var(--amber)';
  if (type.includes('validation')) return 'var(--violet)';
  return 'var(--accent)';
}

function getEventIcon(type: string): string {
  if (type === 'phase_start') return '▶';
  if (type === 'idea_accepted') return '✅';
  if (type === 'idea_rejected') return '❌';
  if (type === 'validation') return '🔬';
  if (type === 'search_result') return '🔍';
  if (type === 'complete') return '🏁';
  if (type === 'error') return '💥';
  return '•';
}

function formatEventData(event: PipelineEvent): string {
  const d = event.data;
  switch (event.type) {
    case 'phase_start': return String(d.phase || '');
    case 'search_result': return `"${d.query}" → ${d.resultCount} results`;
    case 'ideas_generated': return `${d.count} ideas generated`;
    case 'screening_complete': return `${d.survived} survived, ${d.killed} killed`;
    case 'validation': return `${d.idea} — Phase ${d.phase}: ${d.name}`;
    case 'idea_accepted': return `🎉 ${d.name} — Score: ${d.score} (${d.category})`;
    case 'idea_rejected': return `${d.name} — Score: ${d.score}. ${d.reason}`;
    case 'complete': return `Done! ${d.promisingCount} promising, ${d.rejectedCount} rejected`;
    case 'error': return String(d.error || 'Unknown error');
    default: return JSON.stringify(d).slice(0, 100);
  }
}
