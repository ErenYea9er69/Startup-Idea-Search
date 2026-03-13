'use client';

import { useEffect, useState } from 'react';

interface FounderProfile {
  skills: string[];
  budget: string;
  teamSize: number;
  timeCommitment: string;
  industries: string[];
  dealBreakers: string[];
}

const SKILL_OPTIONS = ['Frontend', 'Backend', 'Full-Stack', 'Mobile', 'DevOps', 'Data Science', 'Machine Learning', 'Marketing', 'Sales', 'Design', 'Product Management', 'Finance', 'Operations'];

export default function OnboardingPage() {
  const [profile, setProfile] = useState<FounderProfile>({
    skills: [],
    budget: 'bootstrap',
    teamSize: 1,
    timeCommitment: 'full-time',
    industries: [],
    dealBreakers: [],
  });
  const [industryInput, setIndustryInput] = useState('');
  const [breakerInput, setBreakerInput] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((p) => {
        if (!p || p.error || !p.id) return;
        
        let skills = [];
        let industries = [];
        let dealBreakers = [];
        try { skills = typeof p.skills === 'string' ? JSON.parse(p.skills) : (p.skills || []); } catch {}
        try { industries = typeof p.industries === 'string' ? JSON.parse(p.industries) : (p.industries || []); } catch {}
        try { dealBreakers = typeof p.dealBreakers === 'string' ? JSON.parse(p.dealBreakers) : (p.dealBreakers || []); } catch {}

        setProfile({
          skills,
          budget: p.budget || 'bootstrap',
          teamSize: p.teamSize || 1,
          timeCommitment: p.timeCommitment || 'full-time',
          industries,
          dealBreakers,
        });
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleSkill = (skill: string) => {
    setProfile((p) => ({
      ...p,
      skills: p.skills.includes(skill) ? p.skills.filter((s) => s !== skill) : [...p.skills, skill],
    }));
  };

  return (
    <div>
      <h1 className="page-title">Founder Profile</h1>
      <p className="page-subtitle">Help the AI match ideas to your skills, resources, and constraints</p>

      <div style={{ maxWidth: 700 }}>
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Your Skills</h3>
          <div className="tag-container">
            {SKILL_OPTIONS.map((skill) => (
              <button
                key={skill}
                className={`tag ${profile.skills.includes(skill) ? 'tag-accent' : ''}`}
                style={{ cursor: 'pointer', border: profile.skills.includes(skill) ? 'none' : '1px solid var(--border)' }}
                onClick={() => toggleSkill(skill)}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Budget</label>
              <select className="select" value={profile.budget} onChange={(e) => setProfile({ ...profile, budget: e.target.value })}>
                <option value="bootstrap">Bootstrap ($0 - $1K)</option>
                <option value="small">Small ($1K - $10K)</option>
                <option value="medium">Medium ($10K - $50K)</option>
                <option value="funded">Funded ($50K+)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Team Size</label>
              <select className="select" value={profile.teamSize} onChange={(e) => setProfile({ ...profile, teamSize: Number(e.target.value) })}>
                <option value={1}>Solo Founder</option>
                <option value={2}>2 People</option>
                <option value={3}>3-5 People</option>
                <option value={5}>5+ People</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Time Commitment</label>
            <select className="select" value={profile.timeCommitment} onChange={(e) => setProfile({ ...profile, timeCommitment: e.target.value })}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time (20h/week)</option>
              <option value="side-project">Side project (10h/week)</option>
              <option value="evenings">Evenings & weekends only</option>
            </select>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label className="label">Preferred Industries (optional)</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" value={industryInput} onChange={(e) => setIndustryInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && industryInput.trim()) { setProfile({ ...profile, industries: [...profile.industries, industryInput.trim()] }); setIndustryInput(''); }}} placeholder="e.g. healthcare..." />
              <button className="btn btn-secondary btn-sm" onClick={() => { if (industryInput.trim()) { setProfile({ ...profile, industries: [...profile.industries, industryInput.trim()] }); setIndustryInput(''); }}}>Add</button>
            </div>
            <div className="tag-container">
              {profile.industries.map((ind) => (
                <span key={ind} className="tag tag-accent">{ind} <span className="tag-remove" onClick={() => setProfile({ ...profile, industries: profile.industries.filter((x) => x !== ind) })}>✕</span></span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Deal Breakers (optional)</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" value={breakerInput} onChange={(e) => setBreakerInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && breakerInput.trim()) { setProfile({ ...profile, dealBreakers: [...profile.dealBreakers, breakerInput.trim()] }); setBreakerInput(''); }}} placeholder="e.g. heavy regulation..." />
              <button className="btn btn-secondary btn-sm" onClick={() => { if (breakerInput.trim()) { setProfile({ ...profile, dealBreakers: [...profile.dealBreakers, breakerInput.trim()] }); setBreakerInput(''); }}}>Add</button>
            </div>
            <div className="tag-container">
              {profile.dealBreakers.map((db) => (
                <span key={db} className="tag tag-rose">{db} <span className="tag-remove" onClick={() => setProfile({ ...profile, dealBreakers: profile.dealBreakers.filter((x) => x !== db) })}>✕</span></span>
              ))}
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={save}>
          {saved ? '✅ Saved!' : '💾 Save Profile'}
        </button>
      </div>
    </div>
  );
}
