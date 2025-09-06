import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import {
  Box,
  CssBaseline,
  useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useSidebar } from '../contexts/SidebarContext';

const AdminpageLayout = () => {
  const theme = useTheme();
  const { isMobile, drawerWidth } = useSidebar();

  return (
    <>
      <CssBaseline />
      <Sidebar/>
      <Box
        sx={{
          ml: !isMobile ? `${drawerWidth}px` : 0,
          transition: 'margin-left 0.3s ease',
        }}
      >
        <Topbar />
        <Box
          component="main"
          sx={{
            minHeight: '100vh',
            bgcolor: theme.palette.background.default,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </Box>
      </Box>
    </>
  );
};

export default AdminpageLayout;