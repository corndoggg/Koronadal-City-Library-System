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
import {
  ChevronLeft,
  ChevronRight,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';

const navLinks = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/books', icon: BookOpen, label: 'Books' },
  { href: '/documents', icon: FileText, label: 'Documents' },
  { href: '/borrow', icon: Handshake, label: 'Borrow' },
  { href: '/storage', icon: Package, label: 'Storage' },
];

const Sidebar = ({
  collapsed = false,
  drawerWidth = 240,
  collapsedWidth = 64,
  toggleCollapse,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { toggleColorMode } = useThemeContext();
  const [anchorEl, setAnchorEl] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const open = Boolean(anchorEl);

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
          width: collapsed ? collapsedWidth : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: collapsed ? collapsedWidth : drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: `1px solid ${theme.palette.divider}`,
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        }}
      >
        {/* Top Controls */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: collapsed ? 'center' : 'space-between',
              alignItems: 'center',
              px: 1,
              py: 1.2,
            }}
          >
            <Tooltip title="Toggle sidebar">
              <IconButton
                size="small"
                onClick={toggleCollapse}
                sx={{
                  color: theme.palette.text.primary,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
              </IconButton>
            </Tooltip>

            {!collapsed && (
              <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
                <IconButton
                  size="small"
                  onClick={handleThemeToggle}
                  sx={{
                    color: theme.palette.text.primary,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Logo + Title */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1.5 : 2,
              py: 1,
              gap: 1,
            }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="Logo"
              sx={{
                width: 32,
                height: 32,
                objectFit: 'contain',
              }}
            />
            {!collapsed && (
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                color="primary"
                fontSize={13}
                noWrap
              >
                Koronadal City Library
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 1 }} />

          {/* Navigation */}
          <List>
            {navLinks.map(({ href, icon: Icon, label }) => (
              <NavLink key={href} to={href} style={{ textDecoration: 'none' }}>
                {({ isActive }) => {
                  const activeBg = alpha(theme.palette.primary.main, isDark ? 0.2 : 0.1);
                  return (
                    <ListItemButton
                      selected={isActive}
                      sx={{
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        px: collapsed ? 1.5 : 2.5,
                        py: 1,
                        mx: 1,
                        borderRadius: 2,
                        backgroundColor: isActive ? activeBg : 'transparent',
                        color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                          transform: 'scale(1.02)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: collapsed ? 0 : 2,
                          justifyContent: 'center',
                          color: isActive
                            ? theme.palette.primary.main
                            : theme.palette.text.primary,
                        }}
                      >
                        <Icon size={20} />
                      </ListItemIcon>
                      {!collapsed && (
                        <ListItemText
                          primary={label}
                          primaryTypographyProps={{ fontSize: 14 }}
                        />
                      )}
                    </ListItemButton>
                  );
                }}
              </NavLink>
            ))}
          </List>
        </Box>

        {/* Account Settings Section */}
        <Box sx={{ px: 1.5, py: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 1,
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 },
            }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <Tooltip title="Account settings">
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                <UserCircle size={20} />
              </Avatar>
            </Tooltip>
            {!collapsed && (
              <Typography variant="body2" fontWeight={500}>
                Profile
              </Typography>
            )}
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
        PaperProps={{ sx: { mt: 1.2, minWidth: 160 } }}
      >
        <MenuItem onClick={() => showToast('Profile clicked')}>Profile</MenuItem>
        <MenuItem onClick={() => showToast('Settings clicked')}>Settings</MenuItem>
        <Divider />
        <MenuItem onClick={() => showToast('Logged out')}>Logout</MenuItem>
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