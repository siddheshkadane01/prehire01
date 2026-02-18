import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../../config/api';
import { useAuth } from '../../utils/AuthContext';

const TenantDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRecruiter, setShowAddRecruiter] = useState(false);
  const [newRecruiter, setNewRecruiter] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    designation: ''
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'tenant') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [statsRes, recruitersRes] = await Promise.all([
        axios.get(API_ENDPOINTS.TENANT.DASHBOARD),
        axios.get(API_ENDPOINTS.TENANT.RECRUITERS)
      ]);
      
      setStats(statsRes.data.stats);
      setRecruiters(recruitersRes.data.recruiters);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecruiter = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API_ENDPOINTS.TENANT.RECRUITERS, newRecruiter);
      alert('Recruiter added successfully!');
      setShowAddRecruiter(false);
      setNewRecruiter({
        name: '',
        email: '',
        password: '',
        phone: '',
        designation: ''
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add recruiter');
    }
  };

  const handleDeleteRecruiter = async (id) => {
    if (!window.confirm('Are you sure you want to remove this recruiter?')) return;
    
    try {
      await axios.delete(API_ENDPOINTS.TENANT.RECRUITER(id));
      alert('Recruiter removed successfully');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to remove recruiter');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Tenant Dashboard</h1>
          <p style={styles.subtitle}>{stats?.company?.name || 'Company Management'}</p>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </header>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Total Recruiters</h3>
          <p style={styles.statValue}>{stats?.recruiters || 0}</p>
          <span style={styles.statSubtext}>
            Limit: {stats?.company?.subscription?.recruiterLimit || 'N/A'}
          </span>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Active Jobs</h3>
          <p style={styles.statValue}>{stats?.activeJobs || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Total Applications</h3>
          <p style={styles.statValue}>{stats?.totalApplications || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Subscription</h3>
          <p style={styles.statValue}>{stats?.company?.subscription?.plan || 'Free'}</p>
          <span style={styles.statSubtext}>
            Status: {stats?.company?.subscription?.status || 'active'}
          </span>
        </div>
      </div>

      {/* Recruiters Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recruiters & HR Team</h2>
          <button
            onClick={() => setShowAddRecruiter(!showAddRecruiter)}
            style={styles.addBtn}
          >
            + Add Recruiter
          </button>
        </div>

        {showAddRecruiter && (
          <form onSubmit={handleAddRecruiter} style={styles.form}>
            <div style={styles.formGrid}>
              <input
                type="text"
                placeholder="Name *"
                value={newRecruiter.name}
                onChange={(e) => setNewRecruiter({...newRecruiter, name: e.target.value})}
                required
                style={styles.input}
              />
              <input
                type="email"
                placeholder="Email *"
                value={newRecruiter.email}
                onChange={(e) => setNewRecruiter({...newRecruiter, email: e.target.value})}
                required
                style={styles.input}
              />
              <input
                type="password"
                placeholder="Password *"
                value={newRecruiter.password}
                onChange={(e) => setNewRecruiter({...newRecruiter, password: e.target.value})}
                required
                minLength="6"
                style={styles.input}
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newRecruiter.phone}
                onChange={(e) => setNewRecruiter({...newRecruiter, phone: e.target.value})}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Designation (e.g., HR Manager, Recruiter)"
                value={newRecruiter.designation}
                onChange={(e) => setNewRecruiter({...newRecruiter, designation: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.formActions}>
              <button type="submit" style={styles.submitBtn}>Add Recruiter</button>
              <button
                type="button"
                onClick={() => setShowAddRecruiter(false)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div style={styles.table}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Jobs Posted</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recruiters.map((recruiter) => (
                <tr key={recruiter._id} style={styles.tableRow}>
                  <td style={styles.td}>{recruiter.name}</td>
                  <td style={styles.td}>{recruiter.email}</td>
                  <td style={styles.td}>{recruiter.phone || 'N/A'}</td>
                  <td style={styles.td}>{recruiter.jobCount || 0}</td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleDeleteRecruiter(recruiter._id)}
                      style={styles.deleteBtn}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recruiters.length === 0 && (
            <p style={styles.noData}>No recruiters yet. Add your first recruiter!</p>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f7fafc',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a202c'
  },
  subtitle: {
    margin: '0.5rem 0 0 0',
    color: '#718096',
    fontSize: '0.875rem'
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  statLabel: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: '0.5rem 0',
    fontSize: '2rem',
    fontWeight: '700',
    color: '#3b82f6'
  },
  statSubtext: {
    fontSize: '0.75rem',
    color: '#a0aec0'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a202c'
  },
  addBtn: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  form: {
    backgroundColor: '#f7fafc',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.875rem',
    outline: 'none'
  },
  formActions: {
    display: 'flex',
    gap: '1rem'
  },
  submitBtn: {
    padding: '0.625rem 1.5rem',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  cancelBtn: {
    padding: '0.625rem 1.5rem',
    backgroundColor: '#cbd5e0',
    color: '#2d3748',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  table: {
    overflowX: 'auto'
  },
  tableHeader: {
    backgroundColor: '#f7fafc'
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#4a5568'
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0'
  },
  td: {
    padding: '1rem 0.75rem',
    fontSize: '0.875rem',
    color: '#2d3748'
  },
  deleteBtn: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#feb2b2',
    color: '#742a2a',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  noData: {
    textAlign: 'center',
    padding: '2rem',
    color: '#a0aec0'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.25rem',
    color: '#718096'
  }
};

export default TenantDashboard;
