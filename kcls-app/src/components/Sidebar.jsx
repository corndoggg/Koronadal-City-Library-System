import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  Typography,
  ListItemButton,
  Stack,
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
  FileSearch,
  BadgeDollarSign,
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
        { href: '/librarian/fines', icon: BadgeDollarSign, label: 'Fines' },
      ]
    },
    {
      title: 'Administration',
      items: [
        { href: '/librarian/reports', icon: BarChart3, label: 'Reports' },
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
        { href: '/admin/borrows', icon: ClipboardList, label: 'Borrows' },
        { href: '/admin/fines', icon: BadgeDollarSign, label: 'Fines' }
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
  ]
};

const NavigationItem = ({ collapsed, href, icon, label, onNavigate }) => {
  const Icon = icon;
  const theme = useTheme();

  const listItem = (
    <ListItemButton
      component={NavLink}
      to={href}
      onClick={onNavigate}
      sx={{
        position: 'relative',
  borderRadius: collapsed ? '50%' : 2,
  px: collapsed ? 0 : 1.75,
  py: collapsed ? 0 : 0.9,
  width: collapsed ? 40 : '100%',
  height: collapsed ? 40 : 'auto',
  mx: collapsed ? 'auto' : 0,
  minHeight: collapsed ? 40 : 44,
        gap: collapsed ? 0 : 1.25,
        justifyContent: collapsed ? 'center' : 'flex-start',
        color: 'text.secondary',
        transition: theme.transitions.create(['background-color', 'color'], {
          duration: theme.transitions.duration.shorter,
        }),
        '& .MuiListItemIcon-root': {
          minWidth: collapsed ? 0 : 24,
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: theme.transitions.create('color', {
            duration: theme.transitions.duration.shorter,
          }),
        },
        '&.active': {
          color: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          '&::before': {
            opacity: collapsed ? 0 : 1,
          },
        },
        '&::before': collapsed
          ? { display: 'none' }
          : {
              content: '""',
              position: 'absolute',
              inset: '16% auto 16% 10px',
              width: 3,
              borderRadius: 2,
              backgroundColor: theme.palette.primary.main,
              opacity: 0,
              transition: theme.transitions.create('opacity', {
                duration: theme.transitions.duration.shorter,
              }),
            },
        '&:hover': {
          color: theme.palette.primary.main,
          backgroundColor: alpha(
            theme.palette.primary.main,
            collapsed ? 0.18 : 0.12
          ),
        },
      }}
    >
      <ListItemIcon>
        <Icon size={18} strokeWidth={2} />
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        />
      )}
    </ListItemButton>
  );

  if (collapsed) {
    return (
      <Tooltip title={label} placement="right">
        <Box>{listItem}</Box>
      </Tooltip>
    );
  }

  return listItem;
};

const Sidebar = () => {
  const theme = useTheme();
  const { isMobile, mobileOpen, closeMobile, collapsed, drawerWidth } = useSidebar();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const role = useMemo(() => {
    if (user.Role === 'Staff' && user.staff?.Position === 'Librarian') {
      return 'librarian';
    }
    return 'admin';
  }, [user]);

  const navSections = useMemo(
    () => navSectionsByRole[role] || navSectionsByRole.admin,
    [role]
  );

  const drawerPaperStyles = useMemo(
    () => ({
      width: isMobile ? DRAWER_WIDTH : drawerWidth,
      boxSizing: 'border-box',
      backgroundColor: theme.palette.background.paper,
      borderRight: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      borderRadius: 0,
    }),
    [drawerWidth, isMobile, theme]
  );

  const handleNavigate = () => {
    if (isMobile) {
      closeMobile();
    }
  };

  return (
    <Drawer
      sx={{
        width: isMobile ? DRAWER_WIDTH : drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': drawerPaperStyles,
      }}
      {...(isMobile
        ? {
            variant: 'temporary',
            open: mobileOpen,
            onClose: closeMobile,
            ModalProps: { keepMounted: true },
          }
        : { variant: 'permanent', open: true })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: TOPBAR_HEIGHT,
          px: collapsed ? 1 : 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
        }}
      >
        <Tooltip title="Koronadal City Library" disableHoverListener={!collapsed}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              width: '100%',
              justifyContent: collapsed ? 'center' : 'flex-start',
              minWidth: 0,
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
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                bgcolor: theme.palette.common.white,
                p: 0.5,
              }}
            />
            {!collapsed && (
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  color: theme.palette.text.primary,
                }}
              >
                Koronadal City Library
              </Typography>
            )}
          </Stack>
        </Tooltip>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          px: collapsed ? 0.5 : 1.75,
          py: 1.5,
        }}
      >
        {navSections.map((section, index) => (
          <Box
            key={section.title}
            sx={{ mt: index === 0 ? 0 : collapsed ? 1 : 2.5 }}
          >
            {collapsed ? null : (
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  color: alpha(theme.palette.text.secondary, 0.75),
                  fontWeight: 700,
                  letterSpacing: 1,
                  pb: 1,
                  pl: 0.5,
                }}
              >
                {section.title}
              </Typography>
            )}
            <List
              disablePadding
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: collapsed ? 0 : 0.75,
              }}
            >
              {section.items.map((item) => (
                <NavigationItem
                  key={item.href}
                  collapsed={collapsed}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  onNavigate={handleNavigate}
                />
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Drawer>
  );
};

export default Sidebar;