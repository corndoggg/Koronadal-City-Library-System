import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress, Alert,
  useTheme, Checkbox, FormControlLabel, Stack, Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE;

const LoginPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [borrowerStatus, setBorrowerStatus] = useState(null); // null | "Pending" | "Rejected"

  useEffect(() => {
    const remembered = localStorage.getItem('rememberedUsername');
    if (remembered) setUsername(remembered);
  }, []);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBorrowerStatus(null);
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
      } else {
        storeUserSession(data);
        if (data.Role === 'Borrower') {
          const status = data.borrower?.AccountStatus;
            if (status === "Pending" || status === "Rejected") {
              setBorrowerStatus(status);
              setLoading(false);
              return;
            }
          navigate('/borrower');
        } else if (data.Role === 'Staff' && data.staff?.Position === 'Librarian') {
          navigate('/librarian');
        } else if (data.Role === 'Staff') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch {
      setError('Unable to connect to server');
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
            onClick={() => setBorrowerStatus(null)}
          >
            Back to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ background: theme.palette.background.default }}
    >
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, minWidth: 360, maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} color={theme.palette.primary.main} mb={2} align="center">
          Koronadal City Library Login
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            fullWidth
            required
            margin="normal"
            autoFocus
          />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
              }
              label={<Typography variant="caption" fontSize={13}>Remember me</Typography>}
              sx={{ ml: -1 }}
            />
            <Link
              component="button"
              type="button"
              variant="body2"
              sx={{ fontSize: 13 }}
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </Link>
          </Stack>
          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2, fontWeight: 600 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>
          <Box mt={2} textAlign="center">
            <Typography variant="caption" display="block" color="text.secondary" mb={0.5}>
              Not yet registered?
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => navigate('/register-borrower')}
            >
              Register as Borrower
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;