import React, { createContext, useContext, useMemo, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED } from '../constants/layout';

const SidebarCtx = createContext(null);

export const SidebarProvider = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const value = useMemo(() => {
    const width = isMobile ? 0 : (collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH);
    return {
      collapsed,
      setCollapsed,
      toggleCollapse: () => setCollapsed(v => !v),
      mobileOpen,
      openMobile: () => setMobileOpen(true),
      closeMobile: () => setMobileOpen(false),
      drawerWidth: width,
      isMobile,
    };
  }, [collapsed, mobileOpen, isMobile]);

  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
};

export const useSidebar = () => useContext(SidebarCtx);