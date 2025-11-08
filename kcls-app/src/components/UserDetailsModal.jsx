import React, { useCallback, useEffect, useState } from 'react';
import { formatDate } from '../utils/date';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, Grid, Chip, Button, Divider, Stack, useTheme
} from '@mui/material';
import DocumentPDFViewer from './DocumentPDFViewer.jsx';

/*
  UserDetailsModal
  -----------------
  Read-only presentation of a user's complete profile information.
  Props:
    open (bool)          : controls visibility
    onClose (fn)         : close handler
    user (object|null)   : user record including nested staff / borrower objects
    onEdit (fn?)         : optional callback to launch edit flow
*/
const Field = ({ label, value }) => (
  <Box mb={1}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: .5 }}>
      {label}
    </Typography>
    <Typography fontSize={13} fontWeight={600} sx={{ wordBreak: 'break-word' }}>
      {value ?? '-'}
    </Typography>
  </Box>
);

const Section = ({ title, subtitle, children }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 1.5,
        border: `1.5px solid ${theme.palette.divider}`,
        borderRadius: 1,
        bgcolor: 'background.paper'
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography fontSize={14} fontWeight={800}>{title}</Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        )}
      </Box>
      {children}
    </Box>
  );
};

const UserDetailsModal = ({ open, onClose, user, onEdit }) => {
  const theme = useTheme();
  const borrower = user?.borrower;
  const hasAttachment = Boolean(borrower?.AttachmentPdfBase64 || borrower?.AttachmentPath);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerObjectUrl, setViewerObjectUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (viewerObjectUrl) {
        URL.revokeObjectURL(viewerObjectUrl);
      }
    };
  }, [viewerObjectUrl]);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
    setViewerUrl('');
    if (viewerObjectUrl) {
      URL.revokeObjectURL(viewerObjectUrl);
      setViewerObjectUrl(null);
    }
  }, [viewerObjectUrl]);

  useEffect(() => {
    if (!open) {
      handleCloseViewer();
    }
  }, [open, handleCloseViewer]);

  const handleOpenAttachment = useCallback(() => {
    if (!borrower) return;
    try {
      let nextUrl = '';
      let nextObjectUrl = null;
      if (borrower.AttachmentPdfBase64) {
        const binaryString = window.atob(borrower.AttachmentPdfBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i += 1) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        nextObjectUrl = URL.createObjectURL(blob);
        nextUrl = nextObjectUrl;
      } else if (borrower.AttachmentPath) {
        const base = (import.meta.env?.VITE_API_BASE || '').replace(/\/+$/, '');
        const relative = borrower.AttachmentPath.replace(/^\/+/, '');
        nextUrl = base ? `${base}/${relative}` : `/${relative}`;
      }

      if (nextUrl) {
        if (viewerObjectUrl) {
          URL.revokeObjectURL(viewerObjectUrl);
        }
        setViewerObjectUrl(nextObjectUrl);
        setViewerUrl(nextUrl);
        const attachmentLabel = borrower.AttachmentPath?.split('/').pop() || 'Borrower Attachment';
        setViewerTitle(attachmentLabel);
        setViewerOpen(true);
      }
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('Unable to open attachment preview', error);
      }
    }
  }, [borrower, viewerObjectUrl]);

  if (!user) return null;

  const fullName = [user.Firstname, user.Middlename, user.Lastname].filter(Boolean).join(' ');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 1,
          border: `2px solid ${theme.palette.divider}`,
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle
        sx={{
          px: 2,
          py: 1.5,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: .5,
          bgcolor: theme.palette.background.default,
          borderBottom: `2px solid ${theme.palette.divider}`
        }}
      >
        User Details
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 2.25,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: theme.palette.background.default
        }}
      >
        <Section title="Account" subtitle="Base credentials & role">
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}><Field label="Username" value={user.Username} /></Grid>
            <Grid item xs={12} md={4}><Field label="Role" value={user.Role} /></Grid>
            <Grid item xs={12} md={4}>
              <Box mt={2}>
                <Chip
                  size="small"
                  label={user.Role}
                  color={user.Role === 'Staff' ? 'primary' : 'secondary'}
                  sx={{ fontWeight: 700, borderRadius: 0.75, fontSize: 11 }}
                />
              </Box>
            </Grid>
          </Grid>
        </Section>

        <Section title="Personal" subtitle="Identity & contact data">
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}><Field label="Full Name" value={fullName || '-'} /></Grid>
            <Grid item xs={12} md={4}><Field label="Email" value={user.Email} /></Grid>
            <Grid item xs={12} md={4}><Field label="Contact" value={user.ContactNumber} /></Grid>
            <Grid item xs={12} md={4}><Field label="Date of Birth" value={user.DateOfBirth ? formatDate(user.DateOfBirth) : '-'} /></Grid>
            <Grid item xs={12} md={8}>
              <Field
                label="Address"
                value={[user.Street, user.Barangay, user.City, user.Province].filter(Boolean).join(', ') || '-'}
              />
            </Grid>
          </Grid>
        </Section>

        {user.Role === 'Staff' && user.staff && (
          <Section title="Staff" subtitle="Employment / assignment">
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}><Field label="Position" value={user.staff.Position} /></Grid>
            </Grid>
          </Section>
        )}

        {user.Role === 'Borrower' && user.borrower && (
          <Section title="Borrower" subtitle="Classification & status">
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}><Field label="Type" value={user.borrower.Type} /></Grid>
              <Grid item xs={12} md={4}><Field label="Department" value={user.borrower.Department} /></Grid>
              <Grid item xs={12} md={4}>
                <Box mt={1}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: .5 }}>Account Status</Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center" mt={0.25}>
                    <Chip
                      size="small"
                      label={user.borrower.AccountStatus}
                      color={
                        user.borrower.AccountStatus === 'Approved'
                          ? 'success'
                          : user.borrower.AccountStatus === 'Rejected'
                          ? 'error'
                          : 'warning'
                      }
                      sx={{ fontWeight: 700, borderRadius: 0.75, fontSize: 11 }}
                    />
                  </Stack>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box mt={0.5}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: .5 }}>
                    Identification Attachment
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={0.75} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleOpenAttachment}
                      disabled={!hasAttachment}
                      sx={{ borderRadius: 1, fontWeight: 600, textTransform: 'none' }}
                    >
                      {hasAttachment ? 'View attachment' : 'No attachment uploaded'}
                    </Button>
                    {user.borrower.AttachmentPath && (
                      <Typography variant="caption" color="text.secondary">
                        {user.borrower.AttachmentPath.split('/').pop()}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </Section>
        )}

        <Divider />
        <Box>
          <Typography variant="caption" color="text.secondary">
            Display only. Use Edit to modify this user's record.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: theme.palette.background.default,
          borderTop: `2px solid ${theme.palette.divider}`
        }}
      >
        <Button onClick={onClose} variant="outlined" size="small" sx={{ borderRadius: 1, fontWeight: 600 }}>
          Close
        </Button>
        {onEdit && (
          <Button
            onClick={() => { onClose(); onEdit(user); }}
            variant="contained"
            size="small"
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            Edit
          </Button>
        )}
      </DialogActions>
      <DocumentPDFViewer
        open={viewerOpen}
        onClose={handleCloseViewer}
        fileUrl={viewerUrl}
        documentId={borrower?.BorrowerID ?? user.UserID}
        title={viewerTitle || 'Borrower Attachment'}
        note="Identification attachment preview."
      />
    </Dialog>
  );
};

export default UserDetailsModal;
