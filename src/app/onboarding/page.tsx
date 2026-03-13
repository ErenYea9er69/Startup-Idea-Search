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
      <p className="page-subtitle" style={{ marginBottom: 40 }}>Help the AI match ideas to your unique unfair advantages and constraints.</p>

      <div style={{ maxWidth: 800 }}>
        <div className="card" style={{ marginBottom: 32, padding: 32 }}>
          <h3 className="section-title">Your Technical & Growth Skills</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 20 }}>Select all that apply. Ideas requiring deep expertise in areas you lack will be penalized in Winnability.</p>
          <div className="tag-container" style={{ gap: 12 }}>
            {SKILL_OPTIONS.map((skill) => (
              <button
                key={skill}
                className={`tag ${profile.skills.includes(skill) ? 'tag-accent' : ''}`}
                style={{ 
                  cursor: 'pointer', 
                  border: profile.skills.includes(skill) ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: profile.skills.includes(skill) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  padding: '8px 16px',
                  fontSize: '0.95rem',
                  color: profile.skills.includes(skill) ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
                onClick={() => toggleSkill(skill)}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 32, padding: 32 }}>
          <h3 className="section-title">Resources</h3>
          <div className="form-row" style={{ marginBottom: 24 }}>
            <div className="form-group">
              <label className="label">Initial Budget Validation</label>
              <select className="select" style={{ padding: '12px 16px' }} value={profile.budget} onChange={(e) => setProfile({ ...profile, budget: e.target.value })}>
                <option value="bootstrap">Hardcore Bootstrap ($0 - $1K)</option>
                <option value="small">Self-Funded ($1K - $10K)</option>
                <option value="medium">Angel/Pre-Seed ($10K - $100K)</option>
                <option value="funded">Venture Backed ($100K+)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Founding Team Size</label>
              <select className="select" style={{ padding: '12px 16px' }} value={profile.teamSize} onChange={(e) => setProfile({ ...profile, teamSize: Number(e.target.value) })}>
                <option value={1}>Solo Founder (One-Person Army)</option>
                <option value={2}>Dynamic Duo (2 People)</option>
                <option value={3}>Small Strike Team (3-5 People)</option>
                <option value={5}>Venture Studio / Studio (5+ People)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Time Commitment</label>
            <select className="select" style={{ padding: '12px 16px' }} value={profile.timeCommitment} onChange={(e) => setProfile({ ...profile, timeCommitment: e.target.value })}>
              <option value="full-time">Full-time (All in, burn the boats)</option>
              <option value="part-time">Part-time (~20h/week)</option>
              <option value="side-project">Nights & Weekends (~10h/week)</option>
            </select>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 40, padding: 32 }}>
          <h3 className="section-title">Industry Preferences</h3>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="label">Industries you have an unfair advantage in (optional)</label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input className="input" style={{ flex: 1, padding: '12px 16px' }} value={industryInput} onChange={(e) => setIndustryInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && industryInput.trim()) { setProfile({ ...profile, industries: [...profile.industries, industryInput.trim()] }); setIndustryInput(''); }}} placeholder="e.g. healthcare, B2B SaaS, e-commerce..." />
              <button className="btn btn-secondary" style={{ padding: '0 24px' }} onClick={() => { if (industryInput.trim()) { setProfile({ ...profile, industries: [...profile.industries, industryInput.trim()] }); setIndustryInput(''); }}}>Add</button>
            </div>
            <div className="tag-container">
              {profile.industries.map((ind) => (
                <span key={ind} className="tag tag-accent">{ind} <span className="tag-remove" onClick={() => setProfile({ ...profile, industries: profile.industries.filter((x) => x !== ind) })}>✕</span></span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Ultimate Deal Breakers (optional)</label>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 12 }}>What will make you instantly hate the business? (e.g. Needs sales team, physical inventory, regulated markets)</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input className="input" style={{ flex: 1, padding: '12px 16px' }} value={breakerInput} onChange={(e) => setBreakerInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && breakerInput.trim()) { setProfile({ ...profile, dealBreakers: [...profile.dealBreakers, breakerInput.trim()] }); setBreakerInput(''); }}} placeholder="e.g. heavy compliance, low margin..." />
              <button className="btn btn-secondary" style={{ padding: '0 24px' }} onClick={() => { if (breakerInput.trim()) { setProfile({ ...profile, dealBreakers: [...profile.dealBreakers, breakerInput.trim()] }); setBreakerInput(''); }}}>Add</button>
            </div>
            <div className="tag-container">
              {profile.dealBreakers.map((db) => (
                <span key={db} className="tag tag-rose">{db} <span className="tag-remove" onClick={() => setProfile({ ...profile, dealBreakers: profile.dealBreakers.filter((x) => x !== db) })}>✕</span></span>
              ))}
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-lg" style={{ width: '100%', padding: '20px', fontSize: '1.2rem' }} onClick={save}>
          {saved ? '✅ Profile Saved Successfully!' : '💾 Save Founder Profile'}
        </button>
      </div>
    </div>
  );
}
