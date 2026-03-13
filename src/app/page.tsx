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
  createdAt: string;
}

interface PipelineRun {
  id: string;
  status: string;
  totalIterations: number;
  tokensUsed: number;
  tavilyCredits: number;
  createdAt: string;
  _count: { ideas: number; iterations: number };
}

export default function Dashboard() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ideasRes, runsRes] = await Promise.all([
          fetch('/api/ideas?status=promising&sortBy=overallScore&order=desc'),
          fetch('/api/pipeline'),
        ]);
        if (ideasRes.ok) setIdeas(await ideasRes.json());
        if (runsRes.ok) setRuns(await runsRes.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const promisingCount = ideas.length;
  const totalRuns = runs.length;
  const activeRun = runs.find((r) => r.status === 'running');
  const totalTokens = runs.reduce((sum, r) => sum + r.tokensUsed, 0);

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Dashboard</h1>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card stat-card"><div className="skeleton" style={{ height: 60 }} /></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">AI-powered startup idea research and brutal validation</p>

      <div className="stats-grid">
        <div className="card stat-card" style={{ borderTop: '2px solid var(--accent)' }}>
          <div className="stat-value">{totalRuns}</div>
          <div className="stat-label">Pipeline Runs</div>
        </div>
        <div className="card stat-card" style={{ borderTop: '2px solid var(--emerald)' }}>
          <div className="stat-value">{promisingCount}</div>
          <div className="stat-label">Promising Ideas</div>
        </div>
        <div className="card stat-card" style={{ borderTop: '2px solid var(--cyan)' }}>
          <div className="stat-value" style={{ fontSize: '2rem' }}>
            {activeRun ? '🔄 Running' : '⏸ Idle'}
          </div>
          <div className="stat-label">Pipeline Status</div>
        </div>
        <div className="card stat-card" style={{ borderTop: '2px solid var(--violet)' }}>
          <div className="stat-value">{(totalTokens / 1000).toFixed(0)}K</div>
          <div className="stat-label">Tokens Used</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
        <Link href="/pipeline" style={{ textDecoration: 'none' }}>
          <button className="btn btn-primary btn-lg">
            <span style={{ fontSize: '1.2rem' }}>🚀</span> Start New Pipeline
          </button>
        </Link>
        <Link href="/ideas" style={{ textDecoration: 'none' }}>
          <button className="btn btn-secondary btn-lg">
            <span style={{ fontSize: '1.2rem' }}>💡</span> Browse Ideas
          </button>
        </Link>
      </div>

      {ideas.length > 0 && (
        <>
          <h2 className="section-title">Top Promising Ideas</h2>
          <div className="ideas-grid">
            {ideas.slice(0, 6).map((idea) => (
              <Link key={idea.id} href={`/ideas/${idea.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card idea-card" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
                  <div className="idea-header">
                    <div className="idea-name">{idea.name}</div>
                    <div className={`score-badge ${getScoreClass(idea.overallScore)}`}>
                      {idea.overallScore || '?'}
                    </div>
                  </div>
                  <div className="idea-problem">{idea.problem}</div>
                  <div className="idea-meta">
                    <span className="tag tag-accent">{idea.industry}</span>
                    {idea.category && <span className="tag tag-violet">{idea.category}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {ideas.length === 0 && !activeRun && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>🔍</div>
          <h3 className="section-title" style={{ marginBottom: 8 }}>No ideas yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Launch a pipeline to start discovering startup opportunities</p>
          <Link href="/pipeline" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary">Start Your First Pipeline</button>
          </Link>
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
