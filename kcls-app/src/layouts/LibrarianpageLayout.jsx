import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/librarian/Sidebar';
import Topbar from '../components/librarian/Topbar';
import { Box, CssBaseline, useMediaQuery, useTheme } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import Footer from '../components/common/Footer';

const drawerWidth = 180;
const collapsedWidth = 52;

const LibrarianpageLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isMobile = useMediaQuery('(max-width:768px)');
  const theme = useTheme();

  const toggleCollapse = () => setIsSidebarCollapsed(prev => !prev);
  const toggleMobileSidebar = () => setShowMobileSidebar(prev => !prev);
  const closeMobileSidebar = () => setShowMobileSidebar(false);

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
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[2],
            zIndex: 1100,
            overflow: 'hidden',
          }}
        >
          <Sidebar collapsed={isSidebarCollapsed} drawerWidth={drawerWidth} collapsedWidth={collapsedWidth} />
        </motion.div>
      ) : (
        <AnimatePresence>
          {showMobileSidebar && (
            <>
              {/* Backdrop */}
              <Box
                onClick={closeMobileSidebar}
                sx={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  bgcolor: 'rgba(0, 0, 0, 0.4)',
                  zIndex: 1250, // Below sidebar, above topbar
                }}
              />
              {/* Sidebar */}
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
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[3],
                  zIndex: 1300,
                }}
              >
                <Sidebar collapsed={false} drawerWidth={drawerWidth} />
              </motion.div>
            </>
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
        {/* Topbar */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1200 }}>
          <Topbar
            toggleMobileSidebar={toggleMobileSidebar}
            toggleCollapse={toggleCollapse}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        </Box>

        <Box
          component="main"
          sx={{
            p: 1,
            pb: 2,
            minHeight: '100vh',
            bgcolor: theme.palette.background.default,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: theme.palette.background.paper,
              borderRadius: 12,
              padding: 24,
              boxShadow: theme.shadows[2],
              minHeight: 'calc(100vh - 72px)',
            }}
          >
            <Outlet />
          </motion.div>
          <Footer />
        </Box>
      </Box>
    </>
  );
};

export default LibrarianpageLayout;
