import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress, Alert,
  useTheme, Checkbox, FormControlLabel, Stack, Link, Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { logAudit } from '../../utils/auditLogger.js'; // NEW
import TermsDialog from '../../components/TermsDialog.jsx';

const API_BASE = import.meta.env.VITE_API_BASE;

const LoginPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // NEW: initial auto-login check
  const [error, setError] = useState('');
  const [borrowerStatus, setBorrowerStatus] = useState(null); // null | "Pending" | "Rejected"
  const [termsOpen, setTermsOpen] = useState(false);

  // Helper: choose route from stored user object
  const routeFromUser = (u) => {
    if (!u) return '/';
    if (u.Role === 'Borrower') return '/borrower';
    if (u.Role === 'Staff' && u.staff?.Position === 'Librarian') return '/librarian';
    if (u.Role === 'Staff') return '/admin';
    return '/';
  };

  useEffect(() => {
    const remembered = localStorage.getItem('rememberedUsername');
    if (remembered) setUsername(remembered);
  }, []);

  // Auto-login on mount if a session exists
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!raw) { setCheckingAuth(false); return; }
      const u = JSON.parse(raw);

      // If borrower is pending/rejected, show status (do not navigate)
      const status = u?.borrower?.AccountStatus;
      if (u?.Role === 'Borrower' && (status === 'Pending' || status === 'Rejected')) {
        setBorrowerStatus(status);
        setCheckingAuth(false);
        return;
      }

      // Otherwise auto-navigate
      const path = routeFromUser(u);
      navigate(path, { replace: true });
    } catch {
      // ignore parse errors
    } finally {
      setCheckingAuth(false);
    }
  }, [navigate]);

  const storeUserSession = (data) => {
    if (rememberMe) {
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('rememberedUsername', data.Username || username);
      sessionStorage.removeItem('user');
    } else {
      sessionStorage.setItem('user', JSON.stringify(data));
      localStorage.removeItem('user');
      localStorage.removeItem('rememberedUsername');
    }
  };

  const clearStoredSession = () => { // NEW
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBorrowerStatus(null);

    // Log attempt (no userId yet; backend will still record)
    logAudit('LOGIN_ATTEMPT', 'User', null, { username });

    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        logAudit('LOGIN_FAILURE', 'User', null, { username, reason: data.error || 'Invalid credentials' });
      } else {
        // If borrower is pending/rejected, do NOT store session; show status
        if (data.Role === 'Borrower') {
          const status = data.borrower?.AccountStatus;
          if (status === 'Pending' || status === 'Rejected') {
            setBorrowerStatus(status);
            setLoading(false);
            return;
          }
        }

        // Store session only for allowed users and redirect
        storeUserSession(data);
        logAudit('LOGIN_SUCCESS', 'User', data.UserID || data.userId || data.id, { username });
        navigate(routeFromUser(data));
      }
    } catch {
      setError('Unable to connect to server');
      logAudit('LOGIN_FAILURE', 'User', null, { username, reason: 'NETWORK' });
    }
    setLoading(false);
  };

  // Show status page for pending/rejected borrower
  if (borrowerStatus === "Pending" || borrowerStatus === "Rejected") {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" sx={{ background: theme.palette.background.default }}>
        <Paper elevation={4} sx={{ p: 4, borderRadius: 3, minWidth: 350, maxWidth: 400 }}>
          <Typography variant="h5" fontWeight={700} color={theme.palette.primary.main} mb={2} align="center">
            {borrowerStatus === "Pending" ? "Account Pending Approval" : "Account Rejected"}
          </Typography>
          <Typography align="center" color="text.secondary" mb={2}>
            {borrowerStatus === "Pending"
              ? "Your account is awaiting approval by the library staff. Please check back later."
              : "Your account registration was rejected. Please contact the library for more information."}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2, fontWeight: 600 }}
            onClick={() => { setBorrowerStatus(null); clearStoredSession(); }} // NEW: clear session
          >
            Back to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  // Initial auto-login check spinner
  if (checkingAuth) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" sx={{ background: theme.palette.background.default }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        background: theme.palette.mode === 'light'
          ? alpha(theme.palette.primary.light, 0.04)
          : theme.palette.background.default
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', lg: 'flex' },
          order: { xs: 2, lg: 1 },
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundImage: `linear-gradient(140deg, ${alpha(theme.palette.primary.dark, 0.82)} 0%, ${alpha(theme.palette.secondary.main, 0.78)} 100%), url('/library_front.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 32,
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
            background: alpha(theme.palette.common.white, 0.05)
          }}
        />
        <Stack spacing={4} sx={{ position: 'relative', maxWidth: 420, color: alpha('#fff', 0.98) }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              component="img"
              src="/logo.png"
              alt="Koronadal City seal"
              sx={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 2, backgroundColor: alpha('#fff', 0.08), p: 1 }}
            />
            <Typography variant="overline" sx={{ letterSpacing: 2, fontWeight: 700 }}>
              Borrower Hub
            </Typography>
          </Stack>
          <Stack spacing={2}>
            <Typography variant="h3" fontWeight={800} lineHeight={1.1}>
              Access collections, request documents, and track every loan with confidence.
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.82) }}>
              Stay on top of due dates, digital expirations, and community programs curated for Koronadal learners. Your library card is now a smarter, faster experience.
            </Typography>
          </Stack>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: alpha('#fff', 0.92) }}>
                Borrower insights
              </Typography>
              <Divider flexItem orientation="vertical" sx={{ borderColor: alpha('#fff', 0.24) }} />
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.72), letterSpacing: 0.5 }}>
                Real-time availability • Digital archives • Personalized reminders
              </Typography>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 1.5
              }}
            >
              <Box sx={{ backgroundColor: alpha('#fff', 0.08), borderRadius: 2, p: 2 }}>
                <Typography variant="h5" fontWeight={800}>
                  2,300+
                </Typography>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
                  community resources just a click away
                </Typography>
              </Box>
              <Box sx={{ backgroundColor: alpha('#fff', 0.08), borderRadius: 2, p: 2 }}>
                <Typography variant="h5" fontWeight={800}>
                  24/7
                </Typography>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
                  digital document access for verified borrowers
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Box
        sx={{
          width: { xs: '100%', lg: '50%' },
          order: { xs: 1, lg: 2 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, md: 8 },
          py: { xs: 6, md: 10 }
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 440,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            boxShadow: theme.palette.mode === 'light'
              ? `0 18px 48px ${alpha(theme.palette.common.black, 0.08)}`
              : `0 18px 48px ${alpha(theme.palette.common.black, 0.32)}`,
            bgcolor: 'background.paper',
            p: { xs: 3, md: 4 },
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <Stack spacing={2.5} alignItems="center">
            <Box
              component="img"
              src="/logo.png"
              alt="Koronadal City Library seal"
              sx={{
                width: 78,
                height: 78,
                objectFit: 'contain',
                borderRadius: 2,
                border: `1.5px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                backgroundColor: theme.palette.common.white,
                p: 1.25
              }}
            />
            <Stack spacing={0.5} alignItems="center" textAlign="center">
              <Typography variant="h5" fontWeight={800} letterSpacing={0.6}>
                Koronadal City Library
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Sign in to steward our community’s knowledge.
              </Typography>
            </Stack>
          </Stack>

          <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.6} sx={{ textTransform: 'uppercase' }}>
                Credentials
              </Typography>
            </Box>
            <TextField
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              fullWidth
              required
              size="small"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              required
              size="small"
            />

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                }
                label={<Typography variant="caption" fontSize={12}>Remember me</Typography>}
                sx={{
                  m: 0,
                  '& .MuiFormControlLabel-label': { fontWeight: 600, letterSpacing: 0.3 }
                }}
              />
              <Link
                component="button"
                type="button"
                variant="body2"
                sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}
                onClick={() => navigate('/forgot-password')}
              >
                Forgot password?
              </Link>
            </Stack>

            {error && (
              <Alert
                severity="error"
                variant="filled"
                sx={{
                  borderRadius: 1.5,
                  fontSize: 13,
                  py: 0.75
                }}
              >
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
              sx={{
                mt: 0.5,
                fontWeight: 700,
                letterSpacing: 0.5,
                borderRadius: 2,
                py: 1.1
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Login'}
            </Button>

            <Link
              component="button"
              type="button"
              onClick={() => setTermsOpen(true)}
              sx={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.3,
                textAlign: 'center'
              }}
            >
              View Terms &amp; Conditions
            </Link>

            <Divider sx={{ my: 1.75 }} />

            <Box textAlign="center">
              <Typography variant="caption" display="block" color="text.secondary" mb={0.75} fontWeight={600} letterSpacing={0.3}>
                Not yet registered?
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => navigate('/register-borrower')}
                sx={{
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  borderRadius: 2,
                  py: 0.95
                }}
              >
                Register as Borrower
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
    </Box>
  );
};

export default LoginPage;