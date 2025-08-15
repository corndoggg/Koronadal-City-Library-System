import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  useTheme,
  IconButton,
  Tooltip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  BookOpen,
  FileText,
  Handshake,
  Package,
  User,
  PlusCircle,
  UploadCloud,
  Settings,
  RefreshCw
} from 'lucide-react';

const SummaryCard = ({ icon: Icon, title, value, color }) => {
  const theme = useTheme();
  const base = color || theme.palette.primary.main;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `2px solid ${alpha(base, 0.35)}`,
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: alpha(base, 0.05),
        transition: 'border-color .18s, background-color .18s',
        '&:hover': {
          borderColor: base,
          bgcolor: alpha(base, 0.10)
        }
      }}
    >
      <Box
        sx={{
          width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            bgcolor: alpha(base, 0.18),
            border: `1.5px solid ${alpha(base,0.5)}`
        }}
      >
        <Icon size={26} color={base} />
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, letterSpacing: .5, color: 'text.secondary' }}
          noWrap
        >
          {title}
        </Typography>
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, lineHeight: 1.1, mt: .25 }}
          noWrap
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};

const DashboardPage = () => {
  const theme = useTheme();

  return (
    <Box p={3} sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          border: `2px solid ${theme.palette.divider}`,
          borderRadius: 1,
          bgcolor: 'background.paper'
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800} letterSpacing={.5} lineHeight={1.15}>
            Dashboard Overview
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Koronadal City Library Management snapshot
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              sx={{
                border: `1.5px solid ${theme.palette.divider}`,
                borderRadius: 1,
                '&:hover': { bgcolor: theme.palette.action.hover }
              }}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2.25}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={BookOpen} title="Books" value="245" color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={FileText} title="Documents" value="120" color="#9c27b0" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={Handshake} title="Borrows" value="58" color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={Package} title="Storage Files" value="412" color="#f57c00" />
        </Grid>
      </Grid>

      <Grid container spacing={2.25} mt={0.5}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: `2px solid ${theme.palette.divider}`,
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>
              Recent Activity
            </Typography>
            <Divider />
            <List dense sx={{ py: 0 }}>
              {[
                { p: "John Dela Cruz borrowed 'The Alchemist'", d: 'June 19, 2025' },
                { p: 'Admin uploaded a historical document', d: 'June 18, 2025' },
                { p: "Anna Santos returned 'Clean Code'", d: 'June 17, 2025' }
              ].map((r, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1,
                    mb: i === 2 ? 0 : 1,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                    {r.p}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {r.d}
                  </Typography>
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Top Borrowers */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: `2px solid ${theme.palette.divider}`,
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>
              Top Borrowers
            </Typography>
            <Divider />
            <List dense sx={{ py: 0 }}>
              {[
                { n: 'Maria Lopez', s: '12 books borrowed' },
                { n: 'Joseph Tan', s: '10 books borrowed' },
                { n: 'Ella Cruz', s: '9 books borrowed' }
              ].map((b, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1,
                    mb: i === 2 ? 0 : 1,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`
                    }}
                  >
                    <User size={18} />
                  </Box>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: 11, fontWeight: 500 }}
                    primary={b.n}
                    secondary={b.s}
                  />
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: `2px solid ${theme.palette.divider}`,
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25
            }}
          >
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>
              Quick Actions
            </Typography>
            <Divider />
            <Grid container spacing={1.25}>
              {[
                { label: 'Add Book', icon: <PlusCircle size={16} /> },
                { label: 'Upload File', icon: <UploadCloud size={16} /> },
                { label: 'View Documents', icon: <FileText size={16} /> },
                { label: 'Settings', icon: <Settings size={16} /> }
              ].map(a => (
                <Grid item xs={6} key={a.label}>
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    startIcon={a.icon}
                    sx={{
                      justifyContent: 'flex-start',
                      fontWeight: 600,
                      borderRadius: 1,
                      textTransform: 'none',
                      fontSize: 12,
                      height: 44
                    }}
                  >
                    {a.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Chart Placeholder */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: `2px solid ${theme.palette.divider}`,
              borderRadius: 1,
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              flexDirection: 'column',
              gap: 1
            }}
          >
            <Typography fontWeight={800} fontSize={15} letterSpacing={.5}>
              Monthly Borrow Chart
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Integrate a chart library here.
            </Typography>
            <Box
              sx={{
                mt: 1,
                width: '100%',
                height: 200,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: `1px dashed ${theme.palette.divider}`
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Chart.js or Recharts placeholder
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
