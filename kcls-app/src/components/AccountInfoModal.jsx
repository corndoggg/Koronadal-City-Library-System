import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider, useTheme
} from '@mui/material';
import { formatDate } from '../utils/date';
const Row = ({ label, value }) => (
  <Box
    sx={{
      display: 'flex',
      py: 0.5,
      px: 1,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1,
      gap: 1,
      alignItems: 'flex-start',
      backgroundColor: 'background.paper'
    }}
  >
    <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 88, color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ wordBreak: 'break-word', flexGrow: 1 }}>
      {value || '—'}
    </Typography>
  </Box>
);

const AccountInfoModal = ({ open, onClose, user = {} }) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 1,
            border: `2px solid ${theme.palette.divider}`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.10)',
            backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 1.75,
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: .5,
          borderBottom: `2px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.default,
          borderTopLeftRadius: 1,
          borderTopRightRadius: 1
        }}
      >
        Account Information
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          bgcolor: theme.palette.background.default,
          border: 'none'
        }}
      >
        <Box
          sx={{
            p: 1.25,
            border: '1.5px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper'
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{ lineHeight: 1.15, fontSize: 15 }}
          >
            {user.Firstname ? `${user.Firstname} ${user.Lastname}` : user.Username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.Username}
          </Typography>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Row label="Role" value={user.Role} />
          {user.Role === 'Staff' && user.staff && (
            <Row label="Position" value={user.staff.Position} />
          )}
          {user.Role === 'Borrower' && user.borrower && (
            <>
              <Row label="BorrowerID" value={user.borrower.BorrowerID} />
              <Row label="Type" value={user.borrower.Type} />
              <Row label="Department" value={user.borrower.Department} />
              <Row label="Status" value={user.borrower.AccountStatus} />
            </>
          )}
          <Row label="Email" value={user.Email} />
          <Row label="Contact" value={user.ContactNumber} />
          <Row
            label="Address"
            value={
              [user.Street, user.Barangay, user.City, user.Province]
                .filter(Boolean)
                .join(', ')
            }
          />
          <Row
            label="Birth Date"
            value={user.DateOfBirth ? formatDate(user.DateOfBirth) : ''}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 1.25,
          borderTop: `2px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.default
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          size="small"
          sx={{
            fontWeight: 600,
            borderRadius: 1,
            px: 2.5
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountInfoModal;