import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Box
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';

const Topbar = ({ toggleMobileSidebar, isSidebarCollapsed, toggleCollapse }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        backgroundColor: 'white',
        color: 'black',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Mobile Toggle */}
          <IconButton
            color="primary"
            edge="start"
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            onClick={toggleMobileSidebar}
          >
            <MenuIcon />
          </IconButton>

          {/* Desktop Sidebar Collapse Toggle */}
          <IconButton
            color="secondary"
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            onClick={toggleCollapse}
          >
            {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>

          <Typography
            variant="h6"
            component="div"
            sx={{ display: { xs: 'none', md: 'block' }, fontWeight: 600 }}
          >
            📚 Librarian Panel
          </Typography>
        </Box>

        {/* User Dropdown */}
        <Box>
          <Tooltip title="Open settings">
            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 2 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                <AccountCircle />
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
            <MenuItem divider />
            <MenuItem>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;