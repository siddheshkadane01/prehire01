import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { FiSearch, FiBookmark, FiMapPin, FiBriefcase } from 'react-icons/fi';
import NotificationBell from '../components/NotificationBell';

const JobListing = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [filters, setFilters] = useState({
    keyword: '',
    experience: '',
    location: '',
    education: '',
    availability: ''
  });
  const [sortBy, setSortBy] = useState('relevant');

  useEffect(() => {
    fetchJobs();
  }, [filters, sortBy]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();

      if (filters.keyword) queryParams.append('search', filters.keyword);
      if (filters.experience) queryParams.append('experience', filters.experience);
      if (filters.location) queryParams.append('location', filters.location);
      if (sortBy !== 'relevant') queryParams.append('sortBy', sortBy);

      const response = await axios.get(`${API_ENDPOINTS.JOBS.LIST}?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setJobs(response.data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveJob = (jobId) => {
    const newSaved = new Set(savedJobs);
    if (newSaved.has(jobId)) {
      newSaved.delete(jobId);
    } else {
      newSaved.add(jobId);
    }
    setSavedJobs(newSaved);
  };

  const handleApply = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        API_ENDPOINTS.JOBS.APPLY(jobId),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Application submitted successfully!');
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to apply:', error);
      alert(error.response?.data?.message || 'Failed to apply to job');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      keyword: '',
      experience: '',
      location: '',
      education: '',
      availability: ''
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand} onClick={() => navigate('/candidate')}>PreHire</div>
        <nav style={styles.nav}>
          <a style={styles.navLink} href="#">About Us</a>
          <a style={styles.navLink} href="#">Clients</a>
          <a style={styles.navLink} href="#">Pricing</a>
          <a style={styles.navLink} href="#">FAQ</a>
          <a style={styles.navLink} href="#">Contact Us</a>
        </nav>
        <div style={styles.headerRight}>
          <NotificationBell />
          <FiSearch style={styles.iconButton} />
          <div 
            style={styles.avatar}
            onClick={() => navigate('/candidate/profile')}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </header>

      <div style={styles.mainContent}>
        {/* Sidebar Filters */}
        <aside style={styles.sidebar}>
          <h3 style={styles.filterTitle}>Filters</h3>

          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>Keyword</label>
            <input
              type="text"
              placeholder="Job title, skills..."
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>Experience</label>
            <select
              value={filters.experience}
              onChange={(e) => handleFilterChange('experience', e.target.value)}
              style={styles.select}
            >
              <option value="">All levels</option>
              <option value="0-1">0-1 years</option>
              <option value="1-3">1-3 years</option>
              <option value="3-5">3-5 years</option>
              <option value="5-10">5-10 years</option>
              <option value="10+">10+ years</option>
            </select>
          </div>

          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>Location</label>
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              style={styles.select}
            >
              <option value="">All locations</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Pune">Pune</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Delhi">Delhi</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>Highest Education</label>
            <select
              value={filters.education}
              onChange={(e) => handleFilterChange('education', e.target.value)}
              style={styles.select}
            >
              <option value="">All levels</option>
              <option value="High School">High School</option>
              <option value="Bachelor">Bachelor's</option>
              <option value="Master">Master's</option>
              <option value="PhD">PhD</option>
            </select>
          </div>

          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>Availability</label>
            <select
              value={filters.availability}
              onChange={(e) => handleFilterChange('availability', e.target.value)}
              style={styles.select}
            >
              <option value="">Any time</option>
              <option value="immediate">Immediate</option>
              <option value="15days">15 days</option>
              <option value="30days">30 days</option>
              <option value="60days">60 days</option>
            </select>
          </div>

          <div style={styles.filterButtons}>
            <button style={styles.applyButton} onClick={() => fetchJobs()}>
              Apply
            </button>
            <button style={styles.resetButton} onClick={resetFilters}>
              Reset
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={styles.content}>
          <div style={styles.contentHeader}>
            <h2 style={styles.contentTitle}>Top Results</h2>
            <div style={styles.sortContainer}>
              <label style={styles.sortLabel}>Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.sortSelect}
              >
                <option value="relevant">Most Relevant</option>
                <option value="recent">Most Recent</option>
                <option value="salary">Highest Salary</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={styles.loading}>Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div style={styles.noResults}>
              <p>No jobs found matching your criteria.</p>
              <button style={styles.resetButton} onClick={resetFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={styles.jobList}>
              {jobs.map((job) => (
                <div key={job._id} style={styles.jobCard}>
                  <div style={styles.jobHeader}>
                    <div style={styles.jobLeft}>
                      <div style={styles.companyLogo}>
                        {job.recruiterId?.companyName?.substring(0, 2).toUpperCase() || 'CL'}
                      </div>
                      <div style={styles.jobInfo}>
                        <h3 style={styles.jobTitle}>{job.title}</h3>
                        <p style={styles.companyName}>
                          {job.recruiterId?.companyName || job.companyId?.name || 'Company'}
                        </p>
                        <div style={styles.jobMeta}>
                          <span style={styles.jobMetaItem}>
                            <FiMapPin size={14} />
                            {job.location || 'Not specified'}
                          </span>
                          <span style={styles.jobMetaItem}>
                            <FiBriefcase size={14} />
                            {job.experienceRequired?.min || 0}-{job.experienceRequired?.max || 0} years
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={styles.jobRight}>
                      <FiBookmark
                        size={20}
                        style={{
                          ...styles.bookmarkIcon,
                          fill: savedJobs.has(job._id) ? '#6366F1' : 'none',
                          color: savedJobs.has(job._id) ? '#6366F1' : '#6B7280'
                        }}
                        onClick={() => toggleSaveJob(job._id)}
                      />
                      {job.featured && (
                        <span style={styles.topBadge}>TOP</span>
                      )}
                    </div>
                  </div>

                  <button
                    style={styles.applyJobButton}
                    onClick={() => handleApply(job._id)}
                  >
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F9FAFB'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  brand: {
    fontSize: 24,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    cursor: 'pointer'
  },
  nav: {
    display: 'flex',
    gap: 32,
    flex: 1,
    justifyContent: 'center'
  },
  navLink: {
    color: '#374151',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'color 0.2s',
    cursor: 'pointer'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 20
  },
  iconButton: {
    color: '#6B7280',
    cursor: 'pointer',
    fontSize: 20
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    cursor: 'pointer'
  },
  mainContent: {
    display: 'flex',
    maxWidth: 1400,
    margin: '0 auto',
    gap: 24,
    padding: 24
  },
  sidebar: {
    width: 280,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    height: 'fit-content',
    position: 'sticky',
    top: 90,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 20,
    color: '#111827'
  },
  filterSection: {
    marginBottom: 20
  },
  filterLabel: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 8
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border 0.2s',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    boxSizing: 'border-box'
  },
  filterButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 24
  },
  applyButton: {
    padding: '12px',
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  resetButton: {
    padding: '12px',
    backgroundColor: '#FFFFFF',
    color: '#374151',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  content: {
    flex: 1
  },
  contentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: '#111827'
  },
  sortContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  sortLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  sortSelect: {
    padding: '8px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    outline: 'none'
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    fontSize: 16,
    color: '#6B7280'
  },
  noResults: {
    textAlign: 'center',
    padding: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  jobList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
    cursor: 'pointer',
    ':hover': {
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }
  },
  jobHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  jobLeft: {
    display: 'flex',
    gap: 16,
    flex: 1
  },
  companyLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E8F0FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 600,
    color: '#6366F1',
    flexShrink: 0
  },
  jobInfo: {
    flex: 1
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 4
  },
  companyName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8
  },
  jobMeta: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap'
  },
  jobMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: '#6B7280'
  },
  jobRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8
  },
  bookmarkIcon: {
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  topBadge: {
    padding: '4px 8px',
    backgroundColor: '#60A5FA',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 4
  },
  applyJobButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#60A5FA',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s'
  }
};

export default JobListing;
