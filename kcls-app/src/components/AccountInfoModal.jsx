import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider, useTheme,
  Avatar, Chip, Stack, Grid
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { formatDate } from '../utils/date';

const Row = ({ label, value }) => (
  <Stack
    direction="row"
    spacing={1.5}
    alignItems="center"
    sx={{
      px: 1.5,
      py: 1.1,
      borderRadius: 1.5,
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      minHeight: 56,
      boxShadow: '0 1px 2px rgba(15,23,42,0.08)'
    }}
  >
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: 'text.secondary',
        minWidth: 96,
        flexShrink: 0
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ wordBreak: 'break-word', flexGrow: 1, color: 'text.primary', fontWeight: 500 }}
    >
      {value || '—'}
    </Typography>
  </Stack>
);

const getInitials = (user = {}) => {
  const parts = [user.Firstname, user.Middlename, user.Lastname]
    .map(part => (part || '').trim())
    .filter(Boolean);
  if (!parts.length && user.Username) return user.Username.slice(0, 2).toUpperCase();
  const initials = parts.slice(0, 3).map(part => part.charAt(0).toUpperCase()).join('');
  return initials || 'NA';
};

const AccountInfoModal = ({ open, onClose, user = {} }) => {
  const theme = useTheme();
  const fullName = [user.Firstname, user.Middlename, user.Lastname]
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join(' ') || user.Username || 'Unnamed Account';
  const initials = getInitials(user);
  const address = [user.Street, user.Barangay, user.City, user.Province]
    .filter(Boolean)
    .join(', ');
  const borrower = user.Role === 'Borrower' ? user.borrower || null : null;
  const staffPosition = user.Role === 'Staff' ? user.staff?.Position : null;

  const gradientSurface = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)}, ${alpha(theme.palette.primary.dark, 0.85)})`;

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
          p: 2.4,
          bgcolor: alpha(theme.palette.background.default, 0.92),
          border: 'none'
        }}
      >
        <Stack spacing={2.4}>
          <Box
            sx={{
              background: gradientSurface,
              color: theme.palette.primary.contrastText,
              p: 2,
              borderRadius: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              alignItems: { xs: 'flex-start', sm: 'center' }
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                fontSize: 24,
                fontWeight: 700,
                bgcolor: alpha('#FFFFFF', 0.18),
                color: '#fff',
                boxShadow: '0 8px 22px rgba(15,23,42,0.25)'
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.4 }}>
                {fullName}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>
                @{user.Username || 'unassigned'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                size="small"
                label={user.Role || 'Unassigned'}
                sx={{
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  color: theme.palette.primary.contrastText,
                  bgcolor: alpha('#FFFFFF', 0.18)
                }}
              />
              {borrower?.AccountStatus && (
                <Chip
                  size="small"
                  label={`Status: ${borrower.AccountStatus}`}
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.primary.contrastText,
                    bgcolor: alpha('#FFFFFF', 0.12)
                  }}
                />
              )}
              {staffPosition && (
                <Chip
                  size="small"
                  label={staffPosition}
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.primary.contrastText,
                    bgcolor: alpha('#FFFFFF', 0.12)
                  }}
                />
              )}
            </Stack>
          </Box>

          <Divider textAlign="left" sx={{ mt: 0.5 }}>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.4 }}>
              Account Snapshot
            </Typography>
          </Divider>

          <Grid container spacing={1.5} columns={{ xs: 12, sm: 12, md: 12 }}>
            <Grid item xs={12} sm={6}>
              <Row label="Username" value={user.Username} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Row label="Role" value={user.Role} />
            </Grid>
            {staffPosition && (
              <Grid item xs={12}>
                <Row label="Position" value={staffPosition} />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <Row label="Email" value={user.Email} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Row label="Contact" value={user.ContactNumber} />
            </Grid>
            <Grid item xs={12}>
              <Row label="Address" value={address} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Row label="Birth Date" value={user.DateOfBirth ? formatDate(user.DateOfBirth) : ''} />
            </Grid>
          </Grid>

          {borrower && (
            <>
              <Divider textAlign="left" sx={{ mt: 1 }}>
                <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.4 }}>
                  Borrower Profile
                </Typography>
              </Divider>
              <Grid container spacing={1.5} columns={{ xs: 12, sm: 12, md: 12 }}>
                <Grid item xs={12} sm={6}>
                  <Row label="Borrower ID" value={borrower.BorrowerID} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Row label="Type" value={borrower.Type} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Row label="Department" value={borrower.Department} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Row label="Status" value={borrower.AccountStatus} />
                </Grid>
              </Grid>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.default, 0.85)
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          size="medium"
          disableElevation
          sx={{
            fontWeight: 700,
            borderRadius: 1.5,
            px: 3,
            py: 1,
            textTransform: 'none',
            boxShadow: '0 10px 24px rgba(58,87,232,0.28)'
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountInfoModal;