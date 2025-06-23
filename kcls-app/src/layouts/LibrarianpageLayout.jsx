import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/librarian/Sidebar';
import {
  Box,
  CssBaseline,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';

const drawerWidth = 240;
const collapsedWidth = 64;

const LibrarianpageLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Memoize handlers
  const toggleCollapse = React.useCallback(() => setIsSidebarCollapsed(prev => !prev), []);
  const toggleMobileSidebar = React.useCallback(() => setShowMobileSidebar(prev => !prev), []);
  const closeMobileSidebar = React.useCallback(() => setShowMobileSidebar(false), []);

  // Sidebar width calculation
  const sidebarWidth = isSidebarCollapsed ? collapsedWidth : drawerWidth;

  return (
    <>
      <CssBaseline />
      {/* Sidebar */}
      {!isMobile ? (
        <motion.div
          animate={{ width: sidebarWidth }}
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
          <Sidebar
            collapsed={isSidebarCollapsed}
            toggleCollapse={toggleCollapse}
            drawerWidth={drawerWidth}
            collapsedWidth={collapsedWidth}
          />
        </motion.div>
      ) : (
        showMobileSidebar && (
          <>
            <Box
              onClick={closeMobileSidebar}
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                bgcolor: 'rgba(0, 0, 0, 0.4)',
                zIndex: 1250,
              }}
            />
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
              <Sidebar
                collapsed={false}
                toggleCollapse={toggleCollapse}
                drawerWidth={drawerWidth}
                collapsedWidth={collapsedWidth}
              />
            </motion.div>
          </>
        )
      )}

      {/* Mobile toggle button */}
      {isMobile && !showMobileSidebar && (
        <Tooltip title="Open menu">
          <IconButton
            onClick={toggleMobileSidebar}
            aria-label="Open sidebar"
            sx={{
              position: 'fixed',
              top: 12,
              left: 12,
              zIndex: 1400,
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.shadows[3],
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
            size="small"
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* Main Content */}
      <Box
        sx={{
          ml: isMobile ? 0 : `${sidebarWidth}px`,
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

export default LibrarianpageLayout;