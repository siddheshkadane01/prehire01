import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import Navbar from '../../components/common/Navbar';

const EmployerLogin = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      const user = JSON.parse(localStorage.getItem('user'));
      console.log('Employer login successful, user:', user);
      if (user.role === 'recruiter') {
        // Force a page reload to ensure proper authentication state
        window.location.href = '/recruiter';
      } else if (user.role === 'tenant') {
        // Redirect tenants to their dashboard
        window.location.href = '/tenant/dashboard';
      } else {
        setError('Access denied. Employer/Tenant login only.');
      }
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={styles.container}>
      <Navbar />

      <main style={{
        ...styles.main,
        padding: isMobile ? '2rem 1rem' : '4rem 3rem',
        marginTop: isMobile ? 70 : 80
      }}>
        <div style={styles.content}>
          <h1 style={styles.title}>Welcome Back!</h1>
          <p style={styles.subtitle}>Find your next perfect hire today!</p>

          
          {error && <div style={styles.error}>{error}</div>}
          
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email*</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Password*</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Logging in...' : 'Submit'}
            </button>
          </form>
          
          <div style={styles.links}>
            <Link to="/candidate/login" style={styles.passwordLink}>Candidate Login</Link>
            <Link to="/forgot-password" style={styles.passwordLink}>Forgot Password?</Link>
          </div>
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
  main: {
    padding: '4rem 3rem',
    display: 'flex',
    justifyContent: 'center',
    marginTop: 80
  },
  content: {
    maxWidth: '400px',
    textAlign: 'center'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#6B7280',
    marginBottom: '2rem'
  },
  form: {
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'left',
    marginBottom: '1rem'
  },
  field: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.95rem',
    color: '#6B7280',
    marginBottom: '0.5rem',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: 'none',
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  error: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  links: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: '#6B7280'
  },
  passwordLink: {
    color: '#3B82F6',
    textDecoration: 'none'
  }
};

export default EmployerLogin;
