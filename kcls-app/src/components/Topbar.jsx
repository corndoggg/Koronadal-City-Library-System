import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  IconButton,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Stack,
  Paper,
  Container,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { LightMode, DarkMode, Logout, Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AccountInfoModal from './AccountInfoModal';
import NotificationModal from './NotificationModal';
import { useThemeContext } from '../contexts/ThemeContext';
import { TOPBAR_HEIGHT } from '../constants/layout';
import { useSidebar } from '../contexts/SidebarContext';
import { Menu as MenuIcon, KeyboardDoubleArrowLeft, KeyboardDoubleArrowRight } from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_BASE;

const Topbar = () => {
  const theme = useTheme();
  const { toggleColorMode } = useThemeContext();
  const { isMobile, collapsed, toggleCollapse, openMobile } = useSidebar();
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const isDark = theme.palette.mode === 'dark';

  // Notifications state
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Account modal
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Logout confirm
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const fetchUnread = useCallback(async () => {
    try {
      if (!user?.UserID) return;
      const res = await axios.get(`${API_BASE}/users/${user.UserID}/notifications/unread-count`);
      setUnreadCount(Number(res.data?.unread || 0));
    } catch {
      setUnreadCount(0);
    }
  }, [user?.UserID]);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  useEffect(() => {
    if (!notifOpen) fetchUnread();
  }, [notifOpen, fetchUnread]);

  const handleNotifNavigate = (type, id) => {
    const role =
      user.Role === 'Staff' && user.staff?.Position === 'Librarian'
        ? 'librarian'
        : user.Role === 'Staff'
        ? 'admin'
        : user.Role === 'Borrower'
        ? 'borrower'
        : 'admin';

    if (type === 'Borrow') {
      navigate(
        role === 'admin'
          ? `/admin/borrows?id=${id}`
          : role === 'librarian'
          ? `/librarian/borrows?id=${id}`
          : `/borrower/borrow?id=${id}`
      );
    } else if (type === 'Document') {
      navigate(role === 'admin' ? `/admin/documents?id=${id}` : `/librarian/documents?id=${id}`);
    } else if (type === 'Book') {
      navigate(role === 'admin' ? `/admin/books?id=${id}` : `/librarian/books?id=${id}`);
    }
    setNotifOpen(false);
  };

  return (
    <>
      <Paper
        elevation={0}
        square
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1200,
          height: TOPBAR_HEIGHT,
          backdropFilter: 'blur(12px)',
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        }}
      >
        <Container
          maxWidth="xl"
          disableGutters={isMobile}
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 1.25, md: 2 },
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            {isMobile ? (
              <Tooltip title="Open menu">
                <IconButton size="small" onClick={openMobile}>
                  <MenuIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                <IconButton size="small" onClick={toggleCollapse}>
                  {collapsed ? (
                    <KeyboardDoubleArrowRight fontSize="small" />
                  ) : (
                    <KeyboardDoubleArrowLeft fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title="Notifications">
              <IconButton size="small" onClick={() => setNotifOpen(true)}>
                <Badge color="error" badgeContent={unreadCount} max={99}>
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
              <IconButton size="small" onClick={toggleColorMode}>
                {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Account">
              <IconButton size="small" onClick={() => setAccountModalOpen(true)}>
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: theme.palette.primary.main,
                    color: theme.palette.common.white,
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 1.25,
                  }}
                >
                  {(user.Firstname?.[0] || '').toUpperCase() + (user.Lastname?.[0] || '').toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Tooltip title="Logout">
              <IconButton
                size="small"
                color="error"
                onClick={() => setLogoutOpen(true)}
                sx={{
                  color: theme.palette.error.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.12),
                  },
                }}
              >
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Container>
      </Paper>

      {/* Logout Confirm Dialog */}
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

export default Topbar;