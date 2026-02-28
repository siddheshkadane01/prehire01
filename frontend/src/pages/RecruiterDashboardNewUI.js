import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../utils/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../utils/apiClient';
import NotificationBell from '../components/NotificationBell';

const RecruiterDashboardNewUI = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [panelMembers, setPanelMembers] = useState(user?.panelMembers || []);
  const [shortlistedProfiles, setShortlistedProfiles] = useState([]);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [shortlistError, setShortlistError] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Fetch latest profile (wallet + panel members) from backend
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(API_ENDPOINTS.RECRUITER.PROFILE, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const profile = response.data;
        if (profile.walletBalance !== undefined) {
          setWalletBalance(profile.walletBalance);
        }
        if (Array.isArray(profile.panelMembers)) {
          setPanelMembers(profile.panelMembers);
        }
        if (Array.isArray(profile.shortlistedProfiles)) {
          updateUser({
            walletBalance: profile.walletBalance,
            panelMembers: profile.panelMembers,
            shortlistedProfiles: profile.shortlistedProfiles
          });
        } else {
          updateUser({
            walletBalance: profile.walletBalance,
            panelMembers: profile.panelMembers
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        // Use user context as fallback
        if (user?.walletBalance !== undefined) {
          setWalletBalance(user.walletBalance);
        }
        if (Array.isArray(user?.panelMembers)) {
          setPanelMembers(user.panelMembers);
        }
      }
    };

    fetchProfile();
  }, [user, updateUser]);

  // Update wallet balance when user context changes (e.g., after balance update)
  useEffect(() => {
    if (user?.walletBalance !== undefined && walletBalance !== user.walletBalance) {
      setWalletBalance(user.walletBalance);
    }
  }, [user?.walletBalance]);

  // Update panel members when user context changes
  useEffect(() => {
    if (Array.isArray(user?.panelMembers)) {
      setPanelMembers(user.panelMembers);
    }
  }, [user?.panelMembers]);

  // Fetch shortlisted profiles for dashboard widget
  useEffect(() => {
    const fetchShortlistedProfiles = async () => {
      try {
        setShortlistLoading(true);
        const token = localStorage.getItem('token');
        const { data } = await axios.get(API_ENDPOINTS.RECRUITER.SHORTLISTED_PROFILES, {
          params: { onlyShortlisted: true },
          headers: { Authorization: `Bearer ${token}` }
        });
        setShortlistedProfiles(data.profiles || []);
        if (data.shortlistIds) {
          updateUser({ shortlistedProfiles: data.shortlistIds });
        }
        setShortlistError('');
      } catch (error) {
        console.error('Failed to fetch shortlisted profiles:', error);
        setShortlistError('Unable to load shortlisted profiles.');
        setShortlistedProfiles([]);
      } finally {
        setShortlistLoading(false);
      }
    };

    fetchShortlistedProfiles();
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/employer/login');
  };

  const CalendarCell = ({ day, active }) => (
    <div style={{
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      background: active ? '#E8F0FF' : 'transparent',
      color: '#111827',
      fontWeight: active ? 600 : 500
    }}>
      {day}
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div
          style={styles.brand}
          role="button"
          tabIndex={0}
          onClick={() => navigate('/recruiter')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/recruiter');
            }
          }}
        >
          PreHire
        </div>

        {/* Desktop Navigation */}
        <nav style={{ ...styles.nav, display: isMobile ? 'none' : 'flex' }}>
          <a style={styles.navLink} href="#">About Us</a>
          <a style={styles.navLink} href="#">Clients</a>
          <a style={styles.navLink} href="#">Pricing</a>
          <a style={styles.navLink} href="#">FAQ</a>
          <a style={styles.navLink} href="#">Contact Us</a>
        </nav>

        {/* Mobile Menu Button */}
        <button
          style={{ ...styles.mobileMenuBtn, display: isMobile ? 'block' : 'none' }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>About Us</a>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>Clients</a>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <a style={styles.mobileNavLink} href="#" onClick={() => setMobileMenuOpen(false)}>Contact Us</a>
          </div>
        )}

        <div style={styles.rightHeader}>
          <div style={{ marginRight: '12px' }}>
            <NotificationBell />
          </div>
          <FiSearch style={styles.icon} size={20} color="#374151" />
          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <div
              style={styles.avatar}
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setProfileMenuOpen(!profileMenuOpen);
                }
              }}
            >
              {user?.photo ? (
                <img src={user.photo} alt="avatar" style={styles.avatarImg} />
              ) : (
                <div style={styles.avatarFallback}>{user?.name?.[0] || 'R'}</div>
              )}
            </div>
            {profileMenuOpen && (
              <div style={styles.profileDropdown}>
                <div style={styles.profileDropdownHeader}>
                  <div style={styles.profileDropdownName}>{user?.name || 'Recruiter'}</div>
                  <div style={styles.profileDropdownEmail}>{user?.email || ''}</div>
                </div>
                <div style={styles.profileDropdownDivider}></div>
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

      <main style={{
        ...styles.main,
        padding: isMobile ? 10 : 16,
        marginTop: isMobile ? 60 : 70
      }}>
        {/* Quick Actions Bar */}
        <div style={{
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate('/recruiter/jobs/new-enhanced')}
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
              boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)',
              transition: 'transform 0.2s, boxShadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 8px rgba(99, 102, 241, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(99, 102, 241, 0.3)';
            }}
          >
            ✨ Post New Job (Enhanced)
          </button>
          <button
            onClick={() => navigate('/job-posting')}
            style={{
              background: '#fff',
              color: '#6366F1',
              border: '2px solid #6366F1',
              borderRadius: 8,
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
              transition: 'background 0.2s, color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#EEF2FF';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#fff';
            }}
          >
            📝 Quick Post Job
          </button>
        </div>

        <div style={{
          ...styles.gridTop,
          gridTemplateColumns: isMobile
            ? '1fr'
            : window.innerWidth <= 1024
              ? '1fr 1fr'
              : '1.2fr 1fr 0.7fr',
          gridTemplateRows: !isMobile && window.innerWidth <= 1024 ? 'auto auto' : 'auto',
          gap: isMobile ? 12 : 16
        }}>
          <div style={{
            ...styles.welcomeCard,
            gridColumn: !isMobile && window.innerWidth <= 1024 ? '1 / -1' : 'auto'
          }}>
            <div>
              <div style={styles.welcomeTitle}>Welcome back, {user?.name?.split(' ')[0] || 'Ritu'}!</div>
              <div style={styles.welcomeSub}>Ready to hire smarter?</div>
            </div>
            <div style={styles.chip}>
              <span style={styles.chipNum}>60</span>
              <span>Candidates Shortlisted</span>
            </div>
          </div>

          <div style={styles.calendarCard}>
            <div style={styles.cardHeaderRow}>
              <div style={styles.cardTitle}>Upcoming Schedule</div>
              <a href="#" style={styles.linkSm}>See all</a>
            </div>
            <div style={styles.calendarHeader}>Aug 2025</div>
            <div style={styles.calendarDaysRow}>S M T W T F S</div>
            <div style={styles.calendarGrid}>
              {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map((d) => (
                <CalendarCell key={d} day={d} active={[6, 13, 20, 24, 27].includes(d)} />
              ))}
            </div>
          </div>

          <div style={styles.interviewsCard}>
            <div style={styles.summaryItem}>
              <div style={styles.summaryIcon}>✔️</div>
              <div>
                <div style={styles.summaryNum}>39</div>
                <div style={styles.summaryLabel}>Completed</div>
              </div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryIcon}>🕒</div>
              <div>
                <div style={styles.summaryNum}>16</div>
                <div style={styles.summaryLabel}>Pending</div>
              </div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryIcon}>⭐</div>
              <div>
                <div style={styles.summaryNum}>3</div>
                <div style={styles.summaryLabel}>Pending Feedback</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          ...styles.gridBottom,
          gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
          gap: isMobile ? 12 : 16
        }}>
          <div style={styles.shortlistedCard}>
            <div style={styles.cardHeaderRow}>
              <div style={styles.cardTitle}>Shortlisted Profiles</div>
              <a
                href="#"
                style={styles.linkSm}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/recruiter/add-profiles');
                }}
              >
                See all
              </a>
            </div>
            <div>
              {shortlistLoading && (
                <div style={styles.emptyState}>Loading shortlisted profiles...</div>
              )}
              {shortlistError && (
                <div style={styles.errorText}>{shortlistError}</div>
              )}
              {!shortlistLoading && shortlistedProfiles.length === 0 && !shortlistError && (
                <div style={styles.emptyState}>No profile shortlisted</div>
              )}
              {!shortlistLoading && shortlistedProfiles.map((p, i) => (
                <div key={p.id || i} style={styles.shortRow}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span>{i + 1}. {p.name}</span>
                    <span style={{ color: '#6B7280' }}>{p.title || p.role}</span>
                  </div>
                  <a
                    href="#"
                    style={styles.linkXS}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/recruiter/add-profiles');
                    }}
                  >
                    View profile
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.panelCard}>
            <div style={styles.cardHeaderRow}>
              <div style={styles.cardTitle}>Panel Members</div>
              <button
                style={styles.addMoreBtn}
                onClick={() => navigate('/recruiter/add-panel-member')}
              >
                Add More +
              </button>
            </div>
            <div>
              {panelMembers.map((m, i) => (
                <div key={i} style={styles.panelRow}>
                  <span>{i + 1}. {m.name}</span>
                  <span style={{ color: '#6B7280' }}>{m.role}</span>
                  <a href="#" style={styles.linkXS}>Contact</a>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            ...styles.accountCard,
            gridColumn: isMobile ? 'auto' : '1 / -1'
          }}>
            <div style={styles.cardTitle}>Account Information</div>
            <div style={styles.accountRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>💳</span>
                <span>Balance : ₹ {(walletBalance !== undefined ? walletBalance : (user?.walletBalance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button onClick={() => window.location.href = '/recruiter/add-balance'} style={styles.addBalanceBtn}>Add Balance +</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid #E5E7EB',
    background: '#fff',
    zIndex: 1000,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  brand: {
    fontSize: 19,
    fontWeight: 700,
    color: '#7C3AED',
    cursor: 'pointer',
    userSelect: 'none'
  },
  nav: {
    gap: 24,
    alignItems: 'center'
  },
  mobileMenuBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#374151',
    padding: '8px'
  },
  mobileMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderTop: 'none',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 1001,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  mobileNavLink: {
    color: '#6B7280',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: 16,
    padding: '8px 0',
    borderBottom: '1px solid #F3F4F6',
    '&:last-child': {
      borderBottom: 'none'
    }
  },
  navLink: {
    color: '#6B7280',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: 14
  },
  rightHeader: {
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  },
  icon: {
    fontSize: 18,
    cursor: 'pointer'
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    overflow: 'hidden',
    background: '#E5E7EB',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    border: '2px solid transparent'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#374151',
    fontWeight: 600,
    fontSize: 16
  },
  profileDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    minWidth: 200,
    zIndex: 1000,
    overflow: 'hidden'
  },
  profileDropdownHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #F3F4F6'
  },
  profileDropdownName: {
    fontWeight: 600,
    color: '#111827',
    fontSize: 14,
    marginBottom: 4
  },
  profileDropdownEmail: {
    color: '#6B7280',
    fontSize: 12
  },
  profileDropdownDivider: {
    height: 1,
    background: '#F3F4F6'
  },
  profileDropdownItem: {
    width: '100%',
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: '#374151',
    fontSize: 14,
    transition: 'background 0.2s'
  },
  main: {
    padding: 16,
    marginTop: 70, // Account for fixed header
    maxWidth: 1400,
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxSizing: 'border-box'
  },
  gridTop: {
    display: 'grid',
    gap: 16,
    alignItems: 'stretch'
  },
  gridBottom: {
    display: 'grid',
    gap: 16,
    marginTop: 16
  },
  welcomeCard: {
    borderRadius: 12,
    padding: 20,
    background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827'
  },
  welcomeSub: {
    marginTop: 6,
    color: '#6B7280',
    fontWeight: 500
  },
  chip: {
    marginTop: 20,
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    color: '#374151',
    padding: '10px 14px',
    borderRadius: 22,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  chipNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    background: '#2563EB',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700
  },
  calendarCard: {
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 16
  },
  cardHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  cardTitle: {
    fontWeight: 700,
    color: '#111827'
  },
  linkSm: {
    color: '#2563EB',
    textDecoration: 'none',
    fontSize: 14
  },
  calendarHeader: {
    color: '#374151',
    marginTop: 6,
    marginBottom: 10
  },
  calendarDaysRow: {
    color: '#9CA3AF',
    fontSize: 12,
    letterSpacing: 1
  },
  calendarGrid: {
    marginTop: 8,
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 36px)',
    gap: 8
  },
  interviewsCard: {
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  summaryIcon: {
    fontSize: 18
  },
  summaryNum: {
    fontWeight: 700,
    color: '#2563EB'
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 14
  },
  shortlistedCard: {
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 16
  },
  shortRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #F3F4F6'
  },
  emptyState: {
    color: '#6B7280',
    fontSize: 14,
    padding: '8px 0'
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    padding: '8px 0'
  },
  linkXS: {
    color: '#2563EB',
    textDecoration: 'none',
    fontSize: 14
  },
  panelCard: {
    background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 16
  },
  panelRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr auto',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #EEF2FF'
  },
  addMoreBtn: {
    background: '#6366F1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600
  },
  accountCard: {
    gridColumn: '1 / -1',
    background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 16
  },
  accountRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12
  },
  addBalanceBtn: {
    background: '#6366F1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600
  }
};

export default RecruiterDashboardNewUI;
