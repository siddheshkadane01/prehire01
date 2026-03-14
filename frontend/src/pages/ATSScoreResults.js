import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { FiBell, FiSearch } from 'react-icons/fi';
import axios from 'axios';

const ATSScoreResults = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [atsScore, setAtsScore] = useState(location.state?.atsScore || null);
  const [parsedData, setParsedData] = useState(location.state?.parsedData || null);
  const [jobDescription, setJobDescription] = useState(location.state?.jobDescription || '');

  useEffect(() => {
    if (!atsScore) {
      // If no data in state, redirect back to upload
      navigate('/ats-score-upload');
    }
  }, [atsScore, navigate]);

  if (!atsScore) {
    return <div style={styles.loading}>Loading...</div>;
  }

  const breakdown = atsScore.breakdown || {};
  const overallScore = Math.round(atsScore.score || 0);
  
  // Extract matched and missing skills from job description
  const jobSkills = extractSkillsFromJobDescription(jobDescription);
  const resumeSkills = parsedData?.skills || [];
  const matchedSkills = resumeSkills.filter(skill => 
    jobSkills.some(jobSkill => 
      skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
      jobSkill.toLowerCase().includes(skill.toLowerCase())
    )
  );
  const missingSkills = jobSkills.filter(jobSkill =>
    !resumeSkills.some(skill =>
      skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
      jobSkill.toLowerCase().includes(skill.toLowerCase())
    )
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>PreHire</div>
        <nav style={styles.nav}>
          <a href="#" style={styles.navLink}>About Us</a>
          <a href="#" style={styles.navLink}>Clients</a>
          <a href="#" style={styles.navLink}>Pricing</a>
          <a href="#" style={styles.navLink}>FAQ</a>
          <a href="#" style={styles.navLink}>Contact Us</a>
        </nav>
        <div style={styles.userSection}>
          <FiBell style={styles.icon} size={20} color="#374151" />
          <FiSearch style={styles.icon} size={20} color="#374151" />
          <div style={styles.avatar}>
            {user?.photo ? (
              <img src={user.photo.startsWith('http') ? user.photo : `http://localhost:5001${user.photo}`} alt="Profile" style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.title}>ATS Score Analysis</h1>
        <p style={styles.subtitle}>See how well your profile matches job requirements</p>

        <div style={styles.contentGrid}>
          {/* Left Column */}
          <div style={styles.leftColumn}>
            {/* Skills Match Card */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Skills Match</h3>
              <div style={styles.skillsContainer}>
                {matchedSkills.slice(0, 5).map((skill, index) => (
                  <span key={index} style={styles.skillTagMatched}>
                    {skill}
                  </span>
                ))}
                {missingSkills.slice(0, 3).map((skill, index) => (
                  <span key={`missing-${index}`} style={styles.skillTagMissing}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Improvement Suggestions Card */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Improvement Suggestion</h3>
              <div style={styles.suggestionsContent}>
                <ul style={styles.suggestionsList}>
                  {missingSkills.length > 0 && (
                    <li>Add missing skills: {missingSkills.slice(0, 3).join(', ')}</li>
                  )}
                  {breakdown.experienceYears < 3 && (
                    <li>Highlight relevant experience and achievements</li>
                  )}
                  {breakdown.educationScore < 70 && (
                    <li>Emphasize educational qualifications and certifications</li>
                  )}
                  <li>Use keywords from the job description throughout your resume</li>
                  <li>Quantify achievements with specific metrics and numbers</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={styles.rightColumn}>
            {/* ATS Score Summary Card */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>ATS Score Analysis</h3>
              <p style={styles.cardSubtitle}>See how well your profile matches job requirements</p>
              
              <div style={styles.scoreCircleContainer}>
                <div style={styles.scoreCircle}>
                  <svg width="120" height="120" style={styles.circleSvg}>
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke={getScoreColor(overallScore)}
                      strokeWidth="8"
                      strokeDasharray={`${(overallScore / 100) * 339.29} 339.29`}
                      strokeDashoffset="84.82"
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dasharray 0.5s ease' }}
                    />
                  </svg>
                  <div style={styles.scoreText}>
                    <div style={styles.scoreNumber}>{overallScore}%</div>
                  </div>
                </div>
              </div>

              <div style={styles.breakdownGrid}>
                <div style={styles.breakdownItem}>
                  <div style={styles.breakdownLabel}>Skills Match</div>
                  <div style={styles.breakdownValue}>{Math.round(breakdown.skillsScore || 0)}%</div>
                </div>
                <div style={styles.breakdownItem}>
                  <div style={styles.breakdownLabel}>Content Match</div>
                  <div style={styles.breakdownValue}>{Math.round(breakdown.keywordScore || 0)}%</div>
                </div>
                <div style={styles.breakdownItem}>
                  <div style={styles.breakdownLabel}>Sections Essential</div>
                  <div style={styles.breakdownValue}>{Math.round(breakdown.educationScore || 0)}%</div>
                </div>
              </div>
            </div>

            {/* Resume Preview Card */}
            <div style={styles.card}>
              <div style={styles.resumePreview}>
                <div style={styles.resumeHeader}>
                  {parsedData?.name && (
                    <>
                      <div style={styles.resumeAvatar}>
                        {parsedData.name.charAt(0)}
                      </div>
                      <div>
                        <div style={styles.resumeName}>{parsedData.name}</div>
                        {parsedData.email && <div style={styles.resumeEmail}>{parsedData.email}</div>}
                        {parsedData.phone && <div style={styles.resumePhone}>{parsedData.phone}</div>}
                      </div>
                    </>
                  )}
                </div>
                {parsedData?.skills && parsedData.skills.length > 0 && (
                  <div style={styles.resumeSection}>
                    <h4 style={styles.resumeSectionTitle}>Skills</h4>
                    <div style={styles.resumeSkills}>
                      {parsedData.skills.map((skill, index) => (
                        <span key={index} style={styles.resumeSkillTag}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
                {parsedData?.education && (
                  <div style={styles.resumeSection}>
                    <h4 style={styles.resumeSectionTitle}>Education</h4>
                    <p style={styles.resumeText}>{parsedData.education}</p>
                  </div>
                )}
                {parsedData?.experienceYears !== undefined && (
                  <div style={styles.resumeSection}>
                    <h4 style={styles.resumeSectionTitle}>Experience</h4>
                    <p style={styles.resumeText}>{parsedData.experienceYears} years</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <a href="/candidate" style={styles.backLink}>Back to Dashboard</a>
        </div>
      </main>
    </div>
  );
};

// Helper function to extract skills from job description
function extractSkillsFromJobDescription(jobDescription) {
  if (!jobDescription) return [];
  
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'HTML', 'CSS',
    'SQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'TypeScript', 'Angular',
    'Vue.js', 'Express', 'Django', 'Flask', 'Spring', 'MySQL', 'PostgreSQL',
    'Kubernetes', 'GraphQL', 'Redis', 'Elasticsearch'
  ];
  
  const jobLower = jobDescription.toLowerCase();
  return commonSkills.filter(skill => jobLower.includes(skill.toLowerCase()));
}

// Helper function to get score color
function getScoreColor(score) {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#3B82F6'; // Blue
  if (score >= 40) return '#F59E0B'; // Orange
  return '#EF4444'; // Red
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 3rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #E5E7EB'
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem'
  },
  navLink: {
    textDecoration: 'none',
    color: '#6B7280',
    fontSize: '0.95rem',
    fontWeight: '500'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  icon: {
    cursor: 'pointer'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    overflow: 'hidden'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3B82F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: '1.1rem'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '3rem 2rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: '3rem'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '1.5rem'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem'
  },
  cardSubtitle: {
    fontSize: '0.9rem',
    color: '#6B7280',
    marginBottom: '1.5rem'
  },
  skillsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  skillTagMatched: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  skillTagMissing: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  blurredContent: {
    filter: 'blur(8px)',
    pointerEvents: 'none',
    minHeight: '150px',
    backgroundColor: '#F9FAFB',
    borderRadius: '4px',
    padding: '1rem',
    marginBottom: '1rem'
  },
  blurredText: {
    color: '#6B7280',
    fontSize: '0.9rem'
  },
  blurredResumePreview: {
    minHeight: '200px'
  },
  blurredResumeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  blurredAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#E5E7EB'
  },
  blurredName: {
    height: '20px',
    width: '150px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px'
  },
  unlockButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  suggestionsContent: {
    padding: '0.5rem 0'
  },
  suggestionsList: {
    listStyle: 'disc',
    paddingLeft: '1.5rem',
    color: '#374151',
    lineHeight: '1.8'
  },
  scoreCircleContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem'
  },
  scoreCircle: {
    position: 'relative',
    width: '120px',
    height: '120px'
  },
  circleSvg: {
    transform: 'rotate(-90deg)'
  },
  scoreText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center'
  },
  scoreNumber: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#111827'
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem'
  },
  breakdownItem: {
    textAlign: 'center',
    padding: '0.75rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '6px'
  },
  breakdownLabel: {
    fontSize: '0.75rem',
    color: '#6B7280',
    marginBottom: '0.25rem'
  },
  breakdownValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#111827'
  },
  resumePreview: {
    padding: '0.5rem 0'
  },
  resumeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #E5E7EB'
  },
  resumeAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#3B82F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: '1.25rem'
  },
  resumeName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.25rem'
  },
  resumeEmail: {
    fontSize: '0.875rem',
    color: '#6B7280',
    marginBottom: '0.125rem'
  },
  resumePhone: {
    fontSize: '0.875rem',
    color: '#6B7280'
  },
  resumeSection: {
    marginBottom: '1.5rem'
  },
  resumeSectionTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.5rem'
  },
  resumeSkills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  resumeSkillTag: {
    backgroundColor: '#EFF6FF',
    color: '#1E40AF',
    padding: '0.375rem 0.75rem',
    borderRadius: '16px',
    fontSize: '0.875rem'
  },
  resumeText: {
    fontSize: '0.9rem',
    color: '#374151',
    lineHeight: '1.6'
  },
  footer: {
    textAlign: 'center',
    marginTop: '2rem'
  },
  backLink: {
    color: '#3B82F6',
    textDecoration: 'none',
    fontSize: '0.95rem'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.2rem'
  }
};

export default ATSScoreResults;
