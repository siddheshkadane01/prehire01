import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import CandidateLogin from './pages/candidate/Login';
import EmployerLogin from './pages/employer/Login';
import Register from './pages/Register';
import CandidateSignup from './pages/CandidateSignup';
import CandidateResumeUpload from './pages/CandidateResumeUpload';
import CandidateComplete from './pages/CandidateComplete';
import CandidateWelcome from './pages/CandidateWelcome';
import OTPLogin from './pages/OTPLogin';
import EmployerSignup from './pages/EmployerSignup';
import EmployerComplete from './pages/EmployerComplete';
import EmployerPasswordSignup from './pages/EmployerPasswordSignup';
import JobPosting from './pages/JobPosting';
import JobPostingEnhanced from './pages/JobPostingEnhanced';
import CandidateScreeningDashboard from './pages/CandidateScreeningDashboard';
import ProfileUnlock from './pages/ProfileUnlock';
import UnlockPrompt from './pages/UnlockPrompt';
import PaymentSuccess from './pages/PaymentSuccess';
import LinkedInSuccess from './pages/LinkedInSuccess';
import CandidateProfile from './pages/CandidateProfile';
import CandidateDashboardNew from './pages/CandidateDashboardNew';
import RecruiterDashboardNewUI from './pages/RecruiterDashboardNewUI';
import JobListing from './pages/JobListing';
import AddBalance from './pages/AddBalance';
import AddNewCard from './pages/AddNewCard';
import CandidateAddBalance from './pages/candidate/AddBalance';
import CandidateAddNewCard from './pages/candidate/AddNewCard';
import CandidatePaymentSuccess from './pages/candidate/PaymentSuccess';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OAuthCallback from './pages/OAuthCallback';
import { AuthProvider, useAuth } from './utils/AuthContext';
import CandidateEditProfile from './pages/CandidateEditProfile';
import CandidateUploadResume from './pages/CandidateUploadResume';
import AddPanelMember from './pages/AddPanelMember';
import PanelMemberConfirmation from './pages/PanelMemberConfirmation';
import AddProfiles from './pages/AddProfiles';
import ATSScoreUpload from './pages/ATSScoreUpload';
import ATSScoreResults from './pages/ATSScoreResults';
import CandidateATSScore from './pages/CandidateATSScore';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import TenantDashboard from './pages/tenant/TenantDashboard';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute - user:', user, 'loading:', loading, 'required role:', role);
  
  if (loading) return <div>Loading...</div>;
  if (!user) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" />;
  }
  if (role && user.role !== role) {
    console.log('User role mismatch. User role:', user.role, 'Required role:', role);
    return <Navigate to="/login" />;
  }
  
  console.log('ProtectedRoute - Access granted');
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/candidate/login" element={<CandidateLogin />} />
            <Route path="/employer/login" element={<EmployerLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Legacy routes for backward compatibility */}
            <Route path="/login" element={<CandidateLogin />} />
            <Route path="/employer-login" element={<EmployerLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/candidate-signup" element={<CandidateSignup />} />
            <Route path="/candidate/resume-upload" element={<CandidateResumeUpload />} />
            <Route path="/candidate/complete" element={<CandidateComplete />} />
            <Route path="/candidate/welcome" element={<CandidateWelcome />} />
            <Route path="/otp-login" element={<OTPLogin />} />
            <Route path="/employer-signup" element={<EmployerSignup />} />
            <Route path="/employer/complete" element={<EmployerComplete />} />
            <Route path="/employer/password-signup" element={<EmployerPasswordSignup />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Tenant Routes */}
            <Route 
              path="/tenant" 
              element={
                <ProtectedRoute role="tenant">
                  <TenantDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tenant/dashboard" 
              element={
                <ProtectedRoute role="tenant">
                  <TenantDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/job-posting" 
              element={
                <ProtectedRoute role="recruiter">
                  <JobPosting />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recruiter/jobs/new-enhanced" 
              element={
                <ProtectedRoute role="recruiter">
                  <JobPostingEnhanced />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recruiter/jobs/:jobId/screening" 
              element={
                <ProtectedRoute role="recruiter">
                  <CandidateScreeningDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/unlock-prompt" 
              element={
                <ProtectedRoute role="recruiter">
                  <UnlockPrompt />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile-unlock" 
              element={
                <ProtectedRoute role="recruiter">
                  <ProfileUnlock />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payment-success" 
              element={
                <ProtectedRoute role="recruiter">
                  <PaymentSuccess />
                </ProtectedRoute>
              } 
            />
            <Route path="/linkedin-success" element={<LinkedInSuccess />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route 
              path="/candidate/welcome" 
              element={
                <ProtectedRoute role="candidate">
                  <CandidateWelcome />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/candidate" 
              element={
                <ProtectedRoute role="candidate">
                  <CandidateDashboardNew />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/candidate/profile" 
              element={
                <ProtectedRoute role="candidate">
                  <CandidateProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/candidate/jobs" 
              element={
                <ProtectedRoute role="candidate">
                  <JobListing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recruiter" 
              element={
                <ProtectedRoute role="recruiter">
                  <RecruiterDashboardNewUI />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recruiter/add-panel-member"
              element={
                <ProtectedRoute role="recruiter">
                  <AddPanelMember />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/recruiter/panel-member-confirmation"
              element={
                <ProtectedRoute role="recruiter">
                  <PanelMemberConfirmation />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/recruiter/add-profiles"
              element={
                <ProtectedRoute role="recruiter">
                  <AddProfiles />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/recruiter/add-balance" 
              element={
                <ProtectedRoute role="recruiter">
                  <AddBalance />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recruiter/add-card"
              element={
                <ProtectedRoute role="recruiter">
                  <AddNewCard />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/candidate/add-balance" 
              element={
                <ProtectedRoute role="candidate">
                  <CandidateAddBalance />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/candidate/add-card"
              element={
                <ProtectedRoute role="candidate">
                  <CandidateAddNewCard />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/candidate/payment-success" 
              element={
                <ProtectedRoute role="candidate">
                  <CandidatePaymentSuccess />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/candidate/edit-profile"
              element={
                <ProtectedRoute role="candidate">
                  <CandidateEditProfile />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/candidate/upload-resume"
              element={
                <ProtectedRoute role="candidate">
                  <CandidateUploadResume />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/ats-score-upload"
              element={
                <ProtectedRoute role="candidate">
                  <ATSScoreUpload />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/ats-score-results"
              element={
                <ProtectedRoute role="candidate">
                  <ATSScoreResults />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/candidate/ats-score"
              element={
                <ProtectedRoute role="candidate">
                  <CandidateATSScore />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
