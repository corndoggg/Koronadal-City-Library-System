import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DRAWER_WIDTH } from '../constants/layout';

const SidebarCtx = createContext(null);

export const SidebarProvider = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const collapsed = false;
  const toggleCollapse = useCallback(() => {}, []);
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const drawerWidth = useMemo(
    () => (isMobile ? 0 : DRAWER_WIDTH),
    [isMobile]
  );

  const value = useMemo(
    () => ({
      collapsed,
      toggleCollapse,
      mobileOpen,
      openMobile,
      closeMobile,
      drawerWidth,
      isMobile,
    }),
    [collapsed, toggleCollapse, mobileOpen, openMobile, closeMobile, drawerWidth, isMobile]
  );

  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSidebar = () => useContext(SidebarCtx);