import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Drawer, List, ListItemIcon, ListItemText, Tooltip, Box, Typography, ListItemButton, Divider
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LayoutDashboard,
  BookOpen,
  Files,
  Warehouse,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  FileSearch
} from 'lucide-react';
import { TOPBAR_HEIGHT, DRAWER_WIDTH } from '../constants/layout'; // changed: import DRAWER_WIDTH
import { useSidebar } from '../contexts/SidebarContext';

// Replace the role map to remove borrower & add section groupings
const navSectionsByRole = {
  librarian: [
    {
      title: 'Overview',
      items: [
        { href: '/librarian/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ]
    },
    {
      title: 'Collections',
      items: [
        { href: '/librarian/books', icon: BookOpen, label: 'Books' },
        { href: '/librarian/documents', icon: Files, label: 'Documents' },
        { href: '/librarian/storage', icon: Warehouse, label: 'Storage' },
      ]
    },
    {
      title: 'Transactions',
      items: [
        { href: '/librarian/borrows', icon: ClipboardList, label: 'Borrows' },
      ]
    }
  ],
  admin: [
    {
      title: 'Overview',
      items: [
        { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
      ]
    },
    {
      title: 'Collections',
      items: [
        { href: '/admin/books', icon: BookOpen, label: 'Books' },
        { href: '/admin/documents', icon: Files, label: 'Documents' }
      ]
    },
    {
      title: 'Operations',
      items: [
        { href: '/admin/borrows', icon: ClipboardList, label: 'Borrows' }
      ]
    },
    {
      title: 'Administration',
      items: [
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/reports', icon: BarChart3, label: 'Reports' },
        { href: '/admin/system', icon: Settings, label: 'System' },
        { href: '/admin/audit-logs', icon: FileSearch, label: 'Audit Logs' }
      ]
    }
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

  const navSections = navSectionsByRole[role] || navSectionsByRole.admin;

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
          {navSections.map((section, index) => (
            <Box key={section.title} sx={{ mt: index === 0 ? 0 : 2 }}>
              {collapsed ? (
                index === 0 ? null : <Divider sx={{ my: 1.25, opacity: 0.35 }} />
              ) : (
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    color: alpha(theme.palette.text.secondary, 0.8),
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    pl: 0.75,
                    pb: 0.5
                  }}
                >
                  {section.title}
                </Typography>
              )}
              <List
                sx={{
                  pt: collapsed ? 0.25 : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25,
                }}
              >
                {section.items.map(({ href, icon: Icon, label }) => {
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
                              py: 0.8,
                              minHeight: 40,
                              gap: collapsed ? 0 : 0.75,
                              justifyContent: collapsed ? 'center' : 'flex-start',
                              color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                              backgroundColor: isActive ? activeBg : 'transparent',
                              transition: 'background-color .18s, color .18s',
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                left: 6,
                                top: '15%',
                                bottom: '15%',
                                width: 3,
                                borderRadius: 2,
                                backgroundColor: theme.palette.primary.main,
                                opacity: isActive ? 1 : 0,
                                transition: 'opacity .2s'
                              },
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
                  ) : (
                    <React.Fragment key={href}>{Item}</React.Fragment>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar;