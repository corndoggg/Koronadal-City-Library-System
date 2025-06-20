import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode,

    primary: {
      main: '#aa001d',
      light: '#ef5350',
      dark: '#7a0014',
    },

    secondary: {
      main: '#ff4081',
    },

    ...(mode === 'light'
      ? {
          background: {
            default: '#f9f9f9',
            paper: '#ffffff',
          },
          text: {
            primary: '#1a1a1a',
            secondary: '#5c5c5c',
          },
        }
      : {
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#ffffff',
            secondary: '#cccccc',
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
