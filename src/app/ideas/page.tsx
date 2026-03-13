'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Idea {
  id: string;
  name: string;
  industry: string;
  problem: string;
  overallScore: number | null;
  status: string;
  category: string | null;
  businessType: string | null;
  createdAt: string;
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'promising', label: '✅ Promising' },
  { key: 'rejected', label: '❌ Rejected' },
  { key: 'bookmarked', label: '⭐ Bookmarked' },
  { key: 'trap', label: '⚠️ Traps' },
];

const CATEGORY_TABS = [
  { key: '', label: 'All Categories' },
  { key: 'winnability', label: '🏆 Winnability' },
  { key: 'boring-strong', label: '💰 Cash-Flow' },
  { key: 'venture-backable', label: '🚀 Venture' },
  { key: 'solo-founder', label: '👤 Solo Founder' },
  { key: 'ai-defensible', label: '🤖 AI Defensible' },
];

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadIdeas();
  }, [statusFilter, categoryFilter, search]);

  const loadIdeas = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (search) params.set('search', search);
    params.set('sortBy', 'overallScore');
    params.set('order', 'desc');

    try {
      const res = await fetch(`/api/ideas?${params}`);
      if (res.ok) setIdeas(await res.json());
    } catch {}
    setLoading(false);
  };

  const toggleBookmark = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'bookmarked' ? 'promising' : 'bookmarked';
    await fetch(`/api/ideas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    loadIdeas();
  };

  return (
    <div>
      <h1 className="page-title">Ideas Library</h1>
      <p className="page-subtitle" style={{ marginBottom: 32 }}>All discovered and validated startup ideas</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div className="tabs" style={{ margin: 0 }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab ${statusFilter === tab.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tabs" style={{ margin: 0 }}>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab ${categoryFilter === tab.key ? 'active' : ''}`}
              onClick={() => setCategoryFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 40, maxWidth: 480 }}>
        <input
          className="input"
          style={{ fontSize: '1.05rem', padding: '16px 20px', borderRadius: 'var(--radius-xl)' }}
          placeholder="🔍 Search ideas by keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="ideas-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card"><div className="skeleton" style={{ height: 200 }} /></div>
          ))}
        </div>
      ) : ideas.length > 0 ? (
        <div className="ideas-grid">
          {ideas.map((idea) => (
            <div 
               key={idea.id} 
               className="card idea-card" 
               style={{ padding: 28 }}
               onClick={() => window.location.href = `/ideas/${idea.id}`}
            >
              <div className="idea-header">
                <div className="idea-name">{idea.name}</div>
                <div className={`score-badge ${getScoreClass(idea.overallScore)}`}>
                  {idea.overallScore || '?'}
                </div>
              </div>
              
              <div className="idea-problem" style={{ marginBottom: 24 }}>{idea.problem}</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div className="idea-meta">
                  <span className="tag tag-accent">{idea.industry}</span>
                  {idea.category && <span className="tag tag-violet">{idea.category}</span>}
                  {idea.status === 'trap' && <span className="tag tag-rose">TRAP</span>}
                  {idea.status === 'bookmarked' && <span className="tag tag-amber">⭐</span>}
                </div>
                {idea.status !== 'trap' && (
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ borderRadius: '50%', width: 40, height: 40, padding: 0, fontSize: '1.2rem' }}
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(idea.id, idea.status); }}
                  >
                    {idea.status === 'bookmarked' ? '★' : '☆'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '80px 20px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>💡</div>
          <h3 className="section-title" style={{ marginBottom: 8 }}>No ideas found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            {statusFilter || categoryFilter || search
              ? 'Hmm, try changing your filters or searching for something else.'
              : 'You haven\'t discovered any ideas yet. Time to run a pipeline!'}
          </p>
          {!statusFilter && !categoryFilter && !search && (
            <Link href="/pipeline" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary">Start Pipeline</button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function getScoreClass(score: number | null): string {
  if (!score) return 'score-low';
  if (score >= 70) return 'score-high';
  if (score >= 45) return 'score-medium';
  return 'score-low';
}
