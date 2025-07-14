import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress, Alert, useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE;

const LoginPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
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
        setError('');
        // Save user info to localStorage
        localStorage.setItem('user', JSON.stringify(data));
        // Redirect based on role and position
        if (data.Role === 'Staff' && data.staff?.Position === 'Librarian') {
          navigate('/librarian');
        } else if (data.Role === 'Staff') {
          navigate('/admin');
        } else if (data.Role === 'Borrower') {
          navigate('/borrower');
        } else {
          navigate('/');
        }
      }
    } catch {
      setError('Unable to connect to server');
    }
    setLoading(false);
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ background: theme.palette.background.default }}
    >
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, minWidth: 350, maxWidth: 400 }}>
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
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;