import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode,

    primary: {
      main: '#1976d2',      // A friendly blue
      light: '#63a4ff',
      dark: '#004ba0',
      contrastText: '#fff',
    },

    secondary: {
      main: '#ff9800',      // A warm orange
      light: '#ffc947',
      dark: '#c66900',
      contrastText: '#fff',
    },

    success: {
      main: '#43a047',
      contrastText: '#fff',
    },

    error: {
      main: '#e53935',
      contrastText: '#fff',
    },

    warning: {
      main: '#fbc02d',
      contrastText: '#fff',
    },

    info: {
      main: '#0288d1',
      contrastText: '#fff',
    },

    ...(mode === 'light'
      ? {
          background: {
            default: '#f4f6fb',   // Soft light background
            paper: '#ffffff',
          },
          text: {
            primary: '#222b45',   // Dark blue-gray for readability
            secondary: '#6b778c',
          },
        }
      : {
          background: {
            default: '#181c25',   // Deep blue-gray for dark mode
            paper: '#23293a',
          },
          text: {
            primary: '#f4f6fb',
            secondary: '#b0b8c1',
          },
        }),
  },

  typography: {
    fontFamily: 'Inter, Roboto, sans-serif',
    button: {
      textTransform: 'none',
    },
  },
});

const getTheme = (mode = 'light') => createTheme(getDesignTokens(mode));

export default getTheme;
