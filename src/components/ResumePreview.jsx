import React from 'react';
import { useResumeStyle } from '../context/ResumeStyleContext';

export default function ResumePreview({ resume, id = 'resume-preview' }) {
  const { font, scale } = useResumeStyle();
  const { personalInfo, summary, education, projects, skills, achievements, certifications } = resume;

  const hasContent =
    personalInfo.name || summary ||
    education.some(e => e.school) || projects.some(p => p.title) ||
    skills.some(s => s.items) || achievements.some(a => a) || certifications.some(c => c);

  const paperStyle = {
    fontFamily: font.family,
    '--rs': scale,       // CSS custom property used by all child font-size calcs
    textAlign: 'left',
  };

  if (!hasContent) {
    return (
      <div className="resume-paper" id={id} style={paperStyle}>
        <div className="resume-placeholder">
          <div style={{ fontSize: 48, opacity: 0.2 }}>📄</div>
          <p style={{ fontSize: 14, margin: 0 }}>Fill out the form to see your resume</p>
          <p style={{ fontSize: 12, margin: 0, opacity: 0.6 }}>Live preview appears here as you type</p>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-paper" id={id} style={paperStyle}>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        {personalInfo.name && (
          <h1 className="resume-name">{personalInfo.name}</h1>
        )}
        <div className="resume-contact-row">
          {personalInfo.email && <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a>}
          {personalInfo.phone && <><span className="resume-contact-sep">|</span><span>{personalInfo.phone}</span></>}
          {personalInfo.location && <><span className="resume-contact-sep">|</span><span>{personalInfo.location}</span></>}
          {personalInfo.linkedin && (
            <><span className="resume-contact-sep">|</span>
            <a href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://${personalInfo.linkedin}`} target="_blank" rel="noreferrer">
              {personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
            </a></>
          )}
          {personalInfo.github && (
            <><span className="resume-contact-sep">|</span>
            <a href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://${personalInfo.github}`} target="_blank" rel="noreferrer">
              {personalInfo.github.replace(/^https?:\/\/(www\.)?/, '')}
            </a></>
          )}
          {personalInfo.portfolio && (
            <><span className="resume-contact-sep">|</span>
            <a href={personalInfo.portfolio.startsWith('http') ? personalInfo.portfolio : `https://${personalInfo.portfolio}`} target="_blank" rel="noreferrer">Portfolio</a></>
          )}
        </div>
      </div>

      {/* ── Summary ── */}
      {summary && (
        <div className="resume-section">
          <h2 className="resume-section-title">Summary</h2>
          <hr className="resume-section-rule" />
          <p className="resume-summary-text">{summary}</p>
        </div>
      )}

      {/* ── Education ── */}
      {education.some(e => e.school) && (
        <div className="resume-section">
          <h2 className="resume-section-title">Education</h2>
          <hr className="resume-section-rule" />
          {education.filter(e => e.school).map(edu => (
            <div key={edu.id} className="resume-edu-block">
              <div className="resume-edu-header">
                <span className="resume-edu-school">{edu.school}</span>
                <span className="resume-edu-date">
                  {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                </span>
              </div>
              {(edu.degree || edu.field) && (
                <div className="resume-edu-degree">
                  {[edu.degree, edu.field].filter(Boolean).join(', ')}
                  {edu.location ? ` — ${edu.location}` : ''}
                </div>
              )}
              {edu.gpa && <div className="resume-edu-gpa">GPA: {edu.gpa}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Projects ── */}
      {projects.some(p => p.title) && (
        <div className="resume-section">
          <h2 className="resume-section-title">Projects</h2>
          <hr className="resume-section-rule" />
          {projects.filter(p => p.title).map(proj => (
            <div key={proj.id} className="resume-project-block">
              <div className="resume-project-header">
                <span className="resume-project-title">
                  {proj.title}
                  {proj.techStack && <span className="resume-project-stack"> | {proj.techStack}</span>}
                </span>
                {proj.githubLink && (
                  <a
                    href={proj.githubLink.startsWith('http') ? proj.githubLink : `https://${proj.githubLink}`}
                    className="resume-project-link"
                    target="_blank" rel="noreferrer"
                  >GitHub ↗</a>
                )}
              </div>
              {proj.bullets.filter(b => b).length > 0 && (
                <ul className="resume-bullets">
                  {proj.bullets.filter(b => b).map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Technical Skills ── */}
      {skills.some(s => s.items) && (
        <div className="resume-section">
          <h2 className="resume-section-title">Technical Skills</h2>
          <hr className="resume-section-rule" />
          <div className="resume-skills-grid">
            {skills.filter(s => s.category && s.items).map(skill => (
              <div key={skill.id} className="resume-skill-row">
                <span className="resume-skill-cat">{skill.category}:</span>
                <span className="resume-skill-vals">{skill.items}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Achievements ── */}
      {achievements.some(a => a) && (
        <div className="resume-section">
          <h2 className="resume-section-title">Achievements</h2>
          <hr className="resume-section-rule" />
          {achievements.filter(a => a).map((a, i) => (
            <div key={i} className="resume-achievement-item">{a}</div>
          ))}
        </div>
      )}

      {/* ── Certifications ── */}
      {certifications.some(c => c) && (
        <div className="resume-section">
          <h2 className="resume-section-title">Certifications</h2>
          <hr className="resume-section-rule" />
          {certifications.filter(c => c).map((c, i) => (
            <div key={i} className="resume-cert-item">{c}</div>
          ))}
        </div>
      )}
    </div>
  );
}
