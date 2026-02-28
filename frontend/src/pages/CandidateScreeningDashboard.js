import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../config/api';

const CandidateScreeningDashboard = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMinScore, setFilterMinScore] = useState('');
  const [sortBy, setSortBy] = useState('atsScore');
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobAndApplications();
  }, [jobId]);

  useEffect(() => {
    applyFilters();
  }, [applications, filterStatus, filterMinScore, sortBy]);

  const fetchJobAndApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch job details
      const jobResponse = await axios.get(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJob(jobResponse.data.job);

      // Fetch applications
      const appsResponse = await axios.get(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}/applications`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApplications(appsResponse.data.applications || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...applications];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(app => app.status === filterStatus);
    }

    // Filter by min ATS score
    if (filterMinScore) {
      filtered = filtered.filter(app => (app.atsScore || 0) >= parseFloat(filterMinScore));
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return bVal - aVal;
    });

    setFilteredApplications(filtered);
  };

  const toggleSelectCandidate = (candidateId) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const selectAll = () => {
    setSelectedCandidates(filteredApplications.map(app => app.candidateId._id));
  };

  const deselectAll = () => {
    setSelectedCandidates([]);
  };

  const handleBulkAction = async (action) => {
    if (selectedCandidates.length === 0) {
      alert('Please select candidates first');
      return;
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedCandidates.length} candidate(s)?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}/applications/bulk-update`,
        {
          candidateIds: selectedCandidates,
          newStatus: action,
          notes: `Bulk ${action} by recruiter`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Successfully ${action} ${selectedCandidates.length} candidate(s)`);
      setSelectedCandidates([]);
      fetchJobAndApplications();
    } catch (error) {
      alert('Bulk action failed: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRequestInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}/request-latest-info`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Information request sent to all shortlisted candidates');
    } catch (error) {
      alert('Failed to send request: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleScheduleInterview = async (candidateId) => {
    const round = prompt('Enter interview round number:');
    const interviewerName = prompt('Enter interviewer name:');
    const scheduledDate = prompt('Enter interview date and time (YYYY-MM-DD HH:MM):');

    if (!round || !interviewerName || !scheduledDate) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}/applications/${candidateId}/schedule-interview`,
        {
          round: parseInt(round),
          interviewerName,
          scheduledDate
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Interview scheduled successfully');
      fetchJobAndApplications();
    } catch (error) {
      alert('Failed to schedule interview: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleExtendOffer = async (candidateId) => {
    if (!confirm('Are you sure you want to extend an offer to this candidate?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}/applications/${candidateId}/extend-offer`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Offer extended successfully!');
      fetchJobAndApplications();
    } catch (error) {
      alert('Failed to extend offer: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      unscreened: '#gray',
      screening: '#blue',
      shortlisted: '#10b981',
      rejected: '#ef4444',
      interview_scheduled: '#f59e0b',
      interview_completed: '#8b5cf6',
      offer_extended: '#6366f1',
      offer_accepted: '#10b981',
      hired: '#059669'
    };
    return colors[status] || '#gray';
  };

  const getStatusLabel = (status) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const stats = {
    total: applications.length,
    unscreened: applications.filter(a => a.status === 'unscreened').length,
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    interviewed: applications.filter(a => a.status.includes('interview')).length,
    offered: applications.filter(a => a.status === 'offer_extended').length,
    hired: applications.filter(a => a.status === 'hired').length
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{job?.title || 'Job'}</h1>
          <p style={styles.subtitle}>Candidate Screening Dashboard</p>
        </div>
        <button onClick={() => navigate('/recruiter')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      </header>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Applications</div>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #gray'}}>
          <div style={styles.statValue}>{stats.unscreened}</div>
          <div style={styles.statLabel}>Unscreened</div>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #10b981'}}>
          <div style={styles.statValue}>{stats.shortlisted}</div>
          <div style={styles.statLabel}>Shortlisted</div>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #f59e0b'}}>
          <div style={styles.statValue}>{stats.interviewed}</div>
          <div style={styles.statLabel}>Interviewed</div>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #6366f1'}}>
          <div style={styles.statValue}>{stats.offered}</div>
          <div style={styles.statLabel}>Offers Extended</div>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #059669'}}>
          <div style={styles.statValue}>{stats.hired}</div>
          <div style={styles.statLabel}>Hired</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div style={styles.controlBar}>
        <div style={styles.filters}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Status</option>
            <option value="unscreened">Unscreened</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="offer_extended">Offer Extended</option>
          </select>

          <input
            type="number"
            placeholder="Min ATS Score"
            value={filterMinScore}
            onChange={(e) => setFilterMinScore(e.target.value)}
            style={styles.input}
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.select}
          >
            <option value="atsScore">Sort by ATS Score</option>
            <option value="appliedAt">Sort by Applied Date</option>
          </select>
        </div>

        <div style={styles.actions}>
          {selectedCandidates.length > 0 && (
            <>
              <button onClick={() => handleBulkAction('shortlisted')} style={styles.actionButton}>
                ✓ Shortlist Selected ({selectedCandidates.length})
              </button>
              <button onClick={() => handleBulkAction('rejected')} style={{...styles.actionButton, background: '#ef4444'}}>
                ✕ Reject Selected ({selectedCandidates.length})
              </button>
            </>
          )}
          <button onClick={handleRequestInfo} style={styles.actionButton}>
            📧 Request Latest Info
          </button>
        </div>
      </div>

      {/* Selection Controls */}
      {filteredApplications.length > 0 && (
        <div style={styles.selectionBar}>
          <button onClick={selectAll} style={styles.linkButton}>Select All</button>
          <button onClick={deselectAll} style={styles.linkButton}>Deselect All</button>
          <span style={styles.selectedCount}>
            {selectedCandidates.length} selected
          </span>
        </div>
      )}

      {/* Applications Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Select</th>
              <th style={styles.th}>Candidate</th>
              <th style={styles.th}>ATS Score</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Experience</th>
              <th style={styles.th}>Skills</th>
              <th style={styles.th}>Applied</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map((app, index) => (
              <tr key={index} style={styles.tableRow}>
                <td style={styles.td}>
                  <input
                    type="checkbox"
                    checked={selectedCandidates.includes(app.candidateId._id)}
                    onChange={() => toggleSelectCandidate(app.candidateId._id)}
                  />
                </td>
                <td style={styles.td}>
                  <div style={styles.candidateCell}>
                    {app.candidateId.photo && (
                      <img src={app.candidateId.photo} alt="" style={styles.avatar} />
                    )}
                    <div>
                      <div style={styles.candidateName}>{app.candidateId.name}</div>
                      <div style={styles.candidateEmail}>{app.candidateId.email}</div>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={{
                    ...styles.scoreBadge,
                    background: app.atsScore >= 80 ? '#10b981' :
                      app.atsScore >= 60 ? '#f59e0b' : '#ef4444'
                  }}>
                    {app.atsScore ? Math.round(app.atsScore) : 'N/A'}
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    background: getStatusColor(app.status)
                  }}>
                    {getStatusLabel(app.status)}
                  </span>
                </td>
                <td style={styles.td}>
                  {app.candidateId.experienceYears || 0} years
                </td>
                <td style={styles.td}>
                  <div style={styles.skillsCell}>
                    {app.candidateId.skills?.slice(0, 3).map((skill, i) => (
                      <span key={i} style={styles.skillTag}>{skill}</span>
                    ))}
                  </div>
                </td>
                <td style={styles.td}>
                  {new Date(app.appliedAt).toLocaleDateString()}
                </td>
                <td style={styles.td}>
                  <div style={styles.actionCell}>
                    {app.status === 'shortlisted' && (
                      <button
                        onClick={() => handleScheduleInterview(app.candidateId._id)}
                        style={styles.smallButton}
                      >
                        Schedule
                      </button>
                    )}
                    {(app.status === 'interview_completed' || 
                      app.interviewHistory?.every(i => i.status === 'completed')) && (
                      <button
                        onClick={() => handleExtendOffer(app.candidateId._id)}
                        style={{...styles.smallButton, background: '#6366f1'}}
                      >
                        Extend Offer
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCandidate(app)}
                      style={styles.smallButton}
                    >
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredApplications.length === 0 && (
          <div style={styles.emptyState}>
            No applications match your filters
          </div>
        )}
      </div>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div style={styles.modal} onClick={() => setSelectedCandidate(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedCandidate(null)} style={styles.closeButton}>×</button>
            <h2>{selectedCandidate.candidateId.name}</h2>
            <p><strong>Email:</strong> {selectedCandidate.candidateId.email}</p>
            <p><strong>ATS Score:</strong> {selectedCandidate.atsScore || 'N/A'}</p>
            <p><strong>Status:</strong> {getStatusLabel(selectedCandidate.status)}</p>
            <p><strong>Experience:</strong> {selectedCandidate.candidateId.experienceYears} years</p>
            <p><strong>Skills:</strong> {selectedCandidate.candidateId.skills?.join(', ') || 'N/A'}</p>
            <p><strong>Location:</strong> {selectedCandidate.candidateId.location || 'N/A'}</p>
            <p><strong>Resume:</strong> <a href={selectedCandidate.candidateId.resumeUrl} target="_blank" rel="noreferrer">View Resume</a></p>
            
            {selectedCandidate.interviewHistory?.length > 0 && (
              <div>
                <h3>Interview History</h3>
                {selectedCandidate.interviewHistory.map((interview, i) => (
                  <div key={i} style={styles.interviewCard}>
                    <p><strong>Round {interview.round}</strong></p>
                    <p>Interviewer: {interview.interviewerName}</p>
                    <p>Date: {new Date(interview.scheduledDate).toLocaleString()}</p>
                    <p>Status: {interview.status}</p>
                    {interview.feedback && <p>Feedback: {interview.feedback}</p>}
                    {interview.rating && <p>Rating: {interview.rating}/5</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '32px',
    margin: 0,
    color: '#1a1a1a'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '5px 0 0 0'
  },
  backButton: {
    padding: '10px 20px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '30px'
  },
  statCard: {
    background: '#fff',
    padding: '20px',
    borderRadius: '12px',
    borderTop: '4px solid #6366f1',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666'
  },
  controlBar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  filters: {
    display: 'flex',
    gap: '12px'
  },
  actions: {
    display: 'flex',
    gap: '12px'
  },
  select: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: '#fff'
  },
  input: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    width: '150px'
  },
  actionButton: {
    padding: '10px 16px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  selectionBar: {
    background: '#fff',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  selectedCount: {
    marginLeft: 'auto',
    color: '#666',
    fontWeight: '500'
  },
  tableContainer: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#333'
  },
  candidateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  candidateName: {
    fontWeight: '600',
    color: '#1a1a1a'
  },
  candidateEmail: {
    fontSize: '12px',
    color: '#666'
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    color: '#fff',
    fontWeight: '600',
    fontSize: '14px'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '500'
  },
  skillsCell: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  skillTag: {
    padding: '2px 8px',
    background: '#f0f0f0',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#333'
  },
  actionCell: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  smallButton: {
    padding: '6px 12px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#666',
    fontSize: '16px'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#666'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: '#fff',
    padding: '30px',
    borderRadius: '12px',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
    position: 'relative'
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '30px',
    cursor: 'pointer',
    color: '#666'
  },
  interviewCard: {
    background: '#f8f9fa',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '12px'
  }
};

export default CandidateScreeningDashboard;
