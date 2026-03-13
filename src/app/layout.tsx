import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Startup Validator Engine",
  description: "AI-powered startup idea research and brutal validation pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
     <html lang="en">
      <body>
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-logo">⚡ StartupEngine</div>
            <div className="sidebar-subtitle">AI Idea Validator</div>
            <nav className="sidebar-nav">
              <Link href="/" className="nav-link">
                <span className="nav-icon">📊</span>
                <span>Dashboard</span>
              </Link>
              <Link href="/pipeline" className="nav-link">
                <span className="nav-icon">🚀</span>
                <span>Pipeline</span>
              </Link>
              <Link href="/ideas" className="nav-link">
                <span className="nav-icon">💡</span>
                <span>Ideas</span>
              </Link>
              <Link href="/onboarding" className="nav-link">
                <span className="nav-icon">👤</span>
                <span>Profile</span>
              </Link>
              <Link href="/settings" className="nav-link">
                <span className="nav-icon">⚙️</span>
                <span>Settings</span>
              </Link>
            </nav>
          </aside>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
