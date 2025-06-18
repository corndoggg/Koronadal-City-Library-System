import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Box,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { UserCircle } from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import { useThemeContext } from '../../contexts/ThemeContext';

const Topbar = ({ toggleMobileSidebar, isSidebarCollapsed, toggleCollapse }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const theme = useTheme();
  const { toggleColorMode } = useThemeContext();

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
        height: 40, // Set fixed height
        justifyContent: 'center',
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          height: 48,
          minHeight: 48,
          px: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Left controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            color="primary"
            onClick={toggleMobileSidebar}
            size="small"
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          <IconButton
            color="primary"
            onClick={toggleCollapse}
            size="small"
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          >
            {isSidebarCollapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
          </IconButton>
        </Box>

        {/* Right controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={`Switch to ${theme.palette.mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton color="inherit" onClick={toggleColorMode} size="small">
              {theme.palette.mode === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Account settings">
            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 0.5 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                <UserCircle size={20} />
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 2,
              sx: {
                mt: 1.5,
                minWidth: 180,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem>Profile</MenuItem>
            <MenuItem>Settings</MenuItem>
            <Divider />
            <MenuItem>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
