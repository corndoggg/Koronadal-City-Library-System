import React from 'react';
import { Outlet } from 'react-router-dom';
import BorrowerTopbar from '../components/BorrowerTopbar';
import { Box, CssBaseline, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

const BorrowerpageLayout = () => {
  const theme = useTheme();

  return (
    <>
      <CssBaseline />
      <Box>
        <BorrowerTopbar />
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

export default BorrowerpageLayout;