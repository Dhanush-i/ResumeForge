import React, { useState } from 'react';
import BuilderTab from './components/BuilderTab';
import AIBuilderTab from './components/AIBuilderTab';
import AnalyzerTab from './components/AnalyzerTab';
import { ResumeStyleProvider, useResumeStyle, RESUME_FONTS, RESUME_SIZES } from './context/ResumeStyleContext';
import { FileEdit, Sparkles, BarChart3, ChevronDown, ChevronUp, Type } from 'lucide-react';

// ─── Font / Size Picker Panel ─────────────────────────────────────────────────
function StylePanel() {
  const { fontId, setFontId, sizePt, setSizePt } = useResumeStyle();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="style-panel">
      <div className="style-panel-header" onClick={() => setExpanded(x => !x)}>
        <span className="style-panel-title">
          <Type size={12} />
          Resume Style
        </span>
        {expanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div className="style-panel-body">
          {/* Font grid */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
              Font
            </div>
            <div className="font-grid">
              {RESUME_FONTS.map(f => (
                <button
                  key={f.id}
                  className={`font-btn ${fontId === f.id ? 'active' : ''}`}
                  onClick={() => setFontId(f.id)}
                  title={f.label}
                >
                  <span className="font-btn-preview" style={{ fontFamily: f.family }}>{f.preview}</span>
                  <span className="font-btn-name">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Size row */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
              Text Size (pt)
            </div>
            <div className="size-row">
              {RESUME_SIZES.map(pt => (
                <button
                  key={pt}
                  className={`size-btn ${sizePt === pt ? 'active' : ''}`}
                  onClick={() => setSizePt(pt)}
                  title={`${pt}pt`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tabs config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'builder', label: 'Build It Myself', icon: FileEdit, badge: null },
  { id: 'ai', label: 'Build For Me', icon: Sparkles, badge: 'AI' },
  { id: 'analyzer', label: 'Analyzer', icon: BarChart3, badge: null },
];

const TAB_META = {
  builder: { title: 'Resume Builder', sub: 'Form-based builder with live preview' },
  ai: { title: 'AI Resume Builder', sub: 'Paste anything — Gemini crafts your resume' },
  analyzer: { title: 'Resume Analyzer', sub: 'ATS score, keywords & feedback vs. a job description' },
};

// ─── Inner App (needs context) ────────────────────────────────────────────────
function InnerApp() {
  const [activeTab, setActiveTab] = useState('builder');

  const meta = TAB_META[activeTab];

  return (
    <div className="app-shell">
      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon-wrap">⚡</div>
            <div className="logo-text-wrap">
              <span className="logo-name">ResumeForge</span>
              <span className="logo-tagline">For Engineers</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Tools</div>
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                id={`tab-${tab.id}`}
              >
                <Icon size={22} className="nav-icon" />
                <span style={{ flex: 1 }}>{tab.label}</span>
                {tab.badge && <span className="nav-badge">{tab.badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Resume Style */}
        <StylePanel />

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="api-key-section">
            <div className="api-key-label" style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
              ✨ AI features powered by Gemini
            </div>
            <div className="api-status">
              <div className="status-dot on" />
              <span>Ready to use — no setup needed</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="main-content">
        {/* Top bar */}
        <div className="content-header">
          <div>
            <div className="content-title">{meta.title}</div>
            <div className="content-subtitle">{meta.sub}</div>
          </div>
        </div>

        {/* Tab content */}
        <div className="content-body">
          {activeTab === 'builder' && <BuilderTab />}
          {activeTab === 'ai' && <AIBuilderTab />}
          {activeTab === 'analyzer' && <AnalyzerTab />}
        </div>
      </main>
    </div>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ResumeStyleProvider>
      <InnerApp />
    </ResumeStyleProvider>
  );
}
