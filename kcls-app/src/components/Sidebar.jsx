import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Drawer, List, ListItemIcon, ListItemText, Tooltip, Box, Typography, ListItemButton, IconButton, useMediaQuery
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LayoutDashboard, BookOpen, FileText, Handshake, Package, UserCircle,
  Menu as MenuIcon
} from 'lucide-react';
import { DRAWER_WIDTH, TOPBAR_HEIGHT } from '../constants/layout';

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
    { href: '/admin/reports', icon: FileText, label: 'Reports' },
  ],
  borrower: [
    { href: '/borrower/browse', icon: Package, label: 'Browse' },
    { href: '/borrower/borrow', icon: Handshake, label: 'Borrow' },
  ],
};

const Sidebar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.Role === 'Staff' && user.staff?.Position === 'Librarian'
    ? 'librarian'
    : user.Role === 'Staff'
    ? 'admin'
    : user.Role === 'Borrower'
    ? 'borrower'
    : 'admin';

  const navLinks = navLinksByRole[role] || [];

  return (
    <>
      {isMobile && !showMobileSidebar && (
        <Tooltip title="Open menu">
          <IconButton
            onClick={() => setShowMobileSidebar(true)}
            aria-label="Open sidebar"
            sx={{
              position: 'fixed', top: 12, left: 12, zIndex: 1400,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              '&:hover': { backgroundColor: theme.palette.action.hover },
            }}
            size="small"
          >
            <MenuIcon size={18} />
          </IconButton>
        </Tooltip>
      )}
      <Drawer
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
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
          ? { variant: "temporary", open: showMobileSidebar, onClose: () => setShowMobileSidebar(false), ModalProps: { keepMounted: true } }
          : { variant: "permanent", open: true })}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            height: TOPBAR_HEIGHT,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          }}
        >
          <Box component="img" src="/logo.png" alt="Logo"
            sx={{
              width: 26, height: 26, objectFit: 'contain',
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              bgcolor: '#fff',
              p: 0.25,
              borderRadius: 1,
            }}
          />
          <Typography variant="subtitle2" fontWeight={800} fontSize={12} noWrap letterSpacing={0.3}>
            Koronadal City Library
          </Typography>
        </Box>

        {/* Navigation */}
        <Box sx={{ flexGrow: 1, mt: 0.5, px: 1 }}>
          <List
            sx={{
              pt: 0.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.25,
            }}
          >
            {navLinks.map(({ href, icon: Icon, label }) => (
              <NavLink key={href} to={href} style={{ textDecoration: 'none' }}>
                {({ isActive }) => {
                  const activeBg = alpha(theme.palette.primary.main, 0.08);
                  return (
                    <ListItemButton
                      selected={isActive}
                      sx={{
                        position: 'relative',
                        borderRadius: 8,
                        px: 1.25,
                        py: 0.6,
                        minHeight: 36,
                        gap: 0.75,
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
                      onClick={() => { if (isMobile) setShowMobileSidebar(false); }}
                    >
                      <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                        <Icon size={18} />
                      </ListItemIcon>
                      <ListItemText
                        primary={label}
                        primaryTypographyProps={{
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 500,
                          letterSpacing: 0.2,
                        }}
                      />
                    </ListItemButton>
                  );
                }}
              </NavLink>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar;