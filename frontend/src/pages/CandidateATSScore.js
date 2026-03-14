import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { FiBell, FiSearch } from 'react-icons/fi';
import API_ENDPOINTS from '../config/api';

const CandidateATSScore = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState('');
  const [atsResult, setAtsResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      alert('Please enter a job description');
      return;
    }

    try {
      setLoading(true);
      setAtsResult(null);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        API_ENDPOINTS.CANDIDATE.ATS_SCORE,
        { jobDescription },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Navigate to the beautiful results page with the data
      navigate('/ats-score-results', {
        state: { 
          atsScore: res.data, 
          jobDescription, 
          parsedData: {
            name: user?.name,
            email: user?.email,
            phone: user?.phone,
            skills: user?.skills || [],
            education: user?.education,
            experienceYears: user?.experienceYears
          } 
        }
      });
    } catch (error) {
      console.error('ATS score error:', error);
      alert('Failed to calculate ATS score. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const breakdown = atsResult?.breakdown || {};
  const overallScore = Math.round(atsResult?.score || 0);

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#3B82F6'; // Blue
    if (score >= 40) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

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
              <img
                src={user.photo.startsWith('http') ? user.photo : `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${user.photo}`}
                alt="Profile"
                style={styles.avatarImg}
              />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.title}>Check ATS Score</h1>
        <p style={styles.subtitle}>
          Paste the job description below to see how well your current profile and parsed resume match.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.jobDescriptionSection}>
            <label htmlFor="job-description" style={styles.label}>Job Description</label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              style={styles.textarea}
              rows={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Calculating...' : 'Calculate ATS Score'}
          </button>
        </form>

        <div style={styles.footer}>
          <a href="/candidate/edit-profile" style={styles.backLink}>Back to Profile</a>
        </div>
      </main>
    </div>
  );
};

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
    maxWidth: '900px',
    margin: '0 auto',
    padding: '3rem 2rem'
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: '2.5rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  jobDescriptionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#374151'
  },
  textarea: {
    padding: '1rem',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '150px'
  },
  submitButton: {
    padding: '0.875rem 2rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    alignSelf: 'flex-start'
  },
  resultsSection: {
    marginTop: '1rem'
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
    marginBottom: '0.25rem'
  },
  cardSubtitle: {
    fontSize: '0.9rem',
    color: '#6B7280',
    marginBottom: '1.5rem'
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
  footer: {
    textAlign: 'center',
    marginTop: '2rem'
  },
  backLink: {
    color: '#3B82F6',
    textDecoration: 'none',
    fontSize: '0.95rem'
  }
};

export default CandidateATSScore;

