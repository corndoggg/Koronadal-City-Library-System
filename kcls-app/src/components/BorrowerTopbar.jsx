import React, { useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Badge,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Notifications as NotificationsIcon,
  DarkMode,
  LightMode,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { Handshake, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import { TOPBAR_HEIGHT } from '../constants/layout';
import { useThemeContext } from '../contexts/ThemeContext';
import AccountInfoModal from './AccountInfoModal';
import NotificationModal from './NotificationModal';

const API_BASE = import.meta.env.VITE_API_BASE;

const BorrowerTopbar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation(); // added
  const { toggleColorMode } = useThemeContext();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isDark = theme.palette.mode === 'dark';
  const isOnBorrows = location.pathname.startsWith('/borrower/borrow'); // added

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Account
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [menuEl, setMenuEl] = useState(null);
  const menuOpen = Boolean(menuEl);

  // Logout confirm
  const [logoutOpen, setLogoutOpen] = useState(false);

  const fetchUnread = async () => {
    try {
      if (!user?.UserID) return;
      const res = await axios.get(`${API_BASE}/users/${user.UserID}/notifications/unread-count`);
      setUnreadCount(Number(res.data?.unread || 0));
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.UserID]);

  useEffect(() => {
    if (!notifOpen) fetchUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen]);

  const handleNotifNavigate = (type, id) => {
    // Borrower routes
    if (type === 'Borrow') {
      navigate(`/borrower/borrow?id=${id}`);
    } else if (type === 'Document' || type === 'Book') {
      navigate(`/borrower/browse?id=${id}`);
    }
    setNotifOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          height: TOPBAR_HEIGHT,
          bgcolor: theme.palette.background.paper,
          borderBottom: `2px solid ${alpha(theme.palette.divider, 0.9)}`,
          width: '100%',
        }}
      >
        {/* Left: Logo + Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          <Box
            component="span"
            sx={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: { xs: 'none', sm: 'inline' }, // hide on very small screens
            }}
          >
            Koronadal City Library
          </Box>
        </Box>

        {/* Right: actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Primary action first: Borrows/Browse */}
          <Tooltip title={isOnBorrows ? 'Browse Library' : 'My Borrows'}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => navigate(isOnBorrows ? '/borrower/browse' : '/borrower/borrow')}
              startIcon={isOnBorrows ? <Search size={16} /> : <Handshake size={16} />}
              sx={{ minHeight: 30, borderRadius: 1.5, textTransform: 'none', px: 1.25 }}
            >
              {isOnBorrows ? 'Browse' : 'Borrows'}
            </Button>
          </Tooltip>

          {/* Notifications (now after the button) */}
          <Tooltip title="Notifications">
            <IconButton size="small" onClick={() => setNotifOpen(true)}>
              <Badge color="error" badgeContent={unreadCount} max={99}>
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
            <IconButton size="small" onClick={toggleColorMode}>
              {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Account menu */}
          <Tooltip title="Account">
            <IconButton size="small" onClick={(e) => setMenuEl(e.currentTarget)}>
              <Avatar
                variant="rounded"
                sx={{
                  width: 28, height: 28,
                  bgcolor: theme.palette.primary.main, color: '#fff',
                  fontSize: 12, fontWeight: 700, borderRadius: 1
                }}
              >
                {(user.Firstname?.[0] || '') + (user.Lastname?.[0] || '')}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={menuEl}
            open={menuOpen}
            onClose={() => setMenuEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              onClick={() => {
                setMenuEl(null);
                setAccountModalOpen(true);
              }}
            >
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuEl(null);
                setLogoutOpen(true);
              }}
              sx={{ color: theme.palette.error.main }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Logout Confirm */}
      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Logout</DialogTitle>
        <DialogContent>Are you sure you want to log out?</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLogoutOpen(false)} variant="text">Cancel</Button>
          <Button onClick={handleLogout} color="error" variant="contained" disableElevation>Logout</Button>
        </DialogActions>
      </Dialog>

      <AccountInfoModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} user={user} />

      <NotificationModal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        userId={user?.UserID}
        onNavigate={handleNotifNavigate}
      />
    </>
  );
};

export default BorrowerTopbar;