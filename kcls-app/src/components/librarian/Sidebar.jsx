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
  Typography
} from '@mui/material';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Handshake,
  Package
} from 'lucide-react';
import { motion } from 'framer-motion';

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
        [`& .MuiDrawer-paper`]: {
          width: collapsed ? 72 : drawerWidth,
          boxSizing: 'border-box',
          bgcolor: '#fff',
          borderRight: '1px solid #e0e0e0',
        },
      }}
    >
      <Box sx={{ px: collapsed ? 1 : 2, py: 3 }}>
        {!collapsed && (
          <Typography variant="h6" fontWeight="bold" color="primary" noWrap>
            📚 Librarian
          </Typography>
        )}
      </Box>

      <List>
        {navLinks.map(({ href, icon: Icon, label }) => {
          const isActive = location.pathname === href;

          const listItem = (
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              key={href}
              onClick={() => navigate(href)}
            >
              <ListItemButton
                selected={isActive}
                sx={{
                  px: collapsed ? 1 : 2,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  mb: 1,
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? '#fff' : 'inherit',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'grey.100',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? '#fff' : 'inherit', minWidth: 0, mr: collapsed ? 0 : 2 }}>
                  <Icon size={20} />
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 500 }} />
                )}
              </ListItemButton>
            </motion.div>
          );

          return collapsed ? (
            <Tooltip key={href} title={label} placement="right">
              {listItem}
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
