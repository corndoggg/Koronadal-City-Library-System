import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366F1', // Indigo
    },
    background: {
      default: '#F4F6F8',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    fontWeightMedium: 600,
  },
});

export default theme;
