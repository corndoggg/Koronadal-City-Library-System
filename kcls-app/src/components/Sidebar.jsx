import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer, List, ListItemIcon, ListItemText, Tooltip, Box, Typography, Divider,
  ListItemButton, IconButton, Avatar, Snackbar, Alert, useMediaQuery,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LayoutDashboard, BookOpen, FileText, Handshake, Package, UserCircle,
  Menu as MenuIcon
} from 'lucide-react';
import { LightMode, DarkMode, Logout } from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import AccountInfoModal from './AccountInfoModal';

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

const drawerWidth = 240;

const Sidebar = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { toggleColorMode } = useThemeContext();
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.Role === 'Staff' && user.staff?.Position === 'Librarian'
    ? 'librarian'
    : user.Role === 'Staff'
    ? 'admin'
    : user.Role === 'Borrower'
    ? 'borrower'
    : 'admin';

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const navLinks = navLinksByRole[role] || [];

  const showToast = (msg, sev = 'info') => setToast({ open: true, message: msg, severity: sev });
  const handleThemeToggle = () => { toggleColorMode(); showToast(`Switched to ${isDark ? 'light' : 'dark'} mode`, 'success'); };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const activeIndicator = (isActive) => isActive && (
    <Box
      sx={{
        position: 'absolute',
        left: 6,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 4,
        height: 28,
        borderRadius: 2,
        bgcolor: theme.palette.primary.main,
        boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.3)}`
      }}
    />
  );

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
              boxShadow: theme.shadows[3],
              '&:hover': { backgroundColor: theme.palette.action.hover },
            }}
            size="small"
          >
            <MenuIcon size={20} />
          </IconButton>
        </Tooltip>
      )}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: theme.palette.background.default,
            borderRight: `2px solid ${alpha(theme.palette.divider, 0.9)}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowX: 'hidden',
            borderRadius: 0,              // boxy
            boxShadow: '0 0 0 1px rgba(0,0,0,0.05)',
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
            gap: 1.5,
            px: 2,
            py: 1.75,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.text.primary,
            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.08)',
            borderRadius: 0,    // boxy
          }}
        >
          <Box component="img" src="/logo.png" alt="Logo"
            sx={{
              width: 40, height: 40, objectFit: 'contain',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
              bgcolor: '#fff',
              p: 0.5,
              borderRadius: 1    // slight
            }}
          />
          <Typography variant="subtitle2" fontWeight={800} fontSize={12} noWrap letterSpacing={0.5}>
            Koronadal City Library
          </Typography>
        </Box>

        {/* Navigation */}
        <Box sx={{ flexGrow: 1, mt: 1.5, px: 1.5 }}>
          <List
            sx={{
              pt: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {navLinks.map(({ href, icon: Icon, label }) => (
              <NavLink key={href} to={href} style={{ textDecoration: 'none' }}>
                {({ isActive }) => {
                  const activeBg = alpha(theme.palette.primary.main, 0.14);
                  return (
                    <ListItemButton
                      selected={isActive}
                      sx={{
                        position: 'relative',
                        borderRadius: 1, // sharper
                        px: 2,
                        py: 1.1,
                        minHeight: 46,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        border: `1.5px solid ${isActive
                          ? alpha(theme.palette.primary.main, 0.6)
                          : alpha(theme.palette.divider, 0.8)}`,
                        backgroundColor: isActive ? activeBg : alpha(theme.palette.background.paper, 0.7),
                        boxShadow: isActive ? `0 0 0 1px ${alpha(theme.palette.primary.main, .4)}` : '0 1px 0 rgba(0,0,0,0.04)',
                        transition: 'border-color .18s, background .18s, transform .18s',
                        color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                        '&:hover': {
                          backgroundColor: isActive
                            ? alpha(theme.palette.primary.main, 0.18)
                            : alpha(theme.palette.primary.main, 0.08),
                          borderColor: isActive
                            ? theme.palette.primary.main
                            : alpha(theme.palette.primary.main, 0.5),
                          transform: 'translateY(-2px)',
                        }
                      }}
                    >
                      {activeIndicator(isActive)}
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                        }}
                      >
                        <Icon size={22} />
                      </ListItemIcon>
                      <ListItemText
                        primary={label}
                        primaryTypographyProps={{
                          fontSize: 14.5,
                          fontWeight: isActive ? 700 : 500,
                          letterSpacing: 0.3,
                        }}
                      />
                    </ListItemButton>
                  );
                }}
              </NavLink>
            ))}
          </List>
        </Box>

        {/* Footer / Profile */}
        <Box
          sx={{
            px: 1.5,
            py: 1.75,
            borderTop: `2px solid ${alpha(theme.palette.divider, 0.9)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
            background: alpha(theme.palette.background.paper, 0.9)
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              cursor: 'pointer',
              p: 1,
              borderRadius: 1,
              border: `1.5px solid ${alpha(theme.palette.primary.main, 0.4)}`,
              background: alpha(theme.palette.primary.main, 0.05),
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.1),
                borderColor: theme.palette.primary.main
              },
              transition: 'all .18s'
            }}
            onClick={() => setAccountModalOpen(true)}   // CHANGED: open modal directly
          >
            <Avatar
              variant="rounded"
              sx={{
                width: 42,
                height: 42,
                bgcolor: theme.palette.primary.main,
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                border: '2px solid #fff',
                boxShadow: '0 0 0 1.5px ' + alpha(theme.palette.primary.main, 0.6),
                borderRadius: 1
              }}
            >
              {(user.Firstname?.[0] || '') + (user.Lastname?.[0] || '') || <UserCircle size={18} />}
            </Avatar>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                variant="body2"
                fontWeight={700}
                lineHeight={1.1}
                noWrap
              >
                {user.Firstname ? `${user.Firstname} ${user.Lastname}` : 'Profile'}
              </Typography>
              <Chip
                size="small"
                label={roleLabel}
                sx={{
                  mt: 0.5,
                  height: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 0.75,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  letterSpacing: 0.6
                }}
              />
            </Box>
          </Box>

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                '& > *': {
                  flex: 1,
                  border: `1.5px solid ${alpha(theme.palette.divider, 0.9)}`,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.background.paper, 0.6),
                  transition: 'all .18s'
                },
                '& > *:hover': {
                  borderColor: alpha(theme.palette.primary.main, 0.6),
                  background: alpha(theme.palette.primary.main, 0.08)
                }
              }}
            >
              <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
                <IconButton size="small" onClick={handleThemeToggle}>
                  {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Logout">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setLogoutOpen(true)}
                  sx={{
                    '&:hover': { background: alpha(theme.palette.error.main, 0.12) }
                  }}
                >
                  <Logout fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
        </Box>
      </Drawer>

      {/* Logout Confirm Dialog */}
      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to log out?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLogoutOpen(false)} variant="text">Cancel</Button>
          <Button
            onClick={handleLogout}
            color="error"
            variant="contained"
            disableElevation
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>

      <AccountInfoModal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        user={user}
      />

      {/* Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </>
  );
};

export default Sidebar;