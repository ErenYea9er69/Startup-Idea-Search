'use client';

import { useEffect, useState } from 'react';

interface Preferences {
  focusAreas: string[];
  excludedCategories: string[];
  scoringThreshold: number;
  maxIterations: number;
  searchDepth: string;
  country: string | null;
  customCriteria: string | null;
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>({
    focusAreas: [],
    excludedCategories: [],
    scoringThreshold: 70,
    maxIterations: 5,
    searchDepth: 'advanced',
    country: null,
    customCriteria: null,
  });
  const [focusInput, setFocusInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/preferences')
      .then((r) => r.json())
      .then((p) => {
        if (!p || p.error) return;
        
        let focusAreas = [];
        let excludedCategories = [];
        try { focusAreas = typeof p.focusAreas === 'string' ? JSON.parse(p.focusAreas) : (p.focusAreas || []); } catch {}
        try { excludedCategories = typeof p.excludedCategories === 'string' ? JSON.parse(p.excludedCategories) : (p.excludedCategories || []); } catch {}

        setPrefs({
          focusAreas,
          excludedCategories,
          scoringThreshold: p.scoringThreshold ?? 70,
          maxIterations: p.maxIterations ?? 5,
          searchDepth: p.searchDepth || 'advanced',
          country: p.country || null,
          customCriteria: p.customCriteria || null,
        });
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle" style={{ marginBottom: 40 }}>Configure your pipeline's brutal validation criteria</p>

      <div style={{ maxWidth: 800 }}>
        <div className="card" style={{ marginBottom: 32, padding: 32 }}>
          <h3 className="section-title">Default Focus Areas</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 16 }}>Specify industries or niches you want the AI to prioritize.</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input className="input" style={{ flex: 1, padding: '12px 16px' }} value={focusInput} onChange={(e) => setFocusInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && focusInput.trim()) { setPrefs({ ...prefs, focusAreas: [...prefs.focusAreas, focusInput.trim()] }); setFocusInput(''); }}}
              placeholder="e.g. developer tools, healthcare AI..." />
            <button className="btn btn-secondary" style={{ padding: '0 24px' }} onClick={() => { if (focusInput.trim()) { setPrefs({ ...prefs, focusAreas: [...prefs.focusAreas, focusInput.trim()] }); setFocusInput(''); }}}>Add</button>
          </div>
          <div className="tag-container">
            {prefs.focusAreas.map((a) => (
              <span key={a} className="tag tag-accent">{a} <span className="tag-remove" onClick={() => setPrefs({ ...prefs, focusAreas: prefs.focusAreas.filter((x) => x !== a) })}>✕</span></span>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 32, padding: 32 }}>
          <h3 className="section-title">Excluded Categories</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 16 }}>Ideas in these spaces will be immediately killed in Phase 1.</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input className="input" style={{ flex: 1, padding: '12px 16px' }} value={excludeInput} onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && excludeInput.trim()) { setPrefs({ ...prefs, excludedCategories: [...prefs.excludedCategories, excludeInput.trim()] }); setExcludeInput(''); }}}
              placeholder="e.g. crypto, dating apps, social media..." />
            <button className="btn btn-secondary" style={{ padding: '0 24px' }} onClick={() => { if (excludeInput.trim()) { setPrefs({ ...prefs, excludedCategories: [...prefs.excludedCategories, excludeInput.trim()] }); setExcludeInput(''); }}}>Add</button>
          </div>
          <div className="tag-container">
            {prefs.excludedCategories.map((a) => (
              <span key={a} className="tag tag-rose">{a} <span className="tag-remove" onClick={() => setPrefs({ ...prefs, excludedCategories: prefs.excludedCategories.filter((x) => x !== a) })}>✕</span></span>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 40, padding: 32 }}>
          <h3 className="section-title">Pipeline Engine</h3>
          <div className="form-row" style={{ marginBottom: 24 }}>
            <div className="form-group">
              <label className="label">Score Threshold: <span style={{ color: 'var(--accent)' }}>{prefs.scoringThreshold}/100</span></label>
              <input type="range" className="slider" min={30} max={90} value={prefs.scoringThreshold} onChange={(e) => setPrefs({ ...prefs, scoringThreshold: Number(e.target.value) })} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>Ideas below this score won't generate an action plan.</div>
            </div>
            <div className="form-group">
              <label className="label">Max Iterations: <span style={{ color: 'var(--accent)' }}>{prefs.maxIterations}</span></label>
              <input type="range" className="slider" min={1} max={10} value={prefs.maxIterations} onChange={(e) => setPrefs({ ...prefs, maxIterations: Number(e.target.value) })} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="label">Search Depth</label>
            <select className="select" style={{ padding: '12px 16px' }} value={prefs.searchDepth} onChange={(e) => setPrefs({ ...prefs, searchDepth: e.target.value })}>
              <option value="advanced">Advanced (Slower, 2x tokens, Deep Reddit/X analysis)</option>
              <option value="basic">Basic (Faster, 1x tokens, Standard Web Search)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Custom AI Criteria (optional)</label>
            <textarea className="textarea" style={{ minHeight: 120, padding: 16 }} value={prefs.customCriteria || ''} onChange={(e) => setPrefs({ ...prefs, customCriteria: e.target.value })} placeholder="e.g. 'Must be B2B SaaS', 'Must not require hardware', 'Must be capable of $1M ARR with 0 employees'..." />
          </div>
        </div>

        <button className="btn btn-primary btn-lg" style={{ width: '100%', padding: '20px', fontSize: '1.2rem' }} onClick={save}>
          {saved ? '✅ Settings Saved Successfully!' : '💾 Save Global Settings'}
        </button>
      </div>
    </div>
  );
}
