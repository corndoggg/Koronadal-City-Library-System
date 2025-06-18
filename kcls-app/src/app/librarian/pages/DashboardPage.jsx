import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { BookOpen, FileText, Handshake, Package } from 'lucide-react';

const SummaryCard = ({ icon: Icon, title, value }) => (
  <Paper
    elevation={3}
    sx={{
      p: 3,
      borderRadius: 3,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
    }}
  >
    <Icon size={36} color="#1976d2" />
    <Box>
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h6" fontWeight="bold">
        {value}
      </Typography>
    </Box>
  </Paper>
);

const DashboardPage = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        📊 Dashboard
      </Typography>

      <Typography variant="body1" color="text.secondary" mb={4}>
        Welcome to the Koronadal City Library Management Dashboard.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={BookOpen} title="Books" value="245" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={FileText} title="Documents" value="120" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={Handshake} title="Borrows" value="58" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard icon={Package} title="Storage Files" value="412" />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;