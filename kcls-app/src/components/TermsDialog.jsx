import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack
} from '@mui/material';

const TermsDialog = ({ open, onClose }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    PaperProps={{ sx: { borderRadius: 2 } }}
  >
    <DialogTitle sx={{ fontWeight: 800 }}>Library Terms &amp; Conditions</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          By creating or accessing an account, you acknowledge that you understand and agree to the
          following terms that govern the Koronadal City Library System. These apply to all
          borrowers, staff, and guests using the platform.
        </Typography>
        <Divider flexItem />
        <List dense disablePadding sx={{ listStyleType: 'decimal', pl: 2 }}>
          <ListItem sx={{ display: 'list-item' }}>
            <ListItemText
              primary="Responsible Use"
              secondary="You will only access materials and services for lawful academic or professional purposes and will not attempt to disrupt, overload, or otherwise interfere with library operations."
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item' }}>
            <ListItemText
              primary="Account Security"
              secondary="You are responsible for safeguarding your login credentials and for all activities carried out under your account. Report suspected breaches to the library immediately."
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item' }}>
            <ListItemText
              primary="Privacy &amp; Data"
              secondary="The library collects only the personal information necessary to deliver its services and will process it in accordance with applicable data-protection policies."
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item' }}>
            <ListItemText
              primary="Borrowing Obligations"
              secondary="Borrowers agree to return or renew materials on time and to settle any penalties, fees, or replacement costs that may arise from late returns or lost items."
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item' }}>
            <ListItemText
              primary="Content Integrity"
              secondary="Uploading, digitizing, or sharing materials must respect copyright law. Only content you have the right to use may be published or distributed through this system."
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item' }}>
            <ListItemText
              primary="Policy Updates"
              secondary="The library may revise these terms to reflect operational or legal requirements. Continued use of the system after updates constitutes acceptance of the revised policy."
            />
          </ListItem>
        </List>
        <Typography variant="body2" color="text.secondary">
          If you have questions about these terms, please reach out to the Koronadal City Library
          administration before continuing.
        </Typography>
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 2 }}>
      <Button onClick={onClose} variant="contained" sx={{ fontWeight: 700 }}>
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

export default TermsDialog;
