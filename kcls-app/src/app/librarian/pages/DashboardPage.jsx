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
  alpha
} from '@mui/material';
import {
  BookOpen,
  FileText,
  Handshake,
  Package,
  User,
  PlusCircle,
  UploadCloud,
  Settings,
} from 'lucide-react';

const SummaryCard = ({ icon: Icon, title, value, color }) => {
  const theme = useTheme();
  const bg = alpha(color || theme.palette.primary.main, 0.1);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        transition: '0.3s',
        backgroundColor: bg,
        '&:hover': {
          boxShadow: theme.shadows[6],
          transform: 'scale(1.02)',
        },
      }}
    >
      <Box
        sx={{
          backgroundColor: color,
          borderRadius: 2,
          p: 1.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={28} color="#fff" />
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" fontSize={14}>
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};

const DashboardPage = () => {
  const theme = useTheme();

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          📊 Dashboard Overview
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to the Koronadal City Library Management System.
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3}>
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

      <Grid container spacing={3} mt={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Recent Activity
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="John Dela Cruz borrowed 'The Alchemist'"
                  secondary="June 19, 2025"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Admin uploaded a historical document"
                  secondary="June 18, 2025"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Anna Santos returned 'Clean Code'"
                  secondary="June 17, 2025"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Top Borrowers */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Top Borrowers
            </Typography>
            <List dense>
              <ListItem>
                <User size={20} style={{ marginRight: 8 }} />
                <ListItemText primary="Maria Lopez" secondary="12 books borrowed" />
              </ListItem>
              <Divider />
              <ListItem>
                <User size={20} style={{ marginRight: 8 }} />
                <ListItemText primary="Joseph Tan" secondary="10 books borrowed" />
              </ListItem>
              <Divider />
              <ListItem>
                <User size={20} style={{ marginRight: 8 }} />
                <ListItemText primary="Ella Cruz" secondary="9 books borrowed" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button fullWidth variant="outlined" startIcon={<PlusCircle />}>
                  Add Book
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button fullWidth variant="outlined" startIcon={<UploadCloud />}>
                  Upload File
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button fullWidth variant="outlined" startIcon={<FileText />}>
                  View Documents
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button fullWidth variant="outlined" startIcon={<Settings />}>
                  Settings
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Placeholder Chart Box (optional) */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              flexDirection: 'column',
              border: `1px dashed ${theme.palette.divider}`,
            }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              📈 Monthly Borrow Chart
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Integrate Chart.js or Recharts to visualize data.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
