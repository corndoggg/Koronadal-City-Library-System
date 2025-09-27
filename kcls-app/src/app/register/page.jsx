//// filepath: c:\Users\CLienT\Desktop\Koronadal City Library System\kcls-app\src\app\register\page.jsx
import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Grid, Button, Alert, MenuItem,
  Stack, CircularProgress, Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE;

const borrowerTypes = ['Researcher', 'Government Agency', 'External'];

const selectMenuProps = {
  PaperProps: {
    sx: {
      maxHeight: 320,
      '& .MuiMenuItem-root': {
        whiteSpace: 'normal'
      }
    }
  }
};

const renderSelectValue = (placeholder) => (selected) => (
  selected
    ? selected
    : (
        <Box component="span" sx={{ color: 'text.disabled' }}>
          {placeholder}
        </Box>
      )
);

const SectionHeading = ({ title, subtitle }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="subtitle1" fontWeight={600}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    )}
    <Divider sx={{ mt: 1 }} />
  </Box>
);

const RegisterBorrowerPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstname: '',
    middlename: '',
    lastname: '',
    email: '',
    contactnumber: '',
    dateofbirth: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    borrowerType: '',
    department: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const canContinueStep1 =
    form.username &&
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword &&
    form.firstname &&
    form.lastname &&
    form.email;

  const canSubmit =
    form.borrowerType &&
    (form.borrowerType !== 'External' ? form.department : true);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        username: form.username.trim(),
         // NOTE: backend currently stores plain text; consider hashing server-side
        password: form.password,
        role: 'Borrower',
        details: {
          firstname: form.firstname,
          middlename: form.middlename || null,
          lastname: form.lastname,
          email: form.email,
          contactnumber: form.contactnumber || null,
          street: form.street || null,
          barangay: form.barangay || null,
          city: form.city || null,
          province: form.province || null,
          dateofbirth: form.dateofbirth || null
        },
        borrower: {
          type: form.borrowerType,
          department: form.borrowerType !== 'External' ? form.department : null,
          accountstatus: 'Pending'
        }
      };
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" sx={{ p: 2 }}>
        <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 420, width: '100%' }} elevation={4}>
          <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
            Registration Submitted
          </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Your borrower account is pending approval. You will be able to log in once approved.
            </Alert>
          <Stack spacing={1.5} mt={1}>
            <Button variant="contained" onClick={() => navigate('/login')} disableElevation>
              Go to Login
            </Button>
            <Button variant="text" onClick={() => navigate('/')} size="small">
              Back to Home
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" sx={{ p: 2 }}>
      <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 720, width: '100%' }} elevation={4}>
        <Typography variant="h5" fontWeight={700} color="primary" textAlign="center" mb={0.5}>
          Borrower Registration
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          Step {step} of 2
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <SectionHeading
                title="Account Credentials"
                subtitle="Set up how you'll sign in to the library system."
              />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    fullWidth
                    required
                    helperText={form.password && form.password.length < 6 ? 'Min 6 characters' : ' '}
                    error={!!form.password && form.password.length < 6}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={form.confirmPassword && form.confirmPassword !== form.password}
                    helperText={
                      form.confirmPassword && form.confirmPassword !== form.password
                        ? 'Passwords do not match'
                        : ' '
                    }
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <SectionHeading
                title="Personal Information"
                subtitle="Tell us about yourself so we can complete your borrower profile."
              />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="First Name"
                    name="firstname"
                    value={form.firstname}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Middle Name"
                    name="middlename"
                    value={form.middlename}
                    onChange={handleChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Last Name"
                    name="lastname"
                    value={form.lastname}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Contact Number"
                    name="contactnumber"
                    value={form.contactnumber}
                    onChange={handleChange}
                    fullWidth
                    placeholder="09XXXXXXXXX"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date of Birth"
                    name="dateofbirth"
                    type="date"
                    value={form.dateofbirth}
                    onChange={handleChange}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={2}
                justifyContent="flex-end"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                mt={1}
              >
                <Button variant="text" size="small" onClick={() => navigate('/login')}>
                  Back to Login
                </Button>
                <Button
                  variant="contained"
                  disabled={!canContinueStep1 || form.password.length < 6}
                  onClick={() => setStep(2)}
                >
                  Continue
                </Button>
              </Stack>
            </Grid>
          </Grid>
        )}

        {step === 2 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <SectionHeading
                title="Address"
                subtitle="Where can we reach you for pick-up or notices?"
              />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Street" name="street" value={form.street} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Barangay" name="barangay" value={form.barangay} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="City" name="city" value={form.city} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Province" name="province" value={form.province} onChange={handleChange} fullWidth />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <SectionHeading
                title="Membership Details"
                subtitle="Tell us what kind of borrower you are."
              />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Borrower Type"
                    name="borrowerType"
                    value={form.borrowerType}
                    onChange={handleChange}
                    fullWidth
                    required
                    SelectProps={{
                      displayEmpty: true,
                      MenuProps: selectMenuProps,
                      renderValue: renderSelectValue('Select borrower type'),
                    }}
                    InputLabelProps={{ shrink: true }}
                    helperText="Choose the category that best represents you"
                  >
                    <MenuItem value="">
                      <Typography component="span" color="text.secondary">
                        Select borrower type
                      </Typography>
                    </MenuItem>
                    {borrowerTypes.map(t => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Department"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    fullWidth
                    disabled={form.borrowerType === 'External' || !form.borrowerType}
                    required={form.borrowerType && form.borrowerType !== 'External'}
                    helperText={
                      form.borrowerType === 'External'
                        ? 'Not required for External'
                        : 'Required for research and agency borrowers'
                    }
                    placeholder={
                      form.borrowerType === 'External'
                        ? 'Disabled for External'
                        : 'Enter your department or office'
                    }
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                mt={1}
              >
                <Button variant="outlined" onClick={() => setStep(1)}>Back</Button>
                <Button
                  variant="contained"
                  disabled={loading || !canSubmit}
                  onClick={submit}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Submit Registration'}
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="text"
                color="inherit"
                size="small"
                onClick={() => navigate('/login')}
              >
                Cancel and return to Login
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

export default RegisterBorrowerPage;