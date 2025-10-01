import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { Box, Container, CssBaseline, useTheme } from '@mui/material';
import { useSidebar } from '../contexts/SidebarContext';

const LibrarianpageLayout = () => {
  const theme = useTheme();
  const { isMobile } = useSidebar();

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          bgcolor: theme.palette.background.default,
        }}
      >
        <Sidebar />
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
          }}
        >
          <Topbar />
          <Box
            component="main"
            sx={{
              flexGrow: 0,
              py: { xs: 0, md: 0 },
              px: { xs: 0, md: 0 },
              bgcolor: theme.palette.background.default,
            }}
          >
            <Container maxWidth="xl" disableGutters={isMobile}>
              <Outlet />
            </Container>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default LibrarianpageLayout;