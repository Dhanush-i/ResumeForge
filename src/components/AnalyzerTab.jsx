import React, { useState, useRef } from 'react';
import mammoth from 'mammoth';
import { callGemini, parseGeminiJSON } from '../utils/gemini';
import {
  Zap, AlertCircle, CheckCircle2, Tag, MessageSquare,
  FileSearch, Award, Upload, FileText, X
} from 'lucide-react';

// ─── Prompts ──────────────────────────────────────────────────────────────────
const ANALYZER_PROMPT = (resumeText, jobDesc) => `You are an expert ATS resume analyzer specializing in engineering roles.

Analyze the resume against the job description and return a JSON object with this EXACT structure. Be specific and actionable.

Return ONLY valid JSON:

{
  "atsScore": <integer 0-100>,
  "verdict": "<one punchy sentence>",
  "missingKeywords": ["kw1", "kw2"],
  "presentKeywords": ["kw1", "kw2"],
  "bulletFeedback": [
    { "section": "Projects", "feedback": "..." },
    { "section": "Skills", "feedback": "..." },
    { "section": "Summary", "feedback": "..." },
    { "section": "Overall", "feedback": "..." }
  ],
  "strengths": ["str1", "str2", "str3"],
  "improvements": ["imp1", "imp2", "imp3"]
}

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDesc}`;

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 48, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#00ba7c' : score >= 50 ? '#ffd400' : '#f4212e';
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Fair' : 'Weak';
  return (
    <div className="score-ring-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
      </svg>
      <div className="score-overlay">
        <span style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, letterSpacing: -1 }}>{score}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );
}

// ─── File extraction helpers ───────────────────────────────────────────────────
async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt') {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result);
      reader.onerror = rej;
      reader.readAsText(file);
    });
  }

  if (ext === 'pdf') {
    if (!window.pdfjsLib) throw new Error('PDF.js not loaded. Please refresh and try again.');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
  }

  if (ext === 'docx' || ext === 'doc') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── File Upload Zone ─────────────────────────────────────────────────────────
