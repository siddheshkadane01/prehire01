import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import axios from 'axios';
import API_ENDPOINTS from '../config/api';

const JobPostingEnhanced = () => {
  const [step, setStep] = useState(1);
  const [jobId, setJobId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workplaceType: 'hybrid',
    location: '',
    numberOfPositions: 1,
    numberOfRounds: 3,
    requirements: {
      skills: [],
      experienceYears: { min: '', max: '' },
      education: []
    },
    salaryRange: { min: '', max: '', currency: 'INR' }
  });
  const [jdFile, setJdFile] = useState(null);
  const [jdUploaded, setJdUploaded] = useState(false);
  const [jdPreview, setJdPreview] = useState('');
  const [hiringTeam, setHiringTeam] = useState({
    hiringManager: { userId: '', name: '', email: '' },
    interviewPanel: [],
    hrContact: { userId: '', name: '', email: '' }
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [suggestedCandidates, setSuggestedCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch company team members (recruiters, tenants)
      const response = await axios.get(`${API_ENDPOINTS.BASE_URL}/api/jobs/team-members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.teamMembers) {
        setTeamMembers(response.data.teamMembers);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const parts = name.split('.');
      setFormData(prev => {
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleJdUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setJdFile(file);
      setJdUploaded(false); // Reset upload status when new file is selected
      setError('');
    }
  };

  const addPanelMember = () => {
    setHiringTeam(prev => ({
      ...prev,
      interviewPanel: [...prev.interviewPanel, { userId: '', name: '', email: '', role: '', round: 1 }]
    }));
  };

  const updatePanelMember = (index, field, value) => {
    setHiringTeam(prev => {
      const newPanel = [...prev.interviewPanel];
      newPanel[index] = { ...newPanel[index], [field]: value };
      return { ...prev, interviewPanel: newPanel };
    });
  };

  const removePanelMember = (index) => {
    setHiringTeam(prev => ({
      ...prev,
      interviewPanel: prev.interviewPanel.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitBasicInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Clean salary range - remove empty values
      const cleanSalaryRange = {};
      if (formData.salaryRange.min) cleanSalaryRange.min = Number(formData.salaryRange.min);
      if (formData.salaryRange.max) cleanSalaryRange.max = Number(formData.salaryRange.max);
      if (formData.salaryRange.currency) cleanSalaryRange.currency = formData.salaryRange.currency;
      
      // Clean requirements - remove empty values
      const cleanRequirements = {
        skills: formData.requirements.skills || [],
        education: formData.requirements.education || []
      };
      if (formData.requirements.experienceYears?.min) {
        cleanRequirements.experienceYears = { min: Number(formData.requirements.experienceYears.min) };
      }
      if (formData.requirements.experienceYears?.max) {
        cleanRequirements.experienceYears = cleanRequirements.experienceYears || {};
        cleanRequirements.experienceYears.max = Number(formData.requirements.experienceYears.max);
      }
      
      const jobData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        workplaceType: formData.workplaceType,
        numberOfPositions: formData.numberOfPositions,
        numberOfRounds: formData.numberOfRounds,
        requirements: cleanRequirements,
        salaryRange: Object.keys(cleanSalaryRange).length > 0 ? cleanSalaryRange : undefined,
        status: 'draft'
      };

      const response = await axios.post(`${API_ENDPOINTS.BASE_URL}/api/jobs`, jobData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setJobId(response.data.job._id);
        setStep(2);
      }
    } catch (err) {
      console.error('Job creation error:', err.response?.data);
      const errorMsg = err.response?.data?.errors 
        ? err.response.data.errors.map(e => e.msg).join(', ')
        : err.response?.data?.message || 'Failed to create job';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadJd = async () => {
    if (!jdFile || !jobId) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('jd', jdFile);

      const response = await axios.post(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}/upload-jd`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setJdPreview(response.data.extractedText);
        
        // Check if text was actually extracted
        if (response.data.textExtracted === false || !response.data.extractedText || response.data.extractedText.trim().length === 0) {
          setError('⚠️ PDF uploaded but text extraction failed. This PDF might be image-based. You can either:\n1. Upload a text-based PDF\n2. Click "Use Job Description" below to use the description from Step 1');
          setJdUploaded(false);
        } else {
          setJdUploaded(true);
          setStep(3);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload JD');
    } finally {
      setLoading(false);
    }
  };

  const handleUseJobDescription = async () => {
    if (!jobId) return;
    
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      // Update job with description as extractedText
      const response = await axios.put(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}/set-jd-text`,
        {
          jdText: formData.description
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setJdUploaded(true);
        setError('');
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save job description');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeam = async () => {
    if (!jobId) return;
    
    if (!jdUploaded) {
      setError('Please upload JD before proceeding');
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}/hiring-team`,
        hiringTeam,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign team');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestCandidates = async () => {
    if (!jobId) return;
    
    if (!jdUploaded) {
      setError('Please upload JD first before finding candidates');
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}/suggest-candidates`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuggestedCandidates(response.data.suggestions || []);
        setStep(5);
      }
    } catch (err) {
      const errorData = err.response?.data;
      let errorMessage = errorData?.message || 'Failed to get suggestions';
      
      // If it's a JD-related error, provide more context
      if (errorData?.debug) {
        console.log('JD Debug Info:', errorData.debug);
        if (!errorData.debug.hasExtractedText || errorData.debug.textLength === 0) {
          errorMessage += '\n\n⚠️ The PDF text could not be extracted. Please upload a text-based PDF (not scanned/image-based).';
          setJdUploaded(false);
          setStep(2); // Go back to upload step
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_ENDPOINTS.BASE_URL}/api/jobs/${jobId}`,
        { status: 'active' },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Job published successfully!');
      navigate('/recruiter');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish job');
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>PreHire</div>
        <div style={styles.stepper}>
          <div style={step >= 1 ? styles.stepActive : styles.step}>1. Basic Info</div>
          <div style={step >= 2 ? styles.stepActive : styles.step}>2. Upload JD</div>
          <div style={step >= 3 ? styles.stepActive : styles.step}>3. Hiring Team</div>
          <div style={step >= 4 ? styles.stepActive : styles.step}>4. AI Match</div>
          <div style={step >= 5 ? styles.stepActive : styles.step}>5. Publish</div>
        </div>
      </header>

      <main style={styles.main}>
        {error && <div style={styles.error}>{error}</div>}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <form onSubmit={handleSubmitBasicInfo} style={styles.form}>
            <h2 style={styles.sectionTitle}>Basic Job Information</h2>

            <div style={styles.field}>
              <label style={styles.label}>Job Title*</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Description*</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                style={{ ...styles.input, minHeight: '100px' }}
                required
              />
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Location*</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Workplace Type*</label>
                <select
                  name="workplaceType"
                  value={formData.workplaceType}
                  onChange={handleChange}
                  style={styles.input}
                  required
                >
                  <option value="remote">Remote</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Number of Positions*</label>
                <input
                  type="number"
                  name="numberOfPositions"
                  value={formData.numberOfPositions}
                  onChange={handleChange}
                  style={styles.input}
                  min="1"
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Interview Rounds*</label>
                <input
                  type="number"
                  name="numberOfRounds"
                  value={formData.numberOfRounds}
                  onChange={handleChange}
                  style={styles.input}
                  min="1"
                  max="10"
                  required
                />
              </div>
            </div>

            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? 'Creating...' : 'Next: Upload JD'}
            </button>
          </form>
        )}

        {/* Step 2: Upload JD */}
        {step === 2 && (
          <div style={styles.form}>
            <h2 style={styles.sectionTitle}>Upload Job Description (PDF)</h2>
            
            {jdUploaded && (
              <div style={{ background: '#D1FAE5', padding: '12px', borderRadius: '8px', marginBottom: '16px', color: '#065F46' }}>
                ✓ JD uploaded successfully
              </div>
            )}
            
            <div style={styles.uploadZone}>
              <input
                type="file"
                accept=".pdf"
                onChange={handleJdUpload}
                style={styles.fileInput}
                id="jd-upload"
              />
              <label htmlFor="jd-upload" style={styles.uploadLabel}>
                {jdFile ? jdFile.name : 'Click to upload JD PDF (Max 10MB)'}
              </label>
            </div>

            <div style={styles.buttonRow}>
              <button onClick={() => setStep(1)} style={styles.secondaryButton}>
                Back
              </button>
              <button
                onClick={handleUseJobDescription}
                style={{ ...styles.secondaryButton, marginLeft: '8px' }}
                disabled={loading}
                title="Use job description from Step 1 as JD for AI matching"
              >
                Use Job Description
              </button>
              <button
                onClick={handleUploadJd}
                style={styles.primaryButton}
                disabled={!jdFile || loading}
              >
                {loading ? 'Uploading...' : jdUploaded ? 'Next: Assign Team' : 'Upload & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Hiring Team */}
        {step === 3 && (
          <div style={styles.form}>
            {!jdUploaded && (
              <div style={{ background: '#FEF3C7', padding: '12px', borderRadius: '8px', marginBottom: '16px', color: '#92400E' }}>
                ⚠️ JD not uploaded. Please go back and upload JD first.
              </div>
            )}
            <h2 style={styles.sectionTitle}>Assign Hiring Team</h2>

            <div style={styles.field}>
              <label style={styles.label}>Hiring Manager</label>
              <select
                value={hiringTeam.hiringManager.userId}
                onChange={(e) => {
                  const member = teamMembers.find(m => m._id === e.target.value);
                  setHiringTeam(prev => ({
                    ...prev,
                    hiringManager: member ? {
                      userId: member._id,
                      name: member.name,
                      email: member.email
                    } : { userId: '', name: '', email: '' }
                  }));
                }}
                style={styles.input}
              >
                <option value="">Select Hiring Manager</option>
                {teamMembers.map(member => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Interview Panel</label>
              {hiringTeam.interviewPanel.map((panelist, index) => (
                <div key={index} style={styles.panelRow}>
                  <select
                    value={panelist.userId}
                    onChange={(e) => {
                      const member = teamMembers.find(m => m._id === e.target.value);
                      if (member) {
                        updatePanelMember(index, 'userId', member._id);
                        updatePanelMember(index, 'name', member.name);
                        updatePanelMember(index, 'email', member.email);
                      }
                    }}
                    style={{ ...styles.input, flex: 2 }}
                  >
                    <option value="">Select Panelist</option>
                    {teamMembers.map(member => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Role (e.g., Technical)"
                    value={panelist.role}
                    onChange={(e) => updatePanelMember(index, 'role', e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <input
                    type="number"
                    placeholder="Round"
                    value={panelist.round}
                    onChange={(e) => updatePanelMember(index, 'round', parseInt(e.target.value))}
                    style={{ ...styles.input, width: '80px' }}
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => removePanelMember(index)}
                    style={styles.removeButton}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" onClick={addPanelMember} style={styles.addButton}>
                + Add Panel Member
              </button>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>HR Contact</label>
              <select
                value={hiringTeam.hrContact.userId}
                onChange={(e) => {
                  const member = teamMembers.find(m => m._id === e.target.value);
                  setHiringTeam(prev => ({
                    ...prev,
                    hrContact: member ? {
                      userId: member._id,
                      name: member.name,
                      email: member.email
                    } : { userId: '', name: '', email: '' }
                  }));
                }}
                style={styles.input}
              >
                <option value="">Select HR Contact</option>
                {teamMembers.map(member => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.buttonRow}>
              <button onClick={() => setStep(2)} style={styles.secondaryButton}>
                Back
              </button>
              <button onClick={handleAssignTeam} style={styles.primaryButton} disabled={loading || !jdUploaded}>
                {loading ? 'Saving...' : 'Next: Find Candidates'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: AI Candidate Matching */}
        {step === 4 && (
          <div style={styles.form}>
            {!jdUploaded && (
              <div style={{ background: '#FEE2E2', padding: '12px', borderRadius: '8px', marginBottom: '16px', color: '#991B1B' }}>
                ❌ JD not uploaded. AI matching requires JD text. Please go back and upload JD.
              </div>
            )}
            <h2 style={styles.sectionTitle}>AI Candidate Matching</h2>
            <p style={styles.subtitle}>
              Our AI will analyze the JD and suggest best-matching candidates from our database
            </p>

            <button onClick={handleSuggestCandidates} style={styles.primaryButton} disabled={loading || !jdUploaded}>
              {loading ? 'Analyzing...' : 'Find Matching Candidates'}
            </button>

            <button onClick={() => setStep(3)} style={styles.secondaryButton}>
              Back
            </button>
          </div>
        )}

        {/* Step 5: Review & Publish */}
        {step === 5 && (
          <div style={styles.form}>
            <h2 style={styles.sectionTitle}>Suggested Candidates</h2>
            <p style={styles.infoText}>
              Found {suggestedCandidates.length} matching candidates. They will see this job when published.
            </p>

            <div style={styles.candidatesList}>
              {suggestedCandidates.slice(0, 10).map((candidate, index) => (
                <div key={index} style={styles.candidateCard}>
                  <div style={styles.candidateName}>{candidate.name}</div>
                  <div style={styles.candidateInfo}>
                    {candidate.experience}+ years | {candidate.skills?.slice(0, 3).join(', ')}
                  </div>
                  <div style={styles.matchScore}>
                    Match: {Math.round(candidate.matchScore)}%
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.buttonRow}>
              <button onClick={() => setStep(4)} style={styles.secondaryButton}>
                Back
              </button>
              <button onClick={handlePublish} style={styles.successButton}>
                Publish Job & Notify Candidates
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  },
  header: {
    padding: '20px 40px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#6366f1'
  },
  stepper: {
    display: 'flex',
    gap: '20px'
  },
  step: {
    padding: '8px 16px',
    borderRadius: '20px',
    backgroundColor: '#f0f0f0',
    color: '#666',
    fontSize: '14px'
  },
  stepActive: {
    padding: '8px 16px',
    borderRadius: '20px',
    backgroundColor: '#6366f1',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500'
  },
  main: {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '0 20px'
  },
  form: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '28px',
    marginBottom: '10px',
    color: '#1a1a1a'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px'
  },
  field: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  uploadZone: {
    border: '2px dashed #6366f1',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    marginBottom: '24px',
    cursor: 'pointer',
    backgroundColor: '#f8f9ff'
  },
  fileInput: {
    display: 'none'
  },
  uploadLabel: {
    cursor: 'pointer',
    color: '#6366f1',
    fontSize: '16px',
    fontWeight: '500'
  },
  panelRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '12px',
    alignItems: 'center'
  },
  removeButton: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  addButton: {
    backgroundColor: '#f0f0f0',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6366f1',
    fontWeight: '500'
  },
  buttonRow: {
    display: 'flex',
    gap: '16px',
    marginTop: '32px'
  },
  primaryButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  secondaryButton: {
    padding: '14px 24px',
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  successButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  infoText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px'
  },
  candidatesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  candidateCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#fafafa'
  },
  candidateName: {
    fontWeight: '600',
    marginBottom: '8px',
    color: '#1a1a1a'
  },
  candidateInfo: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px'
  },
  matchScore: {
    fontSize: '14px',
    color: '#6366f1',
    fontWeight: '500'
  }
};

export default JobPostingEnhanced;
