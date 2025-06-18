import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        bgcolor: 'background.paper',
        color: 'text.secondary',
        borderTop: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
        py: 1,
        zIndex: 1300,
      }}
    >
      <Typography variant="body2">
        © 2025 Koronadal City Library
      </Typography>
    </Box>
  );
};

export default Footer;