function FileZone({ onTextExtracted, label }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = async (f) => {
    setError('');
    setLoading(true);
    setFile(f);
    try {
      const text = await extractText(f);
      onTextExtracted(text);
    } catch (e) {
      setError(e.message || 'Failed to extract text from file.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setError('');
    onTextExtracted('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
      />
      {file ? (
        <div className="file-badge">
          <span className="file-badge-icon">📄</span>
          <span className="file-badge-name">{file.name}</span>
          <span className="file-badge-size">{formatBytes(file.size)}</span>
          <button className="btn-icon" onClick={clearFile}><X size={13} /></button>
        </div>
      ) : (
        <div
          className={`file-dropzone ${dragging ? 'drag-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <><div className="spinner" style={{ width: 28, height: 28 }} /><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Extracting text…</div></>
          ) : (
            <>
              <div className="file-dropzone-icon"><Upload size={28} strokeWidth={1.5} color="var(--text-muted)" /></div>
              <div className="file-dropzone-text">Drop file here or click to browse</div>
              <div className="file-dropzone-hint">Supports PDF, DOCX, DOC, TXT</div>
            </>
          )}
        </div>
      )}
      {error && <div className="error-banner" style={{ marginTop: 6, fontSize: 12 }}><AlertCircle size={13} />{error}</div>}
    </div>
  );
}

// ─── Input Panel (Paste / Upload tabs) ───────────────────────────────────────
function InputPanel({ title, icon: Icon, value, onChange, placeholder }) {
  const [mode, setMode] = useState('paste'); // 'paste' | 'upload'

  return (
    <div className="analyzer-input-card">
      <div className="analyzer-input-title"><Icon size={14} />{title}</div>

      <div className="input-tab-row">
        <button className={`input-tab ${mode === 'paste' ? 'active' : ''}`} onClick={() => setMode('paste')}>
          <FileText size={12} /> Paste Text
        </button>
        <button className={`input-tab ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>
          <Upload size={12} /> Upload File
        </button>
      </div>

      {mode === 'paste' ? (
        <textarea
          className="analyzer-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <FileZone onTextExtracted={onChange} label={title} />
      )}

      {value.trim() && mode === 'paste' && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {value.trim().split(/\s+/).length} words extracted
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalyzerTab() {
  const [resumeText, setResumeText] = useState('');
  const [jobDesc, setJobDesc]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [results, setResults]       = useState(null);
  const [error, setError]           = useState('');

  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jobDesc.trim()) { setError('Both resume and job description are required.'); return; }
    setError(''); setLoading(true); setResults(null);
    try {
      const raw = await callGemini(ANALYZER_PROMPT(resumeText, jobDesc), null, 3000, 0.3);
      setResults(parseGeminiJSON(raw));
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const score = results?.atsScore ?? 0;
  const scoreColor = score >= 75 ? '#00ba7c' : score >= 50 ? '#ffd400' : '#f4212e';

  return (
    <div className="analyzer-panel">
      {/* Inputs */}
      <div className="analyzer-inputs">
        <InputPanel
          title="Your Resume"
          icon={FileSearch}
          value={resumeText}
          onChange={setResumeText}
          placeholder="Paste your full resume text here, or switch to 'Upload File' to upload a PDF / DOCX…"
        />
        <InputPanel
          title="Job Description"
          icon={Tag}
          value={jobDesc}
          onChange={setJobDesc}
          placeholder="Paste the job posting here (requirements, responsibilities, skills)…"
        />
      </div>

      {/* Error + Analyze button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        {error && (
          <div className="error-banner" style={{ width: '100%' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}
        <button
          className="btn-primary"
          onClick={handleAnalyze}
          disabled={loading || !resumeText.trim() || !jobDesc.trim()}
          style={{ minWidth: 200, justifyContent: 'center' }}
        >
          <Zap size={15} />
          {loading ? 'Analyzing…' : 'Analyze Resume ⚡'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="ai-loading" style={{ height: 180 }}>
          <div className="spinner" />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>Analyzing your resume…</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Comparing against job description</div>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Verdict */}
          <div className="verdict-banner" style={{
            background: score >= 75 ? 'rgba(0,186,124,0.08)' : score >= 50 ? 'rgba(255,212,0,0.08)' : 'rgba(244,33,46,0.08)',
            border: `1px solid ${score >= 75 ? 'rgba(0,186,124,0.25)' : score >= 50 ? 'rgba(255,212,0,0.25)' : 'rgba(244,33,46,0.25)'}`,
          }}>
            <Award size={18} style={{ color: scoreColor, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: scoreColor, marginBottom: 3 }}>
                One-Line Verdict
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{results.verdict}</div>
            </div>
          </div>

          <div className="results-grid">
            {/* ATS Score */}
            <div className="result-card">
              <div className="result-card-title"><Zap size={12} />ATS Match Score</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}><ScoreRing score={results.atsScore} /></div>
            </div>

            {/* Missing keywords */}
            <div className="result-card">
              <div className="result-card-title"><AlertCircle size={12} />Missing Keywords ({results.missingKeywords?.length || 0})</div>
              {results.missingKeywords?.length ? (
                results.missingKeywords.map((kw, i) => <span key={i} className="keyword-tag missing">{kw}</span>)
              ) : (
                <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ No major keywords missing!</span>
              )}
            </div>

            {/* Present keywords */}
            <div className="result-card">
              <div className="result-card-title"><CheckCircle2 size={12} />Matched Keywords ({results.presentKeywords?.length || 0})</div>
              {results.presentKeywords?.map((kw, i) => <span key={i} className="keyword-tag present">{kw}</span>)}
            </div>

            {/* Bullet feedback */}
            <div className="result-card" style={{ gridColumn: 'span 2' }}>
              <div className="result-card-title"><MessageSquare size={12} />Section Feedback</div>
              {results.bulletFeedback?.map((fb, i) => (
                <div key={i} className="feedback-item">
                  <div className="feedback-section-name">{fb.section}</div>
                  <div className="feedback-text">{fb.feedback}</div>
                </div>
              ))}
            </div>

            {/* Strengths */}
            {results.strengths?.length > 0 && (
              <div className="result-card">
                <div className="result-card-title" style={{ color: 'var(--success)' }}>
                  <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />Strengths
                </div>
                {results.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', paddingLeft: 16, position: 'relative', marginBottom: 6, lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--success)' }}>✓</span>{s}
                  </div>
                ))}
              </div>
            )}

            {/* Improvements */}
            {results.improvements?.length > 0 && (
              <div className="result-card">
                <div className="result-card-title" style={{ color: 'var(--warning)' }}>
                  <Zap size={12} style={{ color: 'var(--warning)' }} />Quick Wins
                </div>
                {results.improvements.map((imp, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', paddingLeft: 16, position: 'relative', marginBottom: 6, lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--warning)' }}>→</span>{imp}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Resume Analyzer</div>
          <div className="empty-state-sub">
            Upload or paste your resume and the job description above, then click "Analyze Resume" to get your ATS score.
          </div>
        </div>
      )}
    </div>
  );
}
