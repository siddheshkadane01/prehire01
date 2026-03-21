import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../utils/AuthContext';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiBell, FiSearch, FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import { API_ENDPOINTS } from '../utils/apiClient';

const CandidateEditProfile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showNotification, setShowNotification] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const notificationRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedIn: '',
    github: '',
    languages: '',
    location: '',
    currentRole: '',
    experience: '',
    skills: '',
    education: '',
    experienceYears: '',
    summary: ''
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        
        const res = await axios.get(API_ENDPOINTS.CANDIDATE.PROFILE, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const p = res.data || {};
        const currentUser = JSON.parse(localStorage.getItem('user')) || user;
        
        setForm({
          firstName: p.firstName || p.name?.split(' ')[0] || '',
          lastName: p.lastName || p.name?.split(' ').slice(1).join(' ') || '',
          email: p.email || currentUser?.email || '',
          phone: p.phone || '',
          linkedIn: p.linkedIn || '',
          github: p.github || '',
          languages: (p.languages || []).join(', '),
          location: p.location || '',
          currentRole: p.currentRole || '',
          experience: p.experience || '',
          skills: (p.skills || []).join(', '),
          education: p.education || '',
          experienceYears: p.experienceYears ? String(p.experienceYears) : '',
          summary: p.summary || ''
        });
        
        if (p.walletBalance !== undefined && updateUser) {
          updateUser({ walletBalance: p.walletBalance });
        }
      } catch (err) {
        console.error('Failed to load profile', err);
        alert('Failed to load profile. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []); // Only run once on mount

  // Refresh profile when navigating to this page (e.g., after resume upload)
  useEffect(() => {
    // Reload profile data when location state indicates refresh
    if (location.state?.refresh) {
      const loadProfile = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          
          const res = await axios.get(API_ENDPOINTS.CANDIDATE.PROFILE, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const p = res.data || {};
          const currentUser = JSON.parse(localStorage.getItem('user')) || user;
          
          setForm({
            firstName: p.firstName || p.name?.split(' ')[0] || '',
            lastName: p.lastName || p.name?.split(' ').slice(1).join(' ') || '',
            email: p.email || currentUser?.email || '',
            phone: p.phone || '',
            linkedIn: p.linkedIn || '',
            github: p.github || '',
            languages: (p.languages || []).join(', '),
            location: p.location || '',
            currentRole: p.currentRole || '',
            experience: p.experience || '',
            skills: (p.skills || []).join(', '),
            education: p.education || '',
            experienceYears: p.experienceYears ? String(p.experienceYears) : '',
            summary: p.summary || ''
          });
          
          if (p.walletBalance !== undefined && updateUser) {
            updateUser({ walletBalance: p.walletBalance });
          }
          
          // Clear the refresh flag
          window.history.replaceState({}, document.title, location.pathname);
        } catch (err) {
          console.error('Failed to refresh profile', err);
        }
      };
      
      loadProfile();
    }
  }, [location.state?.refresh]); // Only depend on the refresh flag

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  useEffect(() => {
    const handleClickOutsideNotification = (e) => {
      if (showNotification && notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotification(false);
      }
    };
    if (showNotification) document.addEventListener('mousedown', handleClickOutsideNotification);
    return () => document.removeEventListener('mousedown', handleClickOutsideNotification);
  }, [showNotification]);

  const onChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const fullName = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
      const payload = {
        name: fullName || user?.name || '',
        email: form.email,
        phone: form.phone,
        linkedIn: form.linkedIn,
        github: form.github,
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
        location: form.location,
        currentRole: form.currentRole,
        experience: form.experience,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        education: form.education,
        experienceYears: Number(form.experienceYears || 0),
        summary: form.summary
      };
      const res = await axios.put(API_ENDPOINTS.CANDIDATE.UPDATE_PROFILE, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.walletBalance !== undefined) updateUser({ walletBalance: res.data.walletBalance });
      navigate('/candidate');
    } catch (err) {
      console.error('Failed to save profile', err);
      alert('Failed to save profile. See console.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/candidate/login');
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;

  const displayName = `${form.firstName || user?.name || 'User'}${form.lastName ? ' ' + form.lastName : ''}`;

  return (
    <div style={styles.container}>
      <header style={{ ...styles.header, padding: isMobile ? '12px 16px' : '16px 32px' }}>
        <div style={styles.brand}>PreHire</div>

        <nav style={{ ...styles.nav, display: isMobile ? 'none' : 'flex' }}>
          <a style={styles.navLink} href="#">About Us</a>
          <a style={styles.navLink} href="#">Clients</a>
          <a style={styles.navLink} href="#">Pricing</a>
          <a style={styles.navLink} href="#">FAQ</a>
          <a style={styles.navLink} href="#">Contact Us</a>
        </nav>

        <button style={{ ...styles.mobileMenuBtn, display: isMobile ? 'block' : 'none' }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>About Us</a>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>Clients</a>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>Contact Us</a>
          </div>
        )}

        <div style={{ ...styles.rightHeader, display: isMobile ? 'none' : 'flex' }}>
          <div style={{ position: 'relative' }} ref={notificationRef}>
            <button onClick={() => setShowNotification(prev => !prev)} style={styles.bellBtn} aria-label="Toggle notifications">
              <FiBell style={styles.icon} size={20} color="#374151" />
              <div style={styles.notificationDot}></div>
            </button>

            {showNotification && (
              <div style={styles.notificationPopup} role="dialog" aria-label="Notifications">
                <div style={styles.notificationPopupHeader}>
                  <div style={{ fontWeight: 600 }}>Notifications</div>
                  <button onClick={() => setShowNotification(false)} style={styles.closeBtn} aria-label="Close notifications">
                    <FiX size={16} />
                  </button>
                </div>
                <div style={styles.notificationPopupBody}>
                  <div style={{ fontSize: 14, color: '#111827' }}>
                    You've been shortlisted for UX Designer Role at IMB.
                  </div>
                </div>
              </div>
            )}
          </div>

          <FiSearch style={styles.icon} size={20} color="#374151" />

          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <div
              style={styles.avatar}
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              role="button"
              tabIndex={0}
            >
              <div style={styles.avatarFallback}>{(displayName || 'U').charAt(0).toUpperCase()}</div>
            </div>

            {profileMenuOpen && (
              <div style={styles.profileDropdown}>
                <div style={styles.profileDropdownHeader}>
                  <div style={styles.profileDropdownName}>{displayName}</div>
                  <div style={styles.profileDropdownEmail}>{form.email || user?.email || ''}</div>
                </div>
                <div style={styles.profileDropdownDivider}></div>

                <button style={styles.profileDropdownItem} onClick={() => { navigate('/candidate/edit-profile'); setProfileMenuOpen(false); }}>
                  Edit user profile
                </button>

                <button
                  style={styles.profileDropdownItem}
                  onClick={handleLogout}
                  onMouseEnter={(e) => e.target.style.background = '#F9FAFB'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                >
                  <FiLogOut style={{ marginRight: 8 }} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ height: isMobile ? 80 : 88 }} />

      <main style={styles.mainContainer}>
        <h2 style={styles.title}>My profile</h2>
        
        {location.state?.refresh && (
          <div style={styles.infoBanner}>
            ✓ Your profile has been updated with information from your resume
          </div>
        )}

        <section style={styles.card}>
          <div style={styles.profileRow}>
            <div style={styles.avatarCircle}>{(displayName || 'U').charAt(0).toUpperCase()}</div>
            <div style={{ marginLeft: 16 }}>
              <div style={styles.name}>{displayName}</div>
              <div style={styles.role}>{form.currentRole || 'Candidate'}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button style={styles.editPill}>Edit ✎</button>
            </div>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Personal Information</div>
            <div>
              <button style={styles.editPill}>Edit ✎</button>
            </div>
          </div>

          <form onSubmit={onSubmit} style={styles.formGrid}>
            <label style={styles.field}>
              <div style={styles.label}>First Name</div>
              <input value={form.firstName} onChange={onChange('firstName')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>Last Name</div>
              <input value={form.lastName} onChange={onChange('lastName')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>Email address</div>
              <input value={form.email} onChange={onChange('email')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>Phone Number</div>
              <input value={form.phone} onChange={onChange('phone')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>LinkedIn URL</div>
              <input value={form.linkedIn} onChange={onChange('linkedIn')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>GitHub URL</div>
              <input value={form.github} onChange={onChange('github')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>Languages</div>
              <input value={form.languages} onChange={onChange('languages')} placeholder="comma separated" style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>Location</div>
              <input value={form.location} onChange={onChange('location')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>Current Role</div>
              <input value={form.currentRole} onChange={onChange('currentRole')} style={styles.input} />
            </label>

            <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
              <div style={styles.label}>Experience Summary</div>
              <textarea
                value={form.experience}
                onChange={onChange('experience')}
                rows={4}
                style={styles.textarea}
                placeholder="Share a quick summary about your experience and impact"
              />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>Skills</div>
              <input value={form.skills} onChange={onChange('skills')} placeholder="comma separated" style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>Education</div>
              <input value={form.education} onChange={onChange('education')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <div style={styles.label}>Experience Years</div>
              <input value={form.experienceYears} onChange={onChange('experienceYears')} style={styles.input} />
            </label>

            <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
              <div style={styles.label}>Summary</div>
              <textarea
                value={form.summary}
                onChange={onChange('summary')}
                rows={3}
                style={styles.textarea}
                placeholder="Professional summary or objective"
              />
            </label>

            {/* small button to go to upload resume page */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginTop: 6 }}>
              <button type="button" onClick={() => navigate('/candidate/upload-resume')} style={styles.smallBtn}>
                Add Resume
              </button>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
              <button type="submit" disabled={saving} style={styles.submitBtn}>
                {saving ? 'Saving...' : 'Submit'}
              </button>
            </div>

          <div style={{ gridColumn: '1 / -1', marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/candidate/ats-score')}
              style={styles.smallBtn}
            >
              Check ATS Score
            </button>
          </div>

            <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: 12 }}>
              <a href="/candidate" style={styles.backLink}>Back to Dashboard</a>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  header: { position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid #E5E7EB', background: '#fff', zIndex: 1000, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 64 },
  brand: { fontSize: 22, fontWeight: 700, color: '#7C3AED' },
  nav: { gap: 24, alignItems: 'center' },
  navLink: { color: '#6B7280', textDecoration: 'none', fontWeight: 500, fontSize: 14 },
  mobileMenuBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: '8px' },
  mobileMenu: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E5E7EB', borderTop: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1001, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  mobileNavLink: { color: '#6B7280', textDecoration: 'none', fontWeight: 500, fontSize: 16, padding: '8px 0', borderBottom: '1px solid #F3F4F6' },
  rightHeader: { display: 'flex', gap: 12, alignItems: 'center' },
  bellBtn: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18, cursor: 'pointer' },
  notificationDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff' },
  notificationPopup: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, maxWidth: '90vw', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 10px 20px rgba(2,6,23,0.2)', zIndex: 1200, overflow: 'hidden' },
  notificationPopupHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #F3F4F6' },
  notificationPopupBody: { padding: 12 },
  avatar: { width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#E5E7EB', cursor: 'pointer', transition: 'opacity 0.2s', border: '2px solid transparent' },
  avatarFallback: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontWeight: 600, fontSize: 16 },
  profileDropdown: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.08)', minWidth: 200, zIndex: 1000, overflow: 'hidden' },
  profileDropdownHeader: { padding: '12px 16px', borderBottom: '1px solid #F3F4F6' },
  profileDropdownName: { fontWeight: 600, color: '#111827', fontSize: 14, marginBottom: 4 },
  profileDropdownEmail: { color: '#6B7280', fontSize: 12 },
  profileDropdownDivider: { height: 1, background: '#F3F4F6' },
  profileDropdownItem: { width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#374151', fontSize: 14, transition: 'background 0.2s' },

  mainContainer: { maxWidth: 980, margin: '0 auto', padding: '16px' },
  title: { textAlign: 'center', margin: '8px 0 20px', fontSize: 22, color: '#111827' },
  card: { borderRadius: 8, border: '1px solid #E5E7EB', padding: 20, marginBottom: 18, background: '#fff' },
  profileRow: { display: 'flex', alignItems: 'center' },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 },
  name: { fontWeight: 700, fontSize: 18 },
  role: { color: '#6B7280', marginTop: 4 },
  editPill: { background: 'none', border: '1px solid #E5E7EB', padding: '8px 12px', borderRadius: 16, cursor: 'pointer' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 700 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  input: { height: 36, borderRadius: 6, border: '1px solid #F3F4F6', padding: '6px 10px', background: '#F8FAFB' },
  textarea: { borderRadius: 6, border: '1px solid #F3F4F6', padding: '8px 10px', background: '#F8FAFB', fontFamily: 'inherit', minHeight: 90, resize: 'vertical' },
  smallBtn: { background: 'none', border: '1px solid #E5E7EB', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' },
  submitBtn: { width: '100%', background: '#3B82F6', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
  backLink: { color: '#3B82F6', textDecoration: 'none' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  infoBanner: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center'
  }
};

export default CandidateEditProfile;
