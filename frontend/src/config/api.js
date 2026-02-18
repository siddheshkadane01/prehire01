// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  
  // Auth
  AUTH: {
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`
  },
  
  // Admin
  ADMIN: {
    STATS: `${API_BASE_URL}/api/admin/stats`,
    TENANTS: `${API_BASE_URL}/api/admin/tenants`,
    TENANT: (id) => `${API_BASE_URL}/api/admin/tenants/${id}`,
    COMPANIES: `${API_BASE_URL}/api/admin/companies`,
    COMPANY: (id) => `${API_BASE_URL}/api/admin/companies/${id}`
  },
  
  // Tenant
  TENANT: {
    DASHBOARD: `${API_BASE_URL}/api/tenant/dashboard`,
    COMPANY: `${API_BASE_URL}/api/tenant/company`,
    RECRUITERS: `${API_BASE_URL}/api/tenant/recruiters`,
    RECRUITER: (id) => `${API_BASE_URL}/api/tenant/recruiters/${id}`,
    JOBS: `${API_BASE_URL}/api/tenant/jobs`
  },
  
  // Candidate
  CANDIDATE: {
    PROFILE: `${API_BASE_URL}/api/candidate/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/candidate/profile`,
    RESUME_DATA: `${API_BASE_URL}/api/candidate/resume-data`,
    ATS_SCORE: `${API_BASE_URL}/api/candidate/ats-score`,
    WALLET_BALANCE: `${API_BASE_URL}/api/candidate/wallet-balance`
  },
  
  // Recruiter
  RECRUITER: {
    PROFILE: `${API_BASE_URL}/api/recruiter/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/recruiter/profile`,
    CANDIDATES: `${API_BASE_URL}/api/recruiter/candidates`,
    SEARCH: `${API_BASE_URL}/api/recruiter/search`,
    UNLOCK_PROFILE: (candidateId) => `${API_BASE_URL}/api/recruiter/unlock-profile/${candidateId}`,
    WALLET_BALANCE: `${API_BASE_URL}/api/recruiter/wallet-balance`
  },
  
  // Jobs
  JOBS: {
    LIST: `${API_BASE_URL}/api/jobs`,
    CREATE: `${API_BASE_URL}/api/jobs`,
    GET: (id) => `${API_BASE_URL}/api/jobs/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/api/jobs/${id}`,
    DELETE: (id) => `${API_BASE_URL}/api/jobs/${id}`,
    APPLY: (id) => `${API_BASE_URL}/api/jobs/${id}/apply`,
    MATCHES: (id) => `${API_BASE_URL}/api/jobs/${id}/matches`,
    UPDATE_APPLICATION: (jobId, applicationId) => `${API_BASE_URL}/api/jobs/${jobId}/applications/${applicationId}`
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/api/notifications`,
    MARK_READ: (id) => `${API_BASE_URL}/api/notifications/${id}/read`,
    MARK_ALL_READ: `${API_BASE_URL}/api/notifications/read-all`,
    DELETE: (id) => `${API_BASE_URL}/api/notifications/${id}`
  },
  
  // Upload
  UPLOAD: {
    RESUME: `${API_BASE_URL}/api/upload/resume`,
    PHOTO: `${API_BASE_URL}/api/upload/photo`
  },
  
  // AI Service
  AI: {
    PARSE_RESUME: `${AI_SERVICE_URL}/api/parse-resume`,
    PARSE_RESUME_FILE: `${AI_SERVICE_URL}/api/parse-resume-file`
  }
};

export default API_ENDPOINTS;
