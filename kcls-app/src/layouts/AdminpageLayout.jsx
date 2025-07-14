import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
  Box,
  CssBaseline,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';

const drawerWidth = 240;

const AdminpageLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        <Box
          component="main"
          sx={{
            p: 2,
            pt: 2,
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