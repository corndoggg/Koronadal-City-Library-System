import { createTheme } from '@mui/material/styles';

const mono = {
  white: '#ffffff',
  offWhite: '#f5f5f5',
  lightGray: '#e0e0e0',
  midLightGray: '#c2c2c2',
  gray: '#9e9e9e',
  midDarkGray: '#5c5c5c',
  darkGray: '#2f2f2f',
  almostBlack: '#181818',
  black: '#000000',
};

const getDesignTokens = (mode) => {
  const isLight = mode === 'light';

  return {
    palette: {
      mode,
      primary: {
        main: isLight ? mono.darkGray : mono.lightGray,
        light: isLight ? mono.midLightGray : mono.gray,
        dark: isLight ? mono.almostBlack : mono.midDarkGray,
        contrastText: isLight ? mono.white : mono.black,
      },
      secondary: {
        main: isLight ? mono.gray : mono.midLightGray,
        light: isLight ? mono.midLightGray : mono.gray,
        dark: isLight ? mono.midDarkGray : mono.darkGray,
        contrastText: isLight ? mono.white : mono.black,
      },
      success: { main: '#4caf50', contrastText: mono.white },   // keep semantic colors
      error: { main: '#f44336', contrastText: mono.white },
      warning: { main: '#ffa000', contrastText: mono.black },
      info: { main: '#616161', contrastText: mono.white },

      background: isLight
        ? {
            default: mono.offWhite,
            paper: mono.white,
          }
        : {
            default: mono.almostBlack,
            paper: mono.darkGray,
          },

      text: isLight
        ? {
            primary: mono.almostBlack,
            secondary: mono.midDarkGray,
            disabled: mono.gray,
          }
        : {
            primary: mono.offWhite,
            secondary: mono.midLightGray,
            disabled: mono.gray,
          },

      divider: isLight ? mono.lightGray : mono.midDarkGray,

      neutral: {
        0: mono.white,
        50: mono.offWhite,
        100: mono.lightGray,
        200: mono.midLightGray,
        300: mono.gray,
        400: '#7a7a7a',
        500: mono.midDarkGray,
        600: '#444',
        700: mono.darkGray,
        800: '#1f1f1f',
        900: mono.black,
      },
      action: {
        hover: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
        selected: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
        disabled: 'rgba(0,0,0,0.26)',
        disabledBackground: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
        focus: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)',
      },
    },
    typography: {
      fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, "Liberation Sans", sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            border: `1px solid ${isLight ? mono.lightGray : mono.midDarkGray}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
          },
        },
      },
    },
  };
};

const getTheme = (mode = 'light') => createTheme(getDesignTokens(mode));
export default getTheme;
