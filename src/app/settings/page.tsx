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
      .then((p) => { if (p) setPrefs(p); })
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
      <p className="page-subtitle">Configure your default pipeline settings</p>

      <div style={{ maxWidth: 700 }}>
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Default Focus Areas</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="input" value={focusInput} onChange={(e) => setFocusInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && focusInput.trim()) { setPrefs({ ...prefs, focusAreas: [...prefs.focusAreas, focusInput.trim()] }); setFocusInput(''); }}}
              placeholder="e.g. developer tools..." />
            <button className="btn btn-secondary btn-sm" onClick={() => { if (focusInput.trim()) { setPrefs({ ...prefs, focusAreas: [...prefs.focusAreas, focusInput.trim()] }); setFocusInput(''); }}}>Add</button>
          </div>
          <div className="tag-container">
            {prefs.focusAreas.map((a) => (
              <span key={a} className="tag tag-accent">{a} <span className="tag-remove" onClick={() => setPrefs({ ...prefs, focusAreas: prefs.focusAreas.filter((x) => x !== a) })}>✕</span></span>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Excluded Categories</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="input" value={excludeInput} onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && excludeInput.trim()) { setPrefs({ ...prefs, excludedCategories: [...prefs.excludedCategories, excludeInput.trim()] }); setExcludeInput(''); }}}
              placeholder="e.g. crypto, social media..." />
            <button className="btn btn-secondary btn-sm" onClick={() => { if (excludeInput.trim()) { setPrefs({ ...prefs, excludedCategories: [...prefs.excludedCategories, excludeInput.trim()] }); setExcludeInput(''); }}}>Add</button>
          </div>
          <div className="tag-container">
            {prefs.excludedCategories.map((a) => (
              <span key={a} className="tag tag-rose">{a} <span className="tag-remove" onClick={() => setPrefs({ ...prefs, excludedCategories: prefs.excludedCategories.filter((x) => x !== a) })}>✕</span></span>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Score Threshold: {prefs.scoringThreshold}/100</label>
              <input type="range" className="slider" min={30} max={90} value={prefs.scoringThreshold} onChange={(e) => setPrefs({ ...prefs, scoringThreshold: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="label">Max Iterations: {prefs.maxIterations}</label>
              <input type="range" className="slider" min={1} max={10} value={prefs.maxIterations} onChange={(e) => setPrefs({ ...prefs, maxIterations: Number(e.target.value) })} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Search Depth</label>
            <select className="select" value={prefs.searchDepth} onChange={(e) => setPrefs({ ...prefs, searchDepth: e.target.value })}>
              <option value="advanced">Advanced (slower, better results, 2 credits)</option>
              <option value="basic">Basic (faster, 1 credit)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Custom Criteria (optional)</label>
            <textarea className="textarea" value={prefs.customCriteria || ''} onChange={(e) => setPrefs({ ...prefs, customCriteria: e.target.value })} placeholder="Additional criteria the AI should always consider..." />
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={save}>
          {saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}
