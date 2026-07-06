import React, { useState, useRef } from 'react';
import mammoth from 'mammoth';
import { callGemini, parseGeminiJSON } from '../utils/gemini';
import ResumePreview from './ResumePreview';
import ResumeEditDrawer from './ResumeEditDrawer';
import { DEFAULT_RESUME, generateId } from '../constants';
import {
  Wand2, AlertCircle, FileSearch, Upload, FileText, X,
  Download, Edit3, CheckCircle2, ArrowRight
} from 'lucide-react';

// ─── Prompts ──────────────────────────────────────────────────────────────────
const TAILOR_PROMPT = (resumeText, jobDesc) => `You are an expert ATS resume optimizer specializing in engineering roles.

Your task: Rewrite the given resume to be perfectly tailored to the job description below.
Rules:
- Keep all facts truthful — do NOT invent experience or skills the candidate doesn't have
- Rewrite bullet points to incorporate JD keywords naturally
- Prioritize the most relevant skills and experiences for this specific role
- Use strong action verbs and quantify impact where possible
- Add any GENUINE matching skills from the JD that appear in the resume but aren't highlighted
- Return ONLY valid JSON, no markdown fences, no explanation

Return this EXACT JSON structure:

{
  "personalInfo": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "" },
  "summary": "2-3 sentence tailored summary targeting this specific role",
  "education": [{ "id": "edu-1", "school": "", "degree": "", "field": "", "startDate": "", "endDate": "", "gpa": "", "location": "" }],
  "projects": [{ "id": "proj-1", "title": "", "techStack": "", "githubLink": "", "bullets": ["", "", ""] }],
  "skills": [
    { "id": "skill-1", "category": "Languages", "items": "" },
    { "id": "skill-2", "category": "Frameworks", "items": "" },
    { "id": "skill-3", "category": "Tools", "items": "" },
    { "id": "skill-4", "category": "Databases", "items": "" }
  ],
  "achievements": [""],
  "certifications": [""],
  "tailorMeta": {
    "beforeScore": <integer 0-100, estimated ATS score of original resume>,
    "afterScore": <integer 0-100, estimated ATS score of tailored resume>,
    "keywordsAdded": ["keyword1", "keyword2"],
    "sectionsChanged": ["Summary", "Projects", "Skills"],
    "changesSummary": ["Changed X to Y", "Added Z keyword to bullet 2", "Rewrote summary to target role"]
  }
}

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDesc}`;

// ─── File extraction helpers ──────────────────────────────────────────────────
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
function FileZone({ onTextExtracted }) {
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
      setError(e.message || 'Failed to extract text.');
      setFile(null);
    } finally {
      setLoading(false);
    }
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
      <input ref={inputRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
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
          style={{ height: 120 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          {loading ? (
            <><div className="spinner" style={{ width: 24, height: 24 }} /><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Extracting text…</div></>
          ) : (
            <>
              <Upload size={22} strokeWidth={1.5} color="var(--text-muted)" />
              <div className="file-dropzone-text">Drop or click to browse</div>
              <div className="file-dropzone-hint">PDF, DOCX, DOC, TXT</div>
            </>
          )}
        </div>
      )}
      {error && <div className="error-banner" style={{ marginTop: 6, fontSize: 12 }}><AlertCircle size={13} />{error}</div>}
    </div>
  );
}

// ─── Input Panel (Paste / Upload) ─────────────────────────────────────────────
function InputPanel({ title, icon: Icon, value, onChange, placeholder, uploadOnly = false }) {
  const [mode, setMode] = useState('paste');
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
          spellCheck
        />
      ) : (
        <FileZone onTextExtracted={onChange} />
      )}
      {value.trim() && mode === 'paste' && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {value.trim().split(/\s+/).length} words
        </div>
      )}
    </div>
  );
}

