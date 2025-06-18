import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/librarian/Sidebar';
import Topbar from '../components/librarian/Topbar';
import {
  Box,
  CssBaseline,
  useMediaQuery,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

const drawerWidth = 240;
const collapsedWidth = 72;

const LibrarianpageLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isMobile = useMediaQuery('(max-width:768px)');

  const toggleCollapse = () => setIsSidebarCollapsed(prev => !prev);
  const toggleMobileSidebar = () => setShowMobileSidebar(prev => !prev);

  return (
    <>
      <CssBaseline />

      {/* Sidebar Section */}
      {!isMobile ? (
        <motion.div
          animate={{ width: isSidebarCollapsed ? collapsedWidth : drawerWidth }}
          transition={{ duration: 0.3 }}
          style={{
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            backgroundColor: '#fff',
            boxShadow: '2px 0 10px rgba(0, 0, 0, 0.05)',
            zIndex: 1100,
            overflow: 'hidden',
          }}
        >
          <Sidebar collapsed={isSidebarCollapsed} drawerWidth={drawerWidth} />
        </motion.div>
      ) : (
        <AnimatePresence>
          {showMobileSidebar && (
            <motion.div
              key="mobile-sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: drawerWidth,
                height: '100vh',
                backgroundColor: '#fff',
                boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
                zIndex: 1200,
              }}
            >
              <Sidebar collapsed={false} drawerWidth={drawerWidth} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Main App Section */}
      <Box
        sx={{
          ml: isMobile ? 0 : isSidebarCollapsed ? `${collapsedWidth}px` : `${drawerWidth}px`,
          transition: 'margin-left 0.3s ease',
        }}
      >
        <Topbar
          toggleMobileSidebar={toggleMobileSidebar}
          toggleCollapse={toggleCollapse}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <Box component="main" sx={{ p: 3, minHeight: '100vh', bgcolor: '#f5f6fa' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              minHeight: 'calc(100vh - 72px)',
            }}
          >
            <Outlet />
          </motion.div>
        </Box>
      </Box>
    </>
  );
};

export default LibrarianpageLayout;