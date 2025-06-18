import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Handshake,
  Package,
} from 'lucide-react';

const navLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/books', icon: BookOpen, label: 'Books' },
  { href: '/documents', icon: FileText, label: 'Documents' },
  { href: '/borrow', icon: Handshake, label: 'Borrow' },
  { href: '/storage', icon: Package, label: 'Storage' },
];

const Sidebar = ({ collapsed = false, drawerWidth = 240 }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? 72 : drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? 72 : drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid #e0e0e0',
          transition: 'width 0.3s ease',
        },
      }}
    >
      <Box
        sx={{
          p: collapsed ? 1 : 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: 96,
        }}
      >
        <Box
          sx={{
            width: collapsed ? 52 : 52,
            height: collapsed ? 52 : 52,
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
            fontWeight="bold"
            color="primary"
            sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}
          >
            Koronadal City
          </Typography>
        )}
      </Box>

      <Divider />

      <List>
        {navLinks.map(({ href, icon: Icon, label }) => {
          const isActive = location.pathname === href;

          const listItem = (
            <ListItemButton
              key={href}
              selected={isActive}
              onClick={() => navigate(href)}
              sx={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1.5 : 3,
                py: 1.5,
                my: 0.5,
                borderRadius: 2,
                mx: 1,
                backgroundColor: isActive ? 'primary.main' : 'transparent',
                color: isActive ? '#fff' : 'text.primary',
                '&:hover': {
                  backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? '#fff' : 'inherit',
                  minWidth: 0,
                  mr: collapsed ? 0 : 2,
                  justifyContent: 'center',
                }}
              >
                <Icon size={20} />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              )}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip key={href} title={label} placement="right">
              <Box>{listItem}</Box>
            </Tooltip>
          ) : (
            listItem
          );
        })}
      </List>
    </Drawer>
  );
};

export default Sidebar;
