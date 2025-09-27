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
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        background: theme.palette.background.default,
        p: 2
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 3,
          width: '100%',
          maxWidth: 420,
          borderRadius: 1,                             // boxy
          border: `2px solid ${theme.palette.divider}`,// strong border
          boxShadow: `0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px ${alpha(theme.palette.divider,0.6)}`,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.25,
            p: 2,
            borderRadius: 1,
            border: `1.5px solid ${theme.palette.divider}`,
            background: alpha(theme.palette.primary.main, 0.04)
          }}
        >
          <Box
            component="img"
            src="/logo.png"          // place the seal/logo file as /public/logo.png (or adjust path)
            alt="Koronadal City Library Logo"
            sx={{
              width: 84,
              height: 84,
              objectFit: 'contain',
              borderRadius: 1,
              border: `1.5px solid ${alpha(theme.palette.primary.main, 0.5)}`,
              background: '#fff',
              p: 1
            }}
          />
          <Typography
            variant="h6"
            fontWeight={800}
            letterSpacing={0.5}
            textAlign="center"
            sx={{ fontSize: 18, lineHeight: 1.1 }}
          >
            Koronadal City Library
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            letterSpacing={0.5}
            sx={{ fontSize: 11 }}
          >
            Account Access Portal
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
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
            </Link>
          </Stack>

          {error && (
            <Alert
              severity="error"
              variant="filled"
              sx={{
                borderRadius: 1,
                fontSize: 13,
                py: 0.5
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
              borderRadius: 1,
              py: 1
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

          <Divider sx={{ my: 1.5 }} />

          <Box textAlign="center">
            <Typography variant="caption" display="block" color="text.secondary" mb={0.5} fontWeight={600} letterSpacing={0.3}>
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
                borderRadius: 1,
                py: 0.9
              }}
            >
              Register as Borrower
            </Button>
          </Box>
        </Box>
      </Paper>
      <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
    </Box>
  );
};

export default LoginPage;