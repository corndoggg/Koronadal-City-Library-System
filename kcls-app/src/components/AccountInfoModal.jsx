import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider, useTheme
} from '@mui/material';

const AccountInfoModal = ({ open, onClose, user }) => {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
        Account Information
      </DialogTitle>
      <DialogContent dividers sx={{ background: theme.palette.background.default }}>
        <Box mb={2}>
          <Typography variant="subtitle1" fontWeight={700} color={theme.palette.primary.main}>
            {user.Firstname ? `${user.Firstname} ${user.Lastname}` : user.Username}
          </Typography>
          <Typography variant="body2" color="text.secondary">{user.Username}</Typography>
          <Typography variant="body2" color="text.secondary">{user.Email}</Typography>
        </Box>
        <Divider />
        <Box mt={2}>
          <Typography variant="body2"><b>Role:</b> {user.Role}</Typography>
          {user.Role === 'Staff' && user.staff && (
            <Typography variant="body2"><b>Position:</b> {user.staff.Position}</Typography>
          )}
          {user.Role === 'Borrower' && user.borrower && (
            <>
              <Typography variant="body2"><b>Type:</b> {user.borrower.Type}</Typography>
              <Typography variant="body2"><b>Department:</b> {user.borrower.Department}</Typography>
              <Typography variant="body2"><b>Status:</b> {user.borrower.AccountStatus}</Typography>
            </>
          )}
          <Typography variant="body2"><b>Email:</b> {user.Email}</Typography>
          <Typography variant="body2"><b>Contact:</b> {user.ContactNumber}</Typography>
          <Typography variant="body2"><b>Address:</b> {`${user.Street || ''} ${user.Barangay || ''} ${user.City || ''} ${user.Province || ''}`}</Typography>
          <Typography variant="body2"><b>Date of Birth:</b> {user.DateOfBirth ? user.DateOfBirth.slice(0, 10) : ''}</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ bgcolor: theme.palette.background.paper }}>
        <Button onClick={onClose} color="primary" variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountInfoModal;