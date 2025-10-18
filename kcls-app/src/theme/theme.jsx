import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';
import '@fontsource-variable/inter/index.css';
import '@fontsource/plus-jakarta-sans/300.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';

const neutral = {
  50: '#F8FAFC',
  100: '#EEF2F6',
  200: '#E3E8EF',
  300: '#CDD5DF',
  400: '#9AA4B2',
  500: '#697586',
  600: '#475467',
  700: '#344054',
  800: '#1D2939',
  900: '#101828',
};

const getPalette = (mode = 'light') => {
  const isLight = mode === 'light';

  const textPrimary = isLight ? neutral[900] : '#E6EDF5';
  const textSecondary = isLight ? neutral[600] : alpha('#E6EDF5', 0.72);

  return {
    mode,
    neutral,
    common: {
      black: '#0B1120',
      white: '#FFFFFF',
    },
    primary: {
      light: '#64a7f2',
      main: '#1e88e5',
      dark: '#1565c0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      light: '#9aa5b1',
      main: '#5f6b7a',
      dark: '#3b4551',
      contrastText: '#FFFFFF',
    },
    info: {
      light: '#64a7f2',
      main: '#1e88e5',
      dark: '#1565c0',
      contrastText: '#FFFFFF',
    },
    success: {
      light: '#7bc47f',
      main: '#2e7d32',
      dark: '#1b5e20',
      contrastText: '#FFFFFF',
    },
    warning: {
      light: '#ffe08b',
      main: '#fbc02d',
      dark: '#c49000',
      contrastText: '#111927',
    },
    error: {
      light: '#f18f8f',
      main: '#d32f2f',
      dark: '#9a0007',
      contrastText: '#FFFFFF',
    },
    divider: alpha(isLight ? neutral[200] : neutral[700], isLight ? 0.6 : 0.5),
    background: isLight
      ? {
          default: '#F7F9FC',
          paper: '#FFFFFF',
          subtle: '#EEF2F6',
        }
      : {
          default: '#121826',
          paper: '#1B2333',
          subtle: '#161D2A',
        },
    text: {
      primary: textPrimary,
      secondary: textSecondary,
      disabled: alpha(textSecondary, 0.5),
    },
    action: {
      active: textSecondary,
      hover: alpha(textPrimary, 0.08),
      hoverOpacity: 0.08,
      selected: alpha('#1e88e5', isLight ? 0.12 : 0.24),
      selectedOpacity: isLight ? 0.12 : 0.24,
      disabled: alpha(textSecondary, 0.4),
      disabledBackground: alpha(textPrimary, 0.08),
      focus: alpha('#1e88e5', isLight ? 0.16 : 0.32),
      focusOpacity: 0.12,
      activatedOpacity: 0.16,
    },
  };
};

const typography = {
  fontFamily: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'].join(', '),
  fontWeightRegular: 500,
  fontWeightMedium: 600,
  fontWeightBold: 700,
  h1: {
    fontSize: '3rem',
    fontWeight: 700,
    lineHeight: 1.167,
    letterSpacing: '-0.04em',
  },
  h2: {
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: '-0.04em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.35,
    letterSpacing: '-0.02em',
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.4,
    letterSpacing: '-0.02em',
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.57,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.57,
  },
  button: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    lineHeight: 1.5,
    textTransform: 'none',
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 1.66,
    letterSpacing: '0.08em',
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
};

const createComponents = (mode, palette) => ({
  MuiCssBaseline: {
    styleOverrides: {
      '*': {
        boxSizing: 'border-box',
      },
      html: {
        height: '100%',
        width: '100%',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      body: {
        height: '100%',
        width: '100%',
        margin: 0,
        backgroundColor: palette.background.default,
        color: palette.text.primary,
        fontFamily: typography.fontFamily,
      },
      '#root': {
        height: '100%',
        width: '100%',
      },
      a: {
        textDecoration: 'none',
        color: 'inherit',
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 600,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        backgroundImage: 'none',
        boxShadow: mode === 'light' ? '0px 4px 12px rgba(15, 23, 42, 0.06)' : '0px 6px 16px rgba(0, 0, 0, 0.45)',
        border: `1px solid ${palette.divider}`,
      },
    },
  },
  MuiLink: {
    defaultProps: {
      underline: 'hover',
    },
    styleOverrides: {
      root: {
        fontWeight: 600,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 6,
        backgroundColor: mode === 'light' ? neutral[700] : neutral[100],
        color: mode === 'light' ? '#FFFFFF' : neutral[900],
      },
      arrow: {
        color: mode === 'light' ? neutral[700] : neutral[100],
      },
    },
  },
});

const getTheme = (mode = 'light') => {
  const palette = getPalette(mode);

  return responsiveFontSizes(
    createTheme({
      palette,
      typography,
      shape: {
        borderRadius: 8,
      },
      components: createComponents(mode, palette),
    })
  );
};

export default getTheme;
