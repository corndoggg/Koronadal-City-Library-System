import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Drawer, List, ListItemIcon, ListItemText, Tooltip, Box, Typography, ListItemButton
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LayoutDashboard, BookOpen, FileText, Handshake, Package, UserCircle, BarChart3, Activity
} from 'lucide-react';
import { TOPBAR_HEIGHT, DRAWER_WIDTH } from '../constants/layout'; // changed: import DRAWER_WIDTH
import { useSidebar } from '../contexts/SidebarContext';

// Replace the role map to remove borrower
const navLinksByRole = {
  librarian: [
    { href: '/librarian/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/librarian/books', icon: BookOpen, label: 'Books' },
    { href: '/librarian/documents', icon: FileText, label: 'Documents' },
    { href: '/librarian/storage', icon: Package, label: 'Storage' },
    { href: '/librarian/borrows', icon: Handshake, label: 'Borrows' },
  ],
  admin: [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/books', icon: BookOpen, label: 'Books' },
    { href: '/admin/documents', icon: FileText, label: 'Documents' },
    { href: '/admin/borrows', icon: Handshake, label: 'Borrows' },
    { href: '/admin/users', icon: UserCircle, label: 'Users' },
    { href: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { href: '/admin/system', icon: Activity, label: 'System' }, // added
  ],
};

const Sidebar = () => {
  const theme = useTheme();
  const { isMobile, mobileOpen, closeMobile, collapsed, drawerWidth } = useSidebar();

  // Simplify role detection (borrower sidebar removed)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role =
    user.Role === 'Staff' && user.staff?.Position === 'Librarian'
      ? 'librarian'
      : 'admin';

  const navLinks = navLinksByRole[role] || navLinksByRole.admin;

  return (
    <>
      <Drawer
        sx={{
          // On mobile, the context width is 0 (for content margin). Use a fixed paper width instead.
          width: isMobile ? DRAWER_WIDTH : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: isMobile ? DRAWER_WIDTH : drawerWidth,
            boxSizing: 'border-box',
            bgcolor: theme.palette.background.paper,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            borderRadius: 0,
          },
        }}
        {...(isMobile
          ? { variant: 'temporary', open: mobileOpen, onClose: closeMobile, ModalProps: { keepMounted: true } }
          : { variant: 'permanent', open: true })}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: TOPBAR_HEIGHT,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
            px: collapsed ? 1 : 1.25,
          }}
        >
          <Tooltip title="Koronadal City Library" disableHoverListener={!collapsed}>
            <Box
              sx={{
                width: '100%',
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              <Box
                component="img"
                src="/logo.png"
                alt="Logo"
                sx={{
                  width: 28,
                  height: 28,
                  objectFit: 'contain',
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  bgcolor: '#fff',
                  p: 0.25,
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="subtitle2"
                sx={{
                  display: collapsed ? 'none' : 'block',
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0.3,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}
              >
                Koronadal City Library
              </Typography>
            </Box>
          </Tooltip>
        </Box>

        {/* Navigation */}
        <Box sx={{ flexGrow: 1, mt: 0.5, px: collapsed ? 0.5 : 1 }}>
          <List
            sx={{
              pt: 0.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.25,
            }}
          >
            {navLinks.map(({ href, icon: Icon, label }) => {
              const Item = (
                <NavLink key={href} to={href} style={{ textDecoration: 'none' }}>
                  {({ isActive }) => {
                    const activeBg = alpha(theme.palette.primary.main, 0.08);
                    return (
                      <ListItemButton
                        selected={isActive}
                        sx={{
                          position: 'relative',
                          borderRadius: 8,
                          px: collapsed ? 1 : 1.25,
                          py: 0.6,
                          minHeight: 36,
                          gap: collapsed ? 0 : 0.75,
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                          backgroundColor: isActive ? activeBg : 'transparent',
                          transition: 'background-color .18s, color .18s',
                          '&:hover': {
                            backgroundColor: isActive
                              ? alpha(theme.palette.primary.main, 0.12)
                              : alpha(theme.palette.primary.main, 0.06),
                            color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                          }
                        }}
                        onClick={() => { if (isMobile) closeMobile(); }}
                      >
                        <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                          <Icon size={18} />
                        </ListItemIcon>
                        {!collapsed && (
                          <ListItemText
                            primary={label}
                            primaryTypographyProps={{
                              fontSize: 13,
                              fontWeight: isActive ? 700 : 500,
                              letterSpacing: 0.2,
                            }}
                          />
                        )}
                      </ListItemButton>
                    );
                  }}
                </NavLink>
              );
              return collapsed ? (
                <Tooltip key={href} title={label} placement="right">{Item}</Tooltip>
              ) : Item;
            })}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar;