'use client';

import { useState, useEffect, useRef } from 'react';
import { INDUSTRY_PRESETS, EXCLUSION_PRESETS } from '@/lib/presets';

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
  const [isStopping, setIsStopping] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  const stopAllPipelines = async () => {
    if (!confirm('🛑 WARNING: This will kill ALL active pipelines on the server. Procede?')) return;
    setIsStopping(true);
    try {
      await fetch('/api/pipeline/stop-all', { method: 'POST' });
      setEvents(prev => [...prev, { 
        type: 'error', 
        data: { error: '🚨 GLOBAL KILL SWITCH ACTIVATED. Stopping all background tasks...' }, 
        timestamp: new Date().toISOString() 
      }]);
      setIsRunning(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStopping(false);
    }
  };
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState('');
  const [completedPhases, setCompletedPhases] = useState<string[]>([]);
  const [iteration, setIteration] = useState(0);
  const [maxIter, setMaxIter] = useState(0);
  const [estimate, setEstimate] = useState<Record<string, unknown> | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const launchingRef = useRef(false);

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

  const toggleFocusPreset = (p: string) => {
    if (focusAreas.includes(p)) {
      setFocusAreas(focusAreas.filter(x => x !== p));
    } else {
      setFocusAreas([...focusAreas, p]);
      // Auto-exclude all other INDUSTRY presets that aren't this one
      const others = INDUSTRY_PRESETS.flatMap(g => g.items).filter(item => item !== p);
      setExcluded(prev => Array.from(new Set([...prev, ...others])));
    }
  };

  const toggleExcludePreset = (p: string) => {
    if (excluded.includes(p)) {
      setExcluded(excluded.filter(x => x !== p));
    } else {
      setExcluded([...excluded, p]);
      // Also remove from focus if it's there
      setFocusAreas(prev => prev.filter(x => x !== p));
    }
  };

  const clearExclusions = () => setExcluded([]);
  const clearFocus = () => setFocusAreas([]);

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
    if (launchingRef.current) return;
    launchingRef.current = true;

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

      // Start SSE with auto-reconnect logic
      let eventSource: EventSource | null = null;
      let activelyRunning = true; 

      const connect = () => {
        if (!activelyRunning) return;
        eventSource = new EventSource(`/api/pipeline/${data.id}/stream`);
        
        eventSource.onmessage = (e) => {
          try {
            const event: PipelineEvent = JSON.parse(e.data);
            
            if (event.type === 'pulse') {
              setEvents((prev) => {
                const last = prev[prev.length - 1];
                if (last?.type === 'pulse') return prev;
                return [...prev, event];
              });
              return;
            }

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
              activelyRunning = false;
              eventSource?.close();
              setIsRunning(false);
            }
          } catch {}
        };

        eventSource.onerror = () => {
          console.warn("[Pipeline] Stream interrupted. Attempting reconnect...");
          eventSource?.close();
          if (activelyRunning) {
            setTimeout(connect, 2000);
          }
        };
      };

      connect();
    } catch (err) {
      console.error(err);
      setIsRunning(false);
    } finally {
      launchingRef.current = false;
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, alignItems: 'start' }}>
          <div className="card">
            <h3 className="section-title">Pipeline Configuration</h3>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="label" style={{ marginBottom: 0 }}>Focus Areas / Industries</label>
                <button className="btn-link" onClick={clearFocus}>Clear All</button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <input
                  className="input"
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFocus()}
                  placeholder="e.g. healthcare, logistics, AI..."
                />
                <button className="btn btn-secondary" onClick={addFocus}>Add</button>
              </div>
              <div className="tag-container">
                {focusAreas.map((a) => (
                  <span key={a} className="tag tag-accent">
                    {a} <span className="tag-remove" onClick={() => setFocusAreas(focusAreas.filter((x) => x !== a))}>✕</span>
                  </span>
                ))}
              </div>
              
              <div style={{ 
                marginTop: 12, 
                maxHeight: '200px', 
                overflowY: 'auto', 
                padding: '12px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {INDUSTRY_PRESETS.map(group => (
                  <div key={group.name} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginBottom: 8 }}>{group.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {group.items.map(p => {
                        const isFocused = focusAreas.includes(p);
                        const isExcluded = excluded.includes(p);
                        return (
                          <button 
                            key={p} 
                            className={`preset-btn ${isFocused ? 'active' : ''} ${isExcluded ? 'dimmed' : ''}`}
                            onClick={() => toggleFocusPreset(p)}
                            title={isExcluded ? "Currently excluded" : ""}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="label" style={{ marginBottom: 0 }}>Excluded Categories</label>
                <button className="btn-link" onClick={clearExclusions}>Clear All</button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <input
                  className="input"
                  value={excludeInput}
                  onChange={(e) => setExcludeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExclude()}
                  placeholder="e.g. crypto, social media, dating apps..."
                />
                <button className="btn btn-secondary" onClick={addExclude}>Add</button>
              </div>
              <div className="tag-container">
                {excluded.map((a) => (
                  <span key={a} className="tag tag-rose">
                    {a} <span className="tag-remove" onClick={() => setExcluded(excluded.filter((x) => x !== a))}>✕</span>
                  </span>
                ))}
              </div>

              <div style={{ 
                marginTop: 12, 
                maxHeight: '200px', 
                overflowY: 'auto', 
                padding: '12px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {EXCLUSION_PRESETS.map(group => (
                  <div key={group.name} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginBottom: 8 }}>{group.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {group.items.map(p => {
                        const isExcluded = excluded.includes(p);
                        return (
                          <button 
                            key={p} 
                            className={`preset-btn-rose ${isExcluded ? 'active' : ''}`}
                            onClick={() => toggleExcludePreset(p)}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Score Threshold: <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>{threshold}/100</span></label>
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
                <label className="label">Max Iterations: <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>{maxIterations}</span></label>
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
                placeholder="Any additional brutal constraints for the AI to consider (e.g. 'Must be buildable by 1 dev in 1 week')..."
              />
            </div>
          </div>

          <div style={{ position: 'sticky', top: 24 }}>
            <div className="card" style={{ marginBottom: 24, borderTop: '2px solid var(--emerald)' }}>
              <h3 className="section-title">Cost Estimate</h3>
              {estimate ? (
                <div>
                  <div className="stat-value" style={{ fontSize: '2.5rem', marginBottom: 8 }}>
                    ~{((estimate.estimatedTokens as number) / 1000).toFixed(0)}K <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>tokens</span>
                  </div>
                  <div className="tag tag-emerald" style={{ display: 'inline-flex' }}>
                    ~{estimate.estimatedTavilyCredits as number} Tavily credits
                  </div>
                </div>
              ) : (
                <button className="btn btn-secondary" onClick={getEstimate} style={{ width: '100%' }}>Calculate Estimate</button>
              )}
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', padding: '20px' }}
              onClick={startPipeline}
              disabled={isRunning || isStopping}
            >
               <span style={{ fontSize: '1.2rem' }}>🚀</span> Launch Pipeline
            </button>

            <button
              className="btn btn-danger"
              style={{ width: '100%', marginTop: 12, padding: '10px', background: 'rgba(244, 63, 94, 0.1)', borderColor: 'var(--rose)', color: 'var(--rose)' }}
              onClick={stopAllPipelines}
              disabled={isStopping}
            >
              {isStopping ? '🛑 Stopping...' : '🛑 Stop All Old Pipelines'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button className="btn btn-secondary" onClick={() => controlPipeline('pause')}>⏸ Pause</button>
            <button className="btn btn-danger" onClick={() => controlPipeline('cancel')}>❌ Cancel</button>
            <button 
              className="btn btn-danger" 
              style={{ padding: '8px 16px', fontSize: 13, background: 'rgba(244, 63, 94, 0.2)' }} 
              onClick={stopAllPipelines}
              disabled={isStopping}
            >
              🛑 Stop All Tasks
            </button>
            {iteration > 0 && (
              <span className="tag tag-accent" style={{ padding: '8px 16px', fontSize: 13, marginLeft: 'auto' }}>
                Iteration {iteration}/{maxIter}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 32 }}>
            <div className="card">
              <h3 className="section-title">Validation Progress</h3>
              <div className="pipeline-phases">
                {Object.entries(PHASE_LABELS).map(([key, label]) => {
                  const isDone = completedPhases.includes(key);
                  const isActive = currentPhase === key;
                  return (
                    <div key={key} className={`phase-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                      <div className="phase-dot" />
                      <div style={{ flex: 1 }}>
                        <div className="phase-name">{label}</div>
                        {(isActive || isDone) && (
                           <div className="phase-status">{isDone ? 'Completed successfully' : 'Running...'}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="section-title" style={{ marginBottom: 16 }}>Live Terminal Feed</h3>
              <div className="terminal-feed" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {events.map((e, i) => (
                    <div key={i} className="terminal-line">
                      <span style={{ color: getEventColor(e.type), fontWeight: 'bold' }}>
                        [{getEventIcon(e.type)} {e.type.toUpperCase()}]
                      </span>
                      <span style={{ color: '#aaa', marginLeft: 8 }}>{formatEventData(e)}</span>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--emerald)', padding: 16 }}>
                      <div className="spinner" style={{ borderTopColor: 'var(--emerald)' }} /> Initialize Sequence...
                    </div>
                  )}
                  <div ref={eventsEndRef} />
                </div>
              </div>
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
  if (type === 'pulse') return '🫀';
  return '•';
}

function formatEventData(event: PipelineEvent): string {
  const d = event.data;
  switch (event.type) {
    case 'pulse': return `Heuristic check: still thinking about ${d.idea}...`;
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
