import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED } from '../constants/layout';

const SidebarCtx = createContext(null);

export const SidebarProvider = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = useCallback(() => setCollapsed((prev) => !prev), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const drawerWidth = useMemo(
    () => (isMobile ? 0 : collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH),
    [collapsed, isMobile]
  );

  const value = useMemo(
    () => ({
      collapsed,
      toggleCollapse,
      setCollapsed,
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

export const useSidebar = () => useContext(SidebarCtx);