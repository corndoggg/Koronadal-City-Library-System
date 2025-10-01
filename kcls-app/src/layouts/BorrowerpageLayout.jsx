import React from 'react';
import { Outlet } from 'react-router-dom';
import BorrowerTopbar from '../components/BorrowerTopbar';
import { Box, Container, CssBaseline, useTheme } from '@mui/material';

const BorrowerpageLayout = () => {
  const theme = useTheme();

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: theme.palette.background.default,
        }}
      >
        <BorrowerTopbar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: { xs: 2, md: 3 },
            px: { xs: 2, md: 4 },
            bgcolor: theme.palette.background.default,
          }}
        >
          <Container maxWidth="xl">
            <Outlet />
          </Container>
        </Box>
      </Box>
    </>
  );
};

export default BorrowerpageLayout;