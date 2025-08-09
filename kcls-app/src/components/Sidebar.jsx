import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer, List, ListItemIcon, ListItemText, Tooltip, Box, Typography, Divider,
  ListItemButton, IconButton, Avatar, Menu, MenuItem, Snackbar, Alert, useMediaQuery,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LayoutDashboard, BookOpen, FileText, Handshake, Package, UserCircle,
  Menu as MenuIcon
} from 'lucide-react';
import { LightMode, DarkMode, Logout, Person } from '@mui/icons-material';
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
    { href: '/admin/users', icon: UserCircle, label: 'Users' },
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
  const [anchorEl, setAnchorEl] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const open = Boolean(anchorEl);
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
    setAnchorEl(null);
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
            bgcolor: 'background.paper',
            borderRight: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowX: 'hidden',
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
            px: 2.5,
            py: 2,
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            boxShadow: 2,
            position: 'relative'
          }}
        >
          <Box component="img" src="/logo.png" alt="Logo"
            sx={{
              width: 36, height: 36, objectFit: 'contain', borderRadius: 2, boxShadow: 1,
              bgcolor: '#fff', p: 0.5
            }}
          />
          <Typography variant="subtitle2" fontWeight="bold" fontSize={11} noWrap sx={{ letterSpacing: 1 }}>
            Koronadal City Library
          </Typography>
        </Box>

        <Divider />

        {/* Navigation */}
        <Box sx={{ flexGrow: 1, mt: 1 }}>
          <List sx={{ pt: 0 }}>
            {navLinks.map(({ href, icon: Icon, label }) => (
              <NavLink key={href} to={href} style={{ textDecoration: 'none' }}>
                {({ isActive }) => {
                  const activeBg = alpha(theme.palette.primary.main, isDark ? 0.22 : 0.13);
                  return (
                    <ListItemButton
                      selected={isActive}
                      sx={{
                        position: 'relative',
                        mx: 1.2,
                        my: 0.5,
                        borderRadius: 2.5,
                        px: 2.5,
                        py: 1.1,
                        minHeight: 48,
                        color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                        backgroundColor: isActive ? activeBg : 'transparent',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateX(2px)'
                        },
                        transition: 'all 0.22s cubic-bezier(.4,1.3,.6,1)',
                        fontWeight: isActive ? 700 : 500,
                        boxShadow: isActive ? 2 : 0,
                      }}
                    >
                      {activeIndicator(isActive)}
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: 2,
                          justifyContent: 'center',
                          color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                        }}
                      >
                        <Icon size={22} />
                      </ListItemIcon>
                      <ListItemText
                        primary={label}
                        primaryTypographyProps={{
                          fontSize: 15,
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

        {/* Footer / Profile */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              '&:hover': { opacity: 0.9 },
              px: 0.5,
              py: 0.5,
              borderRadius: 2,
              transition: 'background 0.15s',
              background: alpha(theme.palette.primary.main, 0.05),
            }}
            onClick={e => setAnchorEl(e.currentTarget)}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              {(user.Firstname?.[0] || '') + (user.Lastname?.[0] || '') || <UserCircle size={18} />}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                noWrap
                sx={{ maxWidth: 140 }}
              >
                {user.Firstname ? `${user.Firstname} ${user.Lastname}` : 'Profile'}
              </Typography>
              <Chip
                size="small"
                label={roleLabel}
                sx={{
                  mt: 0.3,
                  height: 18,
                  fontSize: 10,
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: theme.palette.primary.main,
                  letterSpacing: 0.5
                }}
              />
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: 0.8,
              justifyContent: 'space-between'
            }}
          >
            <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
              <IconButton
                size="small"
                onClick={handleThemeToggle}
                sx={{
                  color: theme.palette.text.primary,
                  bgcolor: alpha(theme.palette.primary.main, 0.07),
                  '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.18) }
                }}
              >
                {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Logout">
              <IconButton
                size="small"
                color="error"
                onClick={() => setLogoutOpen(true)}
                sx={{
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                  '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.18) }
                }}
              >
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Drawer>

      {/* Account Menu (Profile only now) */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { mt: 1.2, minWidth: 170, borderRadius: 2, boxShadow: 3, p: 0.5 } }}
      >
        <MenuItem onClick={() => { setAccountModalOpen(true); setAnchorEl(null); }}>
          <Person fontSize="small" sx={{ mr: 1 }} /> Profile
        </MenuItem>
      </Menu>

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