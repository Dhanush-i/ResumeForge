import React, { useState } from 'react';
import ResumePreview from './ResumePreview';
import { DEFAULT_RESUME, generateId } from '../constants';
import { Sparkles, Download, Lightbulb, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { callGemini, parseGeminiJSON } from '../utils/gemini';

const GEMINI_PROMPT = (userText) => `You are a professional resume writer specializing in engineering students. 
Extract resume information from the following text and return a JSON object with this EXACT structure. 
If information is missing, use empty strings. Make the content professional, concise, and ATS-friendly.
For bullet points, use strong action verbs and include metrics where possible.

Return ONLY valid JSON, no markdown, no explanation, just the JSON object:

{
  "personalInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+1 234 567 8900",
    "location": "City, State",
    "linkedin": "linkedin.com/in/username",
    "github": "github.com/username",
    "portfolio": ""
  },
  "summary": "2-3 sentence professional summary",
  "education": [
    {
      "id": "edu-1",
      "school": "University Name",
      "degree": "B.Tech",
      "field": "Computer Science",
      "startDate": "Aug 2021",
      "endDate": "May 2025",
      "gpa": "3.8/4.0",
      "location": "City, State"
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "title": "Project Name",
      "techStack": "React, Node.js, MongoDB",
      "githubLink": "",
      "bullets": [
        "Action verb + what you built + impact/metric",
        "Action verb + technical achievement",
        "Action verb + result or scale"
      ]
    }
  ],
  "skills": [
    { "id": "skill-1", "category": "Languages", "items": "Python, Java, C++, JavaScript" },
    { "id": "skill-2", "category": "Frameworks", "items": "React, Node.js, Spring Boot" },
    { "id": "skill-3", "category": "Tools", "items": "Git, Docker, AWS, VS Code" },
    { "id": "skill-4", "category": "Databases", "items": "MySQL, MongoDB, PostgreSQL" }
  ],
  "achievements": ["Achievement 1", "Achievement 2"],
  "certifications": ["Certification 1"]
}

User's background information:
${userText}`;

export default function AIBuilderTab() {
  const [userText, setUserText] = useState('');
  const [loading, setLoading] = useState(false);
  const [resume, setResume] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleGenerate = async () => {
    if (!userText.trim()) {
      setError('Please paste your background information first.');
      return;
    }
    setError('');
    setLoading(true);
    setResume(null);

    try {
      const rawText = await callGemini(GEMINI_PROMPT(userText), null, 4096, 0.4);
      const parsed = parseGeminiJSON(rawText);

      // Ensure all required fields exist
      const safeResume = {
        personalInfo: { ...DEFAULT_RESUME.personalInfo, ...parsed.personalInfo },
        summary: parsed.summary || '',
        education: (parsed.education || []).map((e, i) => ({ ...DEFAULT_RESUME.education[0], ...e, id: e.id || generateId('edu') })),
        projects: (parsed.projects || []).slice(0, 4).map((p, i) => ({
          ...DEFAULT_RESUME.projects[0],
          ...p,
          bullets: Array.isArray(p.bullets) ? [...p.bullets.slice(0, 3), ...Array(Math.max(0, 3 - p.bullets.length)).fill('')] : ['', '', ''],
          id: p.id || generateId('proj'),
        })),
        skills: (parsed.skills || DEFAULT_RESUME.skills).map((s, i) => ({ ...s, id: s.id || generateId('skill') })),
        achievements: parsed.achievements?.length ? parsed.achievements : [''],
        certifications: parsed.certifications?.length ? parsed.certifications : [''],
      };

      if (!safeResume.education.length) safeResume.education = [{ ...DEFAULT_RESUME.education[0], id: generateId('edu') }];
      if (!safeResume.projects.length) safeResume.projects = [{ ...DEFAULT_RESUME.projects[0], id: generateId('proj') }];

      setResume(safeResume);
      setSuccess('✨ Resume generated! Review and export below.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!resume) return;
    setExporting(true);
    try {
      const el = document.getElementById('ai-resume-preview');
      const opt = {
        margin: 0,
        filename: `${resume.personalInfo.name || 'resume'}_AI_ResumeForge.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await window.html2pdf().set(opt).from(el).save();
    } catch (e) {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const previewScale = 0.72;

  return (
    <div className="ai-panel">
      {/* ─ Input Panel ─ */}
      <div className="ai-input-panel">
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Paste Your Background
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Dump everything — messy is fine. AI will organize and polish it.
          </div>
        </div>

        <div className="ai-hint-card">
          <div className="ai-hint-title"><Lightbulb size={11} /> What to include</div>
          <ul className="ai-hint-list">
            <li>Your name, email, phone, LinkedIn, GitHub</li>
            <li>University, degree, graduation year, GPA</li>
            <li>All projects (name, tech, what you built)</li>
            <li>Skills, languages, frameworks, tools</li>
            <li>Achievements, hackathons, awards</li>
            <li>Certifications, courses, internships</li>
          </ul>
        </div>

        <textarea
          className="ai-textarea"
          value={userText}
          onChange={e => setUserText(e.target.value)}
          placeholder={`Hi I'm Jane Smith, jane@email.com, +1 (555) 123-4567\nLinkedIn: linkedin.com/in/jane, GitHub: github.com/jsmith\n\nI study CS at MIT (Aug 2021 - May 2025), GPA 3.9/4.0\n\nProjects:\n- Built an e-commerce app with React and Node.js, handles 1000+ users\n- ML model for predicting stock prices using Python, scikit-learn, 85% accuracy\n\nSkills: Python, Java, C++, React, Node.js, Docker, AWS\n\nAchievements: Dean's List 3 semesters, 1st place HackMIT 2023\nCertifications: AWS Solutions Architect Associate`}
        />

        {error && (
          <div className="error-banner">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="success-banner">
            <span>{success}</span>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={loading || !userText.trim()}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <Sparkles size={15} />
          {loading ? 'Building Resume...' : 'Build with AI ✨'}
        </button>

        {resume && (
          <button
            className="btn-secondary"
            onClick={exportPDF}
            disabled={exporting}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Download size={14} />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        )}
      </div>

      {/* ─ Preview Panel ─ */}
      <div className="ai-preview-panel">
        {loading ? (
          <div className="ai-loading">
            <div className="spinner" />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#818cf8' }}>AI is crafting your resume...</div>
            <div style={{ fontSize: 12, color: '#6b7280', maxWidth: 260, textAlign: 'center', lineHeight: 1.6 }}>
              If the model is busy, it will automatically retry — this may take up to 30 seconds.
            </div>
          </div>
        ) : resume ? (
          <>
            <div style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
              <span className="preview-label">
                <FileText size={13} style={{ color: '#4b5563' }} />
                AI-Generated Resume Preview
              </span>
            </div>
            <div
              className="preview-scale-inner fade-in"
              style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center', marginBottom: `calc(${previewScale * 1123}px - 1123px)` }}
            >
              <ResumePreview resume={resume} id="ai-resume-preview" />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">✨</div>
            <div className="empty-state-title">AI Resume Generator</div>
            <div className="empty-state-sub">
              Paste your background info on the left and click "Build with AI" to generate a professional resume instantly.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
