import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Handshake,
  Package,
} from 'lucide-react';

const navLinks = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/books', icon: BookOpen, label: 'Books' },
  { href: '/documents', icon: FileText, label: 'Documents' },
  { href: '/borrow', icon: Handshake, label: 'Borrow' },
  { href: '/storage', icon: Package, label: 'Storage' },
];

const Sidebar = ({ collapsed = false, drawerWidth = 240, collapsedWidth=64 }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
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
          zIndex: 1300,
        },
      }}
    >
      {/* Logo + Title */}
      <Box
        sx={{
          p: collapsed ? 2 : 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: 96,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            mb: collapsed ? 0 : 1,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="Koronadal City Logo"
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </Box>
        {!collapsed && (
          <Typography
            variant="subtitle1"
            fontSize={13}
            fontWeight="bold"
            color="primary"
            sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}
          >
            Koronadal City Library
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Navigation Links */}
      <List>
        {navLinks.map(({ href, icon: Icon, label }) => (
          <NavLink key={href} to={href} style={{ textDecoration: 'none' }}>
            {({ isActive }) => {
              const activeBg = isDarkMode ? theme.palette.primary.dark : '#e0f2ff';
              const activeColor = isDarkMode ? '#fff' : theme.palette.primary.main;

              const listItem = (
                <ListItemButton
                  selected={isActive}
                  sx={{
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: collapsed ? 1.5 : 2,
                    py: 0.2,
                    my: 0.5,
                    borderRadius: 0.2,
                    mx: 0.8,
                    backgroundColor: isActive ? activeBg : 'transparent',
                    color: isActive ? activeColor : 'text.primary',
                    '&:hover': {
                      backgroundColor: isActive
                        ? activeBg
                        : theme.palette.action.hover,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? activeColor : 'inherit',
                      minWidth: 0,
                      mr: collapsed ? 0 : 2,
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={24} />
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{ fontWeight: 300, fontSize: 16, }}
                    />
                  )}
                </ListItemButton>
              );

              return collapsed ? (
                <Tooltip title={label} placement="right">
                  <Box>{listItem}</Box>
                </Tooltip>
              ) : (
                listItem
              );
            }}
          </NavLink>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
