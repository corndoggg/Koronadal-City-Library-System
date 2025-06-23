import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  Typography,
  Divider,
  ListItemButton,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  Badge,
  useMediaQuery,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Handshake,
  Package,
  UserCircle,
} from 'lucide-react';
import { LightMode, DarkMode, Settings, Logout, Person } from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';

const navLinks = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/books', icon: BookOpen, label: 'Books' },
  { href: '/documents', icon: FileText, label: 'Documents' },
  { href: '/borrow', icon: Handshake, label: 'Borrow' },
  { href: '/storage', icon: Package, label: 'Storage' },
];

const Sidebar = ({ drawerWidth = 240 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { toggleColorMode } = useThemeContext();
  const [anchorEl, setAnchorEl] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const open = Boolean(anchorEl);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const showToast = (msg, sev = 'info') =>
    setToast({ open: true, message: msg, severity: sev });

  const handleThemeToggle = () => {
    toggleColorMode();
    showToast(`Switched to ${isDark ? 'light' : 'dark'} mode`, 'success');
  };

  return (
    <>
      <Drawer
        variant="permanent"
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
          },
        }}
      >
        {/* Logo and Title */}
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
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="Logo"
            sx={{
              width: 36,
              height: 36,
              objectFit: 'contain',
              borderRadius: 2,
              boxShadow: 1,
              bgcolor: '#fff',
              p: 0.5,
            }}
          />
          <Typography
            variant="subtitle2"
            fontWeight="bold"
            fontSize={11}
            noWrap
            sx={{ color: theme.palette.primary.contrastText, letterSpacing: 1 }}
          >
            Koronadal City Library
          </Typography>
        </Box>

        <Divider />

        {/* Navigation */}
        <Box sx={{ flexGrow: 1, mt: 1 }}>
          <List>
            {navLinks.map(({ href, icon: Icon, label }) => (
              <NavLink key={href} to={href} style={{ textDecoration: 'none' }}>
                {({ isActive }) => {
                  const activeBg = alpha(theme.palette.primary.main, isDark ? 0.22 : 0.13);
                  return (
                    <Tooltip title={label} placement="right" arrow disableHoverListener={!isMobile}>
                      <ListItemButton
                        selected={isActive}
                        sx={{
                          mx: 1.5,
                          my: 0.5,
                          borderRadius: 2,
                          px: 2.5,
                          py: 1.25,
                          color: isActive
                            ? theme.palette.primary.main
                            : theme.palette.text.secondary,
                          backgroundColor: isActive ? activeBg : 'transparent',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            transform: 'scale(1.03)',
                          },
                          transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                          fontWeight: isActive ? 700 : 500,
                          boxShadow: isActive ? 2 : 0,
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            mr: 2,
                            justifyContent: 'center',
                            color: isActive
                              ? theme.palette.primary.main
                              : theme.palette.text.primary,
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
                    </Tooltip>
                  );
                }}
              </NavLink>
            ))}
          </List>
        </Box>

        {/* Bottom Section: Profile and Theme Toggle */}
        <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                '&:hover': { opacity: 0.85 },
                px: 0.5,
                py: 0.5,
                borderRadius: 2,
                transition: 'background 0.15s',
                background: alpha(theme.palette.primary.main, 0.04),
              }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <Tooltip title="Account settings">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: '#fff' }}>
                  <UserCircle size={20} />
                </Avatar>
              </Tooltip>
              <Typography variant="body2" fontWeight={600}>
                Profile
              </Typography>
            </Box>

            <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
              <IconButton
                size="small"
                onClick={handleThemeToggle}
                sx={{
                  color: theme.palette.text.primary,
                  bgcolor: alpha(theme.palette.primary.main, 0.07),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.18),
                  },
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
          sx: {
            mt: 1.2,
            minWidth: 170,
            borderRadius: 2,
            boxShadow: 3,
            p: 0.5,
          },
        }}
      >
        <MenuItem onClick={() => showToast('Profile clicked')}>
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
