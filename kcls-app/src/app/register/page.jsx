//// filepath: c:\Users\CLienT\Desktop\Koronadal City Library System\kcls-app\src\app\register\page.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Grid,
  Button,
  Alert,
  MenuItem,
  Stack,
  CircularProgress,
  Divider,
  FormControlLabel,
  Checkbox,
  Link,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useNavigate } from 'react-router-dom';
import TermsDialog from '../../components/TermsDialog.jsx';

const API_BASE = import.meta.env.VITE_API_BASE;
const borrowerTypes = ['Researcher', 'Government Agency'];
const steps = ['Account credentials', 'Profile details'];
const USERNAME_MIN_LENGTH = 4;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

const selectMenuProps = {
  PaperProps: {
    sx: {
      maxHeight: 320,
      '& .MuiMenuItem-root': {
        whiteSpace: 'normal',
      },
    },
  },
};

const renderSelectValue = (placeholder) => (selected) =>
  selected ? (
    selected
  ) : (
    <Box component="span" sx={{ color: 'text.disabled' }}>
      {placeholder}
    </Box>
  );

const SectionHeading = ({ title, subtitle }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography
      variant="overline"
      sx={{
        textTransform: 'uppercase',
        letterSpacing: 1.1,
        fontWeight: 700,
        color: 'primary.main',
      }}
    >
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
  const theme = useTheme();
  const navigate = useNavigate();
  const latestCheckRef = useRef(0);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ state: 'idle', message: '' });
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
    setForm((f) => ({ ...f, [name]: value }));
    if (name === 'username') {
      setError('');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const trimmed = form.username.trim();

    if (!trimmed) {
      setUsernameStatus({ state: 'idle', message: '' });
      return () => controller.abort();
    }

    if (trimmed.length < USERNAME_MIN_LENGTH) {
      setUsernameStatus({
        state: 'short',
        message: `Enter at least ${USERNAME_MIN_LENGTH} characters.`,
      });
      return () => controller.abort();
    }

    if (!USERNAME_PATTERN.test(trimmed)) {
      setUsernameStatus({
        state: 'invalid',
        message: 'Use letters, numbers, dots, dashes, or underscores only.',
      });
      return () => controller.abort();
    }

    const checkId = latestCheckRef.current + 1;
    latestCheckRef.current = checkId;
    setUsernameStatus({ state: 'checking', message: 'Checking availability…' });

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/users/username-available?username=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (latestCheckRef.current !== checkId) return;
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        setUsernameStatus(
          data.available
            ? { state: 'available', message: 'Username is available.' }
            : { state: 'taken', message: 'Username is already taken.' }
        );
      } catch (error) {
        if (controller.signal.aborted || latestCheckRef.current !== checkId) return;
        if (import.meta.env?.DEV) {
          console.error('Username availability check failed', error);
        }
        setUsernameStatus({ state: 'error', message: 'Unable to verify username right now.' });
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [form.username]);

  const baseCredentialsValid =
    form.username &&
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword &&
    form.firstname &&
    form.lastname &&
    form.email &&
    form.password.length >= 6;

  const canContinueStep1 = baseCredentialsValid && usernameStatus.state === 'available';
  const canSubmit =
    form.borrowerType &&
    form.department &&
    termsAccepted &&
    usernameStatus.state === 'available';

  const isUsernameError = ['taken', 'error', 'invalid', 'short'].includes(usernameStatus.state);
  const isUsernameChecking = usernameStatus.state === 'checking';
  const helperColor =
    usernameStatus.state === 'available'
      ? 'success.main'
      : usernameStatus.state === 'checking'
      ? 'text.secondary'
      : undefined;

  const usernameIcon = (() => {
    switch (usernameStatus.state) {
      case 'available':
        return <CheckCircleRoundedIcon color="success" fontSize="small" />;
      case 'checking':
        return <HourglassEmptyIcon color="action" fontSize="small" />;
      case 'taken':
      case 'invalid':
      case 'short':
      case 'error':
        return <ErrorOutlineIcon color="error" fontSize="small" />;
      default:
        return null;
    }
  })();

  const submit = async () => {
    setError('');
    if (usernameStatus.state !== 'available') {
      setError('Please choose an available username before submitting.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        username: form.username.trim(),
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
          dateofbirth: form.dateofbirth || null,
        },
        borrower: {
          type: form.borrowerType,
          department: form.department,
          accountstatus: 'Pending',
        },
      };
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSuccess(true);
      setTermsAccepted(false);
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  const resetToLogin = () => navigate('/login');

  const activeStep = Math.max(0, Math.min(steps.length - 1, step - 1));

  if (success) {
    return (
      <>
        <Box
          minHeight="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ background: theme.palette.background.default, p: 2 }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              width: '100%',
              maxWidth: 420,
              borderRadius: 1,
              border: `2px solid ${theme.palette.divider}`,
              boxShadow: `0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px ${alpha(theme.palette.divider, 0.6)}`,
            }}
          >
            <Stack spacing={2} alignItems="center" textAlign="center">
              <Typography variant="h5" fontWeight={800} color="primary.main">
                Registration Submitted
              </Typography>
              <Alert severity="info" sx={{ width: '100%' }}>
                Your borrower account is pending approval. You will be able to log in once approved.
              </Alert>
              <Stack spacing={1.5} sx={{ width: '100%' }}>
                <Button variant="contained" onClick={resetToLogin} disableElevation sx={{ fontWeight: 700 }}>
                  Go to Login
                </Button>
                <Button variant="text" onClick={() => navigate('/')} size="small">
                  Back to Home
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
        <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
      </>
    );
  }

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ background: theme.palette.background.default, p: 2 }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 860,
          borderRadius: 1,
          border: `2px solid ${theme.palette.divider}`,
          boxShadow: `0 6px 18px rgba(0,0,0,0.08), 0 0 0 1px ${alpha(theme.palette.divider, 0.5)}`,
          bgcolor: 'background.paper',
          p: { xs: 2.5, sm: 3, md: 4 },
        }}
      >
        <Stack spacing={3}>
          <Box
            sx={{
              textAlign: 'center',
              border: `1.5px solid ${alpha(theme.palette.primary.main, 0.35)}`,
              borderRadius: 1,
              background: alpha(theme.palette.primary.main, 0.06),
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Typography variant="h5" fontWeight={800} letterSpacing={0.4} mb={0.5}>
              Borrower Registration
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Complete the steps below to request access to the Koronadal City Library System.
            </Typography>
          </Box>

          <Stepper
            activeStep={activeStep}
            alternativeLabel
            sx={{
              '& .MuiStepLabel-label': {
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: 'text.secondary',
              },
              '& .Mui-active .MuiStepLabel-label': {
                color: 'text.primary',
              },
              '& .Mui-completed .MuiStepLabel-label': {
                color: 'text.secondary',
              },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error">{error}</Alert>}

          {step === 1 ? (
            <Stack spacing={3}>
              <Box>
                <SectionHeading
                  title="Account credentials"
                  subtitle="Set up how you'll sign in to the library system."
                />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Username"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      fullWidth
                      required
                      autoComplete="username"
                      error={Boolean(form.username) && isUsernameError}
                      helperText={usernameStatus.message || ' '}
                      FormHelperTextProps={{ sx: { color: helperColor } }}
                      InputProps={{
                        endAdornment: usernameIcon ? (
                          <InputAdornment position="end">{usernameIcon}</InputAdornment>
                        ) : undefined,
                      }}
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
                      autoComplete="email"
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
                      autoComplete="new-password"
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
                      autoComplete="new-password"
                      error={
                        !!form.confirmPassword && form.confirmPassword !== form.password
                      }
                      helperText={
                        form.confirmPassword && form.confirmPassword !== form.password
                          ? 'Passwords do not match'
                          : ' '
                      }
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <SectionHeading
                  title="Personal information"
                  subtitle="Tell us about yourself so we can complete your borrower profile."
                />
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
              </Box>

              <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={2}
                justifyContent="flex-end"
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Button variant="text" size="small" onClick={resetToLogin}>
                  Back to Login
                </Button>
                <Button
                  variant="contained"
                  disabled={!canContinueStep1 || isUsernameChecking}
                  onClick={() => setStep(2)}
                  sx={{ fontWeight: 700, borderRadius: 1, px: 3 }}
                >
                  {isUsernameChecking ? 'Checking…' : 'Continue'}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Box>
                <SectionHeading
                  title="Address"
                  subtitle="Where can we reach you for pick-up or notices?"
                />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Street"
                      name="street"
                      value={form.street}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Barangay"
                      name="barangay"
                      value={form.barangay}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="City"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Province"
                      name="province"
                      value={form.province}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <SectionHeading
                  title="Membership details"
                  subtitle="Tell us what kind of borrower you are."
                />
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
                      {borrowerTypes.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
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
                      disabled={!form.borrowerType}
                      required={Boolean(form.borrowerType)}
                      helperText="Required for registration"
                      placeholder="Enter your department or office"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I agree to the{' '}
                      <Link
                        component="button"
                        type="button"
                        onClick={() => setTermsOpen(true)}
                        sx={{ fontWeight: 600 }}
                      >
                        Terms &amp; Conditions
                      </Link>
                      .
                    </Typography>
                  }
                />
                {!termsAccepted && (
                  <Typography variant="caption" color="error.main" sx={{ ml: 4 }}>
                    You must accept the Terms &amp; Conditions to continue.
                  </Typography>
                )}
              </Box>

              <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setStep(1)}
                  sx={{ borderRadius: 1, fontWeight: 600 }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  disabled={loading || !canSubmit}
                  onClick={submit}
                  sx={{ fontWeight: 700, borderRadius: 1, px: 3 }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Submit Registration'}
                </Button>
              </Stack>
              <Button variant="text" color="inherit" size="small" onClick={resetToLogin}>
                Cancel and return to Login
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
      <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
    </Box>
  );
};

export default RegisterBorrowerPage;