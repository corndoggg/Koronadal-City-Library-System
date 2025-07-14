import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItemIcon, ListItemText, Tooltip, Box, Typography, Divider,
  ListItemButton, IconButton, Avatar, Menu, MenuItem, Snackbar, Alert, useMediaQuery, Collapse,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LayoutDashboard, BookOpen, FileText, Handshake, Package, UserCircle, Menu as MenuIcon, ChevronDown, ChevronRight,
} from 'lucide-react';
import { LightMode, DarkMode, Settings, Logout, Person } from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import AccountInfoModal from './AccountInfoModal';

const navLinksByRole = {
  librarian: [
    { href: '/librarian/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/librarian/books', icon: BookOpen, label: 'Books' },
    { href: '/librarian/documents', icon: FileText, label: 'Documents' },
    { href: '/librarian/storage', icon: Package, label: 'Storage' },
    {
      icon: Handshake,
      label: 'Borrows',
      subLinks: [
        { href: '/librarian/borrows', label: 'Borrow' },
        { href: '/librarian/return', label: 'Return' },
      ],
    },
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
  const open = Boolean(anchorEl);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [openSub, setOpenSub] = useState({});
  const location = useLocation();

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('User Info:', user);
  const role = user.Role === 'Staff' && user.staff?.Position === 'Librarian'
    ? 'librarian'
    : user.Role === 'Staff'
    ? 'admin'
    : user.Role === 'Borrower'
    ? 'borrower'
    : 'admin'; // fallback

  const showToast = (msg, sev = 'info') => setToast({ open: true, message: msg, severity: sev });
  const handleThemeToggle = () => { toggleColorMode(); showToast(`Switched to ${isDark ? 'light' : 'dark'} mode`, 'success'); };
  const navLinks = navLinksByRole[role] || [];
  const drawerProps = isMobile
    ? { variant: "temporary", open: showMobileSidebar, onClose: () => setShowMobileSidebar(false), ModalProps: { keepMounted: true } }
    : { variant: "permanent", open: true };

  const isSubLinkActive = (subLinks) =>
    subLinks?.some(link => location.pathname === link.href);

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
            transition: 'width 0.2s',
            overflowX: 'hidden',
          },
        }}
        {...drawerProps}
      >
        {/* Logo and Title */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2,
            bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText,
            borderBottomLeftRadius: 16, borderBottomRightRadius: 16, boxShadow: 2,
          }}
        >
          <Box component="img" src="/logo.png" alt="Logo"
            sx={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 2, boxShadow: 1, bgcolor: '#fff', p: 0.5 }}
          />
          <Typography
            variant="subtitle2" fontWeight="bold" fontSize={11} noWrap
            sx={{ color: theme.palette.primary.contrastText, letterSpacing: 1 }}
          >
            Koronadal City Library
          </Typography>
        </Box>
        <Divider />
        {/* Navigation */}
        <Box sx={{ flexGrow: 1, mt: 1 }}>
          <List>
            {navLinks.map(({ href, icon: Icon, label, subLinks }) =>
              subLinks ? (
                <React.Fragment key={label}>
                  <ListItemButton
                    onClick={() => setOpenSub(prev => ({ ...prev, [label]: !prev[label] }))
                    }
                    selected={isSubLinkActive(subLinks)}
                    sx={{
                      mx: 1.5, my: 0.5, borderRadius: 2, px: 2.5, py: 1.25,
                      color: isSubLinkActive(subLinks) ? theme.palette.primary.main : theme.palette.text.secondary,
                      backgroundColor: isSubLinkActive(subLinks)
                        ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.13)
                        : 'transparent',
                      '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08), transform: 'scale(1.03)' },
                      transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                      fontWeight: isSubLinkActive(subLinks) ? 700 : 500, boxShadow: isSubLinkActive(subLinks) ? 2 : 0,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0, mr: 2, justifyContent: 'center',
                        color: isSubLinkActive(subLinks) ? theme.palette.primary.main : theme.palette.text.primary,
                      }}
                    >
                      <Icon size={22} />
                    </ListItemIcon>
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        fontSize: 15, fontWeight: isSubLinkActive(subLinks) ? 700 : 500, letterSpacing: 0.2,
                      }}
                    />
                    {openSub[label] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </ListItemButton>
                  <Collapse in={!!openSub[label]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {subLinks.map(sub => (
                        <NavLink key={sub.href} to={sub.href} style={{ textDecoration: 'none' }}>
                          {({ isActive }) => (
                            <ListItemButton
                              selected={isActive}
                              sx={{
                                mx: 3, my: 0.5, borderRadius: 2, px: 2, py: 1,
                                color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                backgroundColor: isActive
                                  ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.13)
                                  : 'transparent',
                                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
                                fontWeight: isActive ? 700 : 500,
                              }}
                            >
                              <ListItemText
                                primary={sub.label}
                                primaryTypographyProps={{
                                  fontSize: 14, fontWeight: isActive ? 700 : 500,
                                }}
                              />
                            </ListItemButton>
                          )}
                        </NavLink>
                      ))}
                    </List>
                  </Collapse>
                </React.Fragment>
              ) : (
                <NavLink key={href} to={href} style={{ textDecoration: 'none' }}>
                  {({ isActive }) => {
                    const activeBg = alpha(theme.palette.primary.main, isDark ? 0.22 : 0.13);
                    return (
                      <Tooltip title={label} placement="right" arrow disableHoverListener={!isMobile}>
                        <ListItemButton
                          selected={isActive}
                          sx={{
                            mx: 1.5, my: 0.5, borderRadius: 2, px: 2.5, py: 1.25,
                            color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                            backgroundColor: isActive ? activeBg : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08), transform: 'scale(1.03)' },
                            transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                            fontWeight: isActive ? 700 : 500, boxShadow: isActive ? 2 : 0,
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 0, mr: 2, justifyContent: 'center',
                              color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                            }}
                          >
                            <Icon size={22} />
                          </ListItemIcon>
                          <ListItemText
                            primary={label}
                            primaryTypographyProps={{
                              fontSize: 15, fontWeight: isActive ? 700 : 500, letterSpacing: 0.2,
                            }}
                          />
                        </ListItemButton>
                      </Tooltip>
                    );
                  }}
                </NavLink>
              )
            )}
          </List>
        </Box>
        {/* Profile section */}
        <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                '&:hover': { opacity: 0.85 }, px: 0.5, py: 0.5, borderRadius: 2,
                transition: 'background 0.15s', background: alpha(theme.palette.primary.main, 0.04),
              }}
              onClick={e => setAnchorEl(e.currentTarget)}
            >
              <Tooltip title="Account settings">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: '#fff' }}>
                  <UserCircle size={20} />
                </Avatar>
              </Tooltip>
              <Typography variant="body2" fontWeight={600}>
                {user.Firstname ? `${user.Firstname} ${user.Lastname}` : 'Profile'}
              </Typography>
            </Box>
            <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
              <IconButton
                size="small"
                onClick={handleThemeToggle}
                sx={{
                  color: theme.palette.text.primary,
                  bgcolor: alpha(theme.palette.primary.main, 0.07),
                  '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.18) },
                  ml: 1,
                }}
              >
                {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Drawer>
      {/* Account Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { mt: 1.2, minWidth: 170, borderRadius: 2, boxShadow: 3, p: 0.5 },
        }}
      >
        <MenuItem onClick={() => { setAccountModalOpen(true); setAnchorEl(null); }}>
          <Person fontSize="small" sx={{ mr: 1 }} /> Profile
        </MenuItem>
        <MenuItem onClick={() => showToast('Settings clicked')}>
          <Settings fontSize="small" sx={{ mr: 1 }} /> Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => showToast('Logged out')}>
          <Logout fontSize="small" sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>
      {/* Account Info Modal */}
      <AccountInfoModal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        user={user}
      />
      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Sidebar;