// ─── Score Card ───────────────────────────────────────────────────────────────
function ScoreDisplay({ before, after }) {
  const beforeColor = before >= 75 ? '#00ba7c' : before >= 50 ? '#ffd400' : '#f4212e';
  const afterColor  = after  >= 75 ? '#00ba7c' : after  >= 50 ? '#ffd400' : '#f4212e';
  const gain = after - before;

  return (
    <div className="tailor-score-bar">
      <div className="tailor-score-card">
        <span className="tailor-score-label">Original ATS Score</span>
        <span className="tailor-score-val" style={{ color: beforeColor }}>{before}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/100</span>
      </div>
      <div className="tailor-score-arrow">→</div>
      <div className="tailor-score-card" style={{ borderColor: 'rgba(0,212,170,0.35)', background: 'rgba(0,212,170,0.04)' }}>
        <span className="tailor-score-label">Tailored ATS Score</span>
        <span className="tailor-score-val" style={{ color: afterColor }}>{after}</span>
        <span style={{ fontSize: 11, color: gain > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {gain > 0 ? `+${gain} pts ↑` : gain < 0 ? `${gain} pts` : 'No change'}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TailorTab() {
  const [resumeText, setResumeText] = useState('');
  const [jobDesc, setJobDesc]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null); // { resume, meta }
  const [error, setError]           = useState('');
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [exporting, setExporting]   = useState(false);

  const previewScale = 0.72;

  const handleTailor = async () => {
    if (!resumeText.trim() || !jobDesc.trim()) {
      setError('Both your resume and the job description are required.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const raw = await callGemini(TAILOR_PROMPT(resumeText, jobDesc), null, 5000, 0.35);
      const parsed = parseGeminiJSON(raw);

      // Normalise the resume structure
      const meta = parsed.tailorMeta || {};
      const tailored = {
        personalInfo: { ...DEFAULT_RESUME.personalInfo, ...parsed.personalInfo },
        summary: parsed.summary || '',
        education: (parsed.education || []).map(e => ({
          ...DEFAULT_RESUME.education[0], ...e, id: e.id || generateId('edu')
        })),
        projects: (parsed.projects || []).slice(0, 4).map(p => ({
          ...DEFAULT_RESUME.projects[0], ...p,
          bullets: Array.isArray(p.bullets) ? [...p.bullets.slice(0, 3), ...Array(Math.max(0, 3 - p.bullets.length)).fill('')] : ['', '', ''],
          id: p.id || generateId('proj'),
        })),
        skills: (parsed.skills || DEFAULT_RESUME.skills).map(s => ({ ...s, id: s.id || generateId('skill') })),
        achievements: parsed.achievements?.length ? parsed.achievements : [''],
        certifications: parsed.certifications?.length ? parsed.certifications : [''],
      };
      if (!tailored.education.length) tailored.education = [{ ...DEFAULT_RESUME.education[0], id: generateId('edu') }];
      if (!tailored.projects.length)  tailored.projects  = [{ ...DEFAULT_RESUME.projects[0],  id: generateId('proj') }];

      setResult({ resume: tailored, meta });
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const el = document.getElementById('tailor-resume-preview');
      const opt = {
        margin: 0,
        filename: `${result.resume.personalInfo.name || 'resume'}_Tailored_ResumeForge.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await window.html2pdf().set(opt).from(el).save();
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="tailor-panel">
      {/* ─ Input Column ─ */}
      <div className="tailor-input-col">
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Tailor Resume with AI
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Paste or upload your existing resume + a job description. AI will rewrite your resume to maximise ATS score for that specific role.
          </div>
        </div>

        <InputPanel
          title="Your Current Resume"
          icon={FileSearch}
          value={resumeText}
          onChange={setResumeText}
          placeholder="Paste your full resume text here, or switch to 'Upload File'…"
        />

        <InputPanel
          title="Job Description"
          icon={CheckCircle2}
          value={jobDesc}
          onChange={setJobDesc}
          placeholder="Paste the full job posting here (requirements, skills, responsibilities)…"
        />

        {error && (
          <div className="error-banner">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleTailor}
          disabled={loading || !resumeText.trim() || !jobDesc.trim()}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <Wand2 size={15} />
          {loading ? 'Tailoring Resume…' : 'Tailor with AI ✨'}
        </button>

        {result && (
          <>
            {/* Score comparison */}
            <ScoreDisplay
              before={result.meta.beforeScore ?? 0}
              after={result.meta.afterScore ?? 0}
            />

            {/* Keywords added */}
            {result.meta.keywordsAdded?.length > 0 && (
              <div className="tailor-changes-card">
                <div className="tailor-changes-title">Keywords Added</div>
                <div>
                  {result.meta.keywordsAdded.map((kw, i) => (
                    <span key={i} className="tailor-keyword-added">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Changes summary */}
            {result.meta.changesSummary?.length > 0 && (
              <div className="tailor-changes-card">
                <div className="tailor-changes-title">What Changed</div>
                {result.meta.changesSummary.slice(0, 6).map((c, i) => (
                  <div key={i} className="tailor-change-item">{c}</div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                onClick={exportPDF}
                disabled={exporting}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Download size={14} />
                {exporting ? 'Exporting…' : 'Export PDF'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowEditDrawer(true)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Edit3 size={14} />
                Edit Resume
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─ Preview Column ─ */}
      <div className="tailor-preview-col">
        {loading ? (
          <div className="ai-loading">
            <div className="spinner" />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>Tailoring your resume…</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 260, textAlign: 'center', lineHeight: 1.6 }}>
              AI is rewriting your resume to match the job description. This may take 20–40 seconds.
            </div>
          </div>
        ) : result ? (
          <>
            <div style={{ alignSelf: 'flex-start' }}>
              <span className="preview-label">
                <Wand2 size={13} style={{ color: 'var(--accent)' }} />
                AI-Tailored Resume Preview
              </span>
            </div>
            <div
              className="preview-scale-inner fade-in"
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
                marginBottom: `calc(${previewScale * 1123}px - 1123px)`,
              }}
            >
              <ResumePreview resume={result.resume} id="tailor-resume-preview" />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">Tailor with AI</div>
            <div className="empty-state-sub">
              Paste your resume and a job description on the left, then click "Tailor with AI" to get an ATS-optimized version tailored specifically to that role.
            </div>
          </div>
        )}
      </div>

      {/* Edit Drawer */}
      {showEditDrawer && result && (
        <ResumeEditDrawer
          resume={result.resume}
          onSave={updated => setResult(r => ({ ...r, resume: updated }))}
          onClose={() => setShowEditDrawer(false)}
        />
      )}
    </div>
  );
}
