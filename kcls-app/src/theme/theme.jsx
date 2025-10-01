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

const baseTheme = createTheme();

const buildShadows = (mode) => {
  const blueprint = [...baseTheme.shadows];

  if (mode === 'light') {
    blueprint[1] = '0px 1px 2px rgba(15, 23, 42, 0.08)';
    blueprint[2] = '0px 2px 4px rgba(15, 23, 42, 0.08)';
    blueprint[4] = '0px 4px 12px rgba(15, 23, 42, 0.08)';
    blueprint[8] = '0px 12px 24px rgba(15, 23, 42, 0.08)';
  } else {
    blueprint[1] = '0px 1px 2px rgba(9, 14, 23, 0.5)';
    blueprint[2] = '0px 2px 4px rgba(9, 14, 23, 0.5)';
    blueprint[4] = '0px 4px 12px rgba(9, 14, 23, 0.6)';
    blueprint[8] = '0px 12px 24px rgba(9, 14, 23, 0.65)';
  }

  return blueprint;
};

const buildPalette = (mode) => {
  const isLight = mode === 'light';

  return {
    mode,
    common: {
      black: '#0B1120',
      white: '#FFFFFF',
    },
    primary: {
      light: '#9DA4FF',
      main: '#6366F1',
      dark: '#4338CA',
      contrastText: '#FFFFFF',
    },
    secondary: {
      light: '#A855F7',
      main: '#8B5CF6',
      dark: '#6D28D9',
      contrastText: '#FFFFFF',
    },
    success: {
      light: '#4ADE80',
      main: '#22C55E',
      dark: '#15803D',
      contrastText: '#FFFFFF',
    },
    info: {
      light: '#38BDF8',
      main: '#0EA5E9',
      dark: '#0369A1',
      contrastText: '#FFFFFF',
    },
    warning: {
      light: '#FCD34D',
      main: '#F59E0B',
      dark: '#B45309',
      contrastText: '#111927',
    },
    error: {
      light: '#FCA5A5',
      main: '#EF4444',
      dark: '#B91C1C',
      contrastText: '#FFFFFF',
    },
    neutral,
    divider: isLight ? alpha(neutral[200], 0.7) : alpha(neutral[700], 0.6),
    background: isLight
      ? {
          default: '#F9FAFC',
          paper: '#FFFFFF',
          subtle: '#F3F4F6',
          elevated: '#FFFFFF',
          sidebar: '#0B1120',
        }
      : {
          default: '#0B1120',
          paper: '#111827',
          subtle: '#111827',
          elevated: '#1F2937',
          sidebar: '#0B1120',
        },
    text: isLight
      ? {
          primary: '#111927',
          secondary: '#475467',
          disabled: alpha('#111927', 0.38),
        }
      : {
          primary: '#E2E8F0',
          secondary: alpha('#E2E8F0', 0.7),
          disabled: alpha('#E2E8F0', 0.45),
        },
    action: {
      active: isLight ? '#475467' : '#E2E8F0',
      hover: alpha(isLight ? '#111927' : '#E2E8F0', 0.08),
      hoverOpacity: 0.08,
      selected: alpha('#6366F1', isLight ? 0.12 : 0.24),
      selectedOpacity: isLight ? 0.12 : 0.24,
      disabled: alpha(isLight ? '#111927' : '#E2E8F0', 0.38),
      disabledBackground: alpha(isLight ? '#111927' : '#E2E8F0', 0.12),
      focus: alpha('#6366F1', isLight ? 0.16 : 0.32),
      focusOpacity: 0.12,
      activatedOpacity: 0.24,
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

const buildComponents = (mode, palette) => ({
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
        textRendering: 'optimizeLegibility',
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
        borderRadius: 12,
        fontWeight: 600,
        letterSpacing: 0,
      },
      sizeSmall: {
        padding: '6px 16px',
      },
      sizeMedium: {
        padding: '8px 20px',
      },
      sizeLarge: {
        padding: '12px 24px',
      },
      containedPrimary: {
        boxShadow: '0px 10px 20px -10px rgba(99, 102, 241, 0.6)',
        '&:hover': {
          boxShadow: '0px 16px 24px -12px rgba(99, 102, 241, 0.5)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 18,
        backgroundColor: palette.background.elevated,
        backgroundImage: 'none',
        border: `1px solid ${alpha(mode === 'light' ? neutral[200] : neutral[700], 0.5)}`,
        boxShadow:
          mode === 'light'
            ? '0px 8px 24px rgba(15, 23, 42, 0.08)'
            : '0px 12px 32px rgba(15, 23, 42, 0.55)',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 18,
        border: `1px solid ${alpha(mode === 'light' ? neutral[200] : neutral[700], 0.45)}`,
        boxShadow:
          mode === 'light'
            ? '0px 20px 44px -18px rgba(15, 23, 42, 0.18)'
            : '0px 20px 44px -16px rgba(15, 23, 42, 0.6)',
      },
    },
  },
  MuiAppBar: {
    defaultProps: {
      color: 'inherit',
    },
    styleOverrides: {
      root: {
        backgroundColor: palette.background.paper,
        color: palette.text.primary,
        borderBottom: `1px solid ${palette.divider}`,
        boxShadow: 'none',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: palette.background.paper,
        color: palette.text.primary,
        borderRight: `1px solid ${palette.divider}`,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        '&.Mui-selected': {
          backgroundColor: palette.action.selected,
          color: mode === 'light' ? palette.primary.main : palette.primary.light,
          '& .MuiListItemIcon-root': {
            color: mode === 'light' ? palette.primary.main : palette.primary.light,
          },
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 12,
      },
      notchedOutline: {
        borderColor: palette.divider,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        fontWeight: 600,
        fontSize: '0.75rem',
        letterSpacing: 0,
      },
    },
  },
  MuiLink: {
    defaultProps: {
      underline: 'hover',
    },
    styleOverrides: {
      root: {
        cursor: 'pointer',
        fontWeight: 600,
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        backgroundColor: mode === 'light' ? palette.background.subtle : palette.background.paper,
        '& .MuiTableCell-root': {
          color: mode === 'light' ? alpha(palette.text.secondary, 0.85) : palette.text.secondary,
          fontWeight: 600,
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${alpha(mode === 'light' ? neutral[200] : neutral[700], 0.5)}`,
        paddingTop: 14,
        paddingBottom: 14,
      },
      head: {
        textTransform: 'uppercase',
        fontSize: '0.75rem',
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: 'background-color 150ms ease, box-shadow 150ms ease',
        '&:hover': {
          backgroundColor: alpha(palette.primary.main, mode === 'light' ? 0.04 : 0.08),
        },
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        minHeight: 48,
      },
      indicator: {
        height: 3,
        borderRadius: 4,
        backgroundColor: palette.primary.main,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        minHeight: 48,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 8,
        backgroundColor: mode === 'light' ? neutral[700] : neutral[100],
        color: mode === 'light' ? '#FFFFFF' : '#0F172A',
      },
      arrow: {
        color: mode === 'light' ? neutral[700] : neutral[100],
      },
    },
  },
});

const getDesignTokens = (mode = 'light') => {
  const palette = buildPalette(mode);

  return {
    palette,
    typography,
    shape: {
      borderRadius: 16,
    },
    shadows: buildShadows(mode),
    components: buildComponents(mode, palette),
    customShadows: {
      card:
        mode === 'light'
          ? '0px 20px 44px -16px rgba(15, 23, 42, 0.18)'
          : '0px 20px 44px -16px rgba(15, 23, 42, 0.6)',
      popover:
        mode === 'light'
          ? '0px 16px 32px -12px rgba(15, 23, 42, 0.24)'
          : '0px 16px 32px -12px rgba(15, 23, 42, 0.5)',
      dropdown:
        mode === 'light'
          ? '0px 20px 44px -24px rgba(15, 23, 42, 0.34)'
          : '0px 20px 44px -24px rgba(15, 23, 42, 0.5)',
    },
  };
};

const getTheme = (mode = 'light') => responsiveFontSizes(createTheme(getDesignTokens(mode)));

export default getTheme;
