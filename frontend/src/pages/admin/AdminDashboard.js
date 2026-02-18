import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../../config/api';
import { useAuth } from '../../utils/AuthContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    companyWebsite: '',
    industry: ''
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        axios.get(API_ENDPOINTS.ADMIN.STATS),
        axios.get(`${API_ENDPOINTS.ADMIN.TENANTS}?limit=10`)
      ]);
      
      setStats(statsRes.data.stats);
      setTenants(tenantsRes.data.tenants);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTenant = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API_ENDPOINTS.ADMIN.TENANTS, newTenant);
      alert('Tenant added successfully!');
      setShowAddTenant(false);
      setNewTenant({
        name: '',
        email: '',
        password: '',
        phone: '',
        companyName: '',
        companyWebsite: '',
        industry: ''
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add tenant');
    }
  };

  const handleDeleteTenant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) return;
    
    try {
      await axios.delete(API_ENDPOINTS.ADMIN.TENANT(id));
      alert('Tenant deleted successfully');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete tenant');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.subtitle}>PreHire Platform Management</p>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </header>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Total Companies</h3>
          <p style={styles.statValue}>{stats?.companies?.total || 0}</p>
          <span style={styles.statSubtext}>
            {stats?.companies?.active || 0} active
          </span>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Tenants</h3>
          <p style={styles.statValue}>{stats?.users?.tenants || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Recruiters</h3>
          <p style={styles.statValue}>{stats?.users?.recruiters || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Candidates</h3>
          <p style={styles.statValue}>{stats?.users?.candidates || 0}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Total Jobs</h3>
          <p style={styles.statValue}>{stats?.jobs?.total || 0}</p>
          <span style={styles.statSubtext}>
            {stats?.jobs?.active || 0} active
          </span>
        </div>
      </div>

      {/* Tenants Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Tenants</h2>
          <button
            onClick={() => setShowAddTenant(!showAddTenant)}
            style={styles.addBtn}
          >
            + Add Tenant
          </button>
        </div>

        {showAddTenant && (
          <form onSubmit={handleAddTenant} style={styles.form}>
            <div style={styles.formGrid}>
              <input
                type="text"
                placeholder="Name *"
                value={newTenant.name}
                onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                required
                style={styles.input}
              />
              <input
                type="email"
                placeholder="Email *"
                value={newTenant.email}
                onChange={(e) => setNewTenant({...newTenant, email: e.target.value})}
                required
                style={styles.input}
              />
              <input
                type="password"
                placeholder="Password *"
                value={newTenant.password}
                onChange={(e) => setNewTenant({...newTenant, password: e.target.value})}
                required
                minLength="6"
                style={styles.input}
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newTenant.phone}
                onChange={(e) => setNewTenant({...newTenant, phone: e.target.value})}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Company Name *"
                value={newTenant.companyName}
                onChange={(e) => setNewTenant({...newTenant, companyName: e.target.value})}
                required
                style={styles.input}
              />
              <input
                type="url"
                placeholder="Company Website"
                value={newTenant.companyWebsite}
                onChange={(e) => setNewTenant({...newTenant, companyWebsite: e.target.value})}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Industry"
                value={newTenant.industry}
                onChange={(e) => setNewTenant({...newTenant, industry: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.formActions}>
              <button type="submit" style={styles.submitBtn}>Add Tenant</button>
              <button
                type="button"
                onClick={() => setShowAddTenant(false)}
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
                <th style={styles.th}>Company</th>
                <th style={styles.th}>Recruiters</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant._id} style={styles.tableRow}>
                  <td style={styles.td}>{tenant.name}</td>
                  <td style={styles.td}>{tenant.email}</td>
                  <td style={styles.td}>{tenant.company?.name || 'N/A'}</td>
                  <td style={styles.td}>{tenant.recruiterCount || 0}</td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleDeleteTenant(tenant._id)}
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && (
            <p style={styles.noData}>No tenants yet. Add your first tenant!</p>
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
    color: '#8b5cf6'
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
    backgroundColor: '#8b5cf6',
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

export default AdminDashboard;
