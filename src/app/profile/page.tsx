'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    skills: [] as string[],
    budget: 'bootstrap',
    timeCommitment: 'full-time',
    availableHours: 40,
    industries: [] as string[],
  });
  const [skillInput, setSkillInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setProfile({
            ...data,
            skills: typeof data.skills === 'string' ? JSON.parse(data.skills) : (data.skills || []),
            industries: typeof data.industries === 'string' ? JSON.parse(data.industries) : (data.industries || []),
          });
        }
      });
  }, []);

  const saveProfile = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully! DNA updated. 🧬' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save profile. Check server logs.' });
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 className="page-title">Founder DNA</h1>
        <p className="page-subtitle">Define your profile so the AI finds ideas you are uniquely qualified to build.</p>
      </header>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div className="form-group">
          <label className="label">Full Name</label>
          <input 
            className="input" 
            value={profile.name} 
            onChange={e => setProfile({...profile, name: e.target.value})}
            placeholder="How should the AI address you?"
          />
        </div>

        <div className="form-group">
          <label className="label">Founder Bio & Context</label>
          <textarea 
            className="textarea" 
            value={profile.bio} 
            onChange={e => setProfile({...profile, bio: e.target.value})}
            placeholder="Tell the AI about your background, wins, and what drives you. This deeply influences 'Founder-Idea Fit' scoring."
          />
        </div>

        <div className="form-group">
          <label className="label">Superpowers (Skills)</label>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <input 
              className="input" 
              value={skillInput} 
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
              placeholder="e.g. React, Python, Sales, Design..."
            />
            <button className="btn btn-secondary" onClick={addSkill}>Add</button>
          </div>
          <div className="tag-container">
            {profile.skills.map(s => (
              <span key={s} className="tag tag-accent">
                {s} <span className="tag-remove" onClick={() => setProfile({...profile, skills: profile.skills.filter(x => x !== s)})}>✕</span>
              </span>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Primary Budget Path</label>
            <select 
              className="select" 
              value={profile.budget} 
              onChange={e => setProfile({...profile, budget: e.target.value})}
            >
              <option value="bootstrap">Bootstrap ($0 - $5k)</option>
              <option value="lean">Lean Startup ($5k - $50k)</option>
              <option value="venture">Venture Track ($100k+)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Time Commitment</label>
            <select 
               className="select" 
               value={profile.timeCommitment} 
               onChange={e => setProfile({...profile, timeCommitment: e.target.value})}
            >
              <option value="side-hustle">Side Hustle (Nights/Weekends)</option>
              <option value="part-time">Part Time (20h/week)</option>
              <option value="full-time">Full Time (40h+ /week)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Availability: <span style={{ color: 'var(--accent)' }}>{profile.availableHours}h / week</span></label>
          <input 
            type="range" 
            className="slider" 
            min={5} 
            max={100} 
            step={5}
            value={profile.availableHours} 
            onChange={e => setProfile({...profile, availableHours: parseInt(e.target.value)})}
          />
        </div>

        {message && (
          <div className={`tag ${message.type === 'success' ? 'tag-emerald' : 'tag-rose'}`} style={{ padding: '12px', display: 'block', textAlign: 'center' }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '16px' }}
            onClick={saveProfile}
            disabled={isSaving}
          >
            {isSaving ? '🧬 Syncing DNA...' : '💾 Save Founder DNA'}
          </button>
          <button className="btn btn-secondary" onClick={() => router.push('/pipeline')}>
            Back to Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}
