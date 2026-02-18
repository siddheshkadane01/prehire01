import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';

const Navbar = () => {
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  );
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLoginDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header style={styles.header}>
      <Link to="/" style={styles.brand}>
        PreHire
      </Link>

      <nav style={{ ...styles.nav, display: isMobile ? 'none' : 'flex' }}>
        <a href="#" style={styles.navLink}>
          About Us
        </a>
        <a href="#" style={styles.navLink}>
          Clients
        </a>
        <a href="#" style={styles.navLink}>
          Pricing
        </a>
        <a href="#" style={styles.navLink}>
          FAQ
        </a>
        <a href="#" style={styles.navLink}>
          Contact Us
        </a>
        <div style={styles.loginDropdownContainer} ref={dropdownRef}>
          <button
            onClick={() => setShowLoginDropdown((prev) => !prev)}
            style={styles.loginButton}
          >
            Login <span style={styles.arrow}>▾</span>
          </button>
          {showLoginDropdown && (
            <div style={styles.loginDropdown}>
              <Link
                to="/candidate/login"
                style={styles.dropdownItem}
                onClick={() => setShowLoginDropdown(false)}
              >
                Candidate Login
              </Link>
              <Link
                to="/employer/login"
                style={styles.dropdownItem}
                onClick={() => setShowLoginDropdown(false)}
              >
                Employer Login
              </Link>
              <Link
                to="/admin/login"
                style={{ ...styles.dropdownItem, borderBottom: 'none' }}
                onClick={() => setShowLoginDropdown(false)}
              >
                Admin Login
              </Link>
            </div>
          )}
        </div>
      </nav>

      <button
        style={{ ...styles.mobileMenuBtn, display: isMobile ? 'block' : 'none' }}
        onClick={() => setMobileMenuOpen((prev) => !prev)}
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {mobileMenuOpen && (
        <div style={styles.mobileMenu}>
          <a style={styles.mobileNavLink} href="#" onClick={closeMobileMenu}>
            About Us
          </a>
          <a style={styles.mobileNavLink} href="#" onClick={closeMobileMenu}>
            Clients
          </a>
          <a style={styles.mobileNavLink} href="#" onClick={closeMobileMenu}>
            Pricing
          </a>
          <a style={styles.mobileNavLink} href="#" onClick={closeMobileMenu}>
            FAQ
          </a>
          <a style={styles.mobileNavLink} href="#" onClick={closeMobileMenu}>
            Contact Us
          </a>
          <Link
            to="/candidate/login"
            style={styles.mobileNavLink}
            onClick={closeMobileMenu}
          >
            Candidate Login
          </Link>
          <Link
            to="/employer/login"
            style={styles.mobileNavLink}
            onClick={closeMobileMenu}
          >
            Employer Login
          </Link>
          <Link
            to="/admin/login"
            style={styles.mobileNavLink}
            onClick={closeMobileMenu}
          >
            Admin Login
          </Link>
        </div>
      )}
    </header>
  );
};

const styles = {
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
    fontSize: 22,
    fontWeight: 700,
    color: '#7C3AED',
    textDecoration: 'none'
  },
  nav: {
    gap: 24,
    alignItems: 'center'
  },
  navLink: {
    color: '#6B7280',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: 14
  },
  loginDropdownContainer: {
    position: 'relative'
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '25px',
    fontSize: '0.95rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: 'none',
    cursor: 'pointer'
  },
  arrow: {
    fontSize: '1rem'
  },
  loginDropdown: {
    position: 'absolute',
    top: '100%',
    right: '0',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    minWidth: '160px',
    marginTop: '0.5rem'
  },
  dropdownItem: {
    display: 'block',
    padding: '0.75rem 1rem',
    textDecoration: 'none',
    color: '#374151',
    fontSize: '0.95rem',
    borderBottom: '1px solid #F3F4F6',
    transition: 'background-color 0.2s'
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
    borderBottom: '1px solid #F3F4F6'
  }
};

export default Navbar;
