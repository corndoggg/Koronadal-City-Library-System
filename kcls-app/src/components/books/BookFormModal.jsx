import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, Typography, Button, Box,
  Table, TableHead, TableRow, TableCell, TableBody, Tabs, Tab, Snackbar, Alert, Paper, Chip,
  IconButton, Tooltip, Divider, useTheme, MenuItem
} from '@mui/material';
import { Add, Edit as EditIcon, Save, Cancel, LibraryBooks } from '@mui/icons-material';

const BookFormModal = ({
  open, onClose, isEdit, bookForm, handleBookChange, initialBookForm,
  copyForm, handleCopyChange, initialCopyForm, handleSaveBook,
  editCopyIndex, copies, setCopyForm, setEditCopyIndex, setCopies, locations = [],
}) => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const showToast = (msg, severity = 'success') => setToast({ open: true, message: msg, severity });
  const handleTabChange = (e, v) => setTabIndex(v);

  const validateBookForm = () => {
    for (let key of ['title', 'author', 'year']) {
      if (!bookForm[key]) return showToast(`Please fill in the ${key.charAt(0).toUpperCase() + key.slice(1)} field.`, 'error'), false;
    }
    return true;
  };

  const handleCopyAction = () => {
    for (let key of ['accessionNumber', 'location']) {
      if (!copyForm[key]) return showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} is required.`, 'error');
    }
    // Always store location as string for dropdown, but send as int on save
    const normalizedCopy = { ...copyForm, location: copyForm.location ? String(copyForm.location) : '' };
    if (editCopyIndex !== null) {
      setCopies(copies.map((c, idx) => idx === editCopyIndex ? normalizedCopy : c));
      setEditCopyIndex(null); showToast('Copy updated.');
    } else {
      if (copies.some(c => c.accessionNumber === copyForm.accessionNumber)) return showToast('Duplicate accession number.', 'error');
      setCopies([...copies, normalizedCopy]); showToast('Copy added.');
    }
    setCopyForm(initialCopyForm);
  };

  // When saving, convert location to integer for backend
  const onSaveBook = () => {
    if (!validateBookForm()) return;
    if (copies.length === 0) return showToast('Please add at least one copy.', 'error');
    // Convert location to int for each copy before saving
    const normalizedCopies = copies.map(c => ({
      ...c,
      location: c.location ? parseInt(c.location, 10) : null
    }));
    handleSaveBook(normalizedCopies);
  };

  const getLocationName = id => {
    const found = locations.find(loc => String(loc.ID) === String(id));
    return found ? found.Name : id || "-";
  };

  const bookFields = [
    { key: 'title', label: 'Title', required: true }, { key: 'author', label: 'Author', required: true },
    { key: 'edition', label: 'Edition' }, { key: 'publisher', label: 'Publisher' },
    { key: 'year', label: 'Year', required: true, type: 'number' }, { key: 'subject', label: 'Subject' },
    { key: 'language', label: 'Language' }, { key: 'isbn', label: 'ISBN' },
  ];
  const copyFields = [
    { key: 'accessionNumber', label: 'Accession Number', required: true },
    { key: 'location', label: 'Location', required: true, select: true, options: locations },
    { key: 'availability', label: 'Availability', select: true, options: ['Available', 'Borrowed', 'Reserved'] },
    { key: 'condition', label: 'Condition' }, { key: 'physicalStatus', label: 'Physical Status' },
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1, background: theme.palette.background.default, color: theme.palette.text.primary }}>
          <LibraryBooks color="primary" sx={{ mr: 1 }} />{isEdit ? 'Edit Book' : 'Add New Book'}
        </DialogTitle>
        <DialogContent dividers sx={{ background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#f9f9fb', color: theme.palette.text.primary }}>
          <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 2, borderRadius: 2, background: theme.palette.background.paper, color: theme.palette.text.primary }} variant="fullWidth">
            <Tab label="Book Details" />
            <Tab label={<Box display="flex" alignItems="center" gap={1}>Book Copies<Chip label={copies.length} color={copies.length ? "primary" : "default"} size="small" /></Box>} />
          </Tabs>
          {tabIndex === 0 && (
            <Paper elevation={0} sx={{ p: 2, background: 'transparent', color: theme.palette.text.primary }}>
              <Grid container spacing={2}>
                {bookFields.map(({ key, label, required, type }) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <TextField label={label} name={key} value={bookForm[key]} onChange={handleBookChange} fullWidth size="small" required={required} type={type || 'text'}
                      InputLabelProps={type === 'number' ? { shrink: true } : undefined} autoComplete="off"
                      sx={{ background: theme.palette.background.paper, borderRadius: 1 }} />
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary"><b>Tip:</b> Fill in all required fields. You can add copies in the next tab.</Typography>
            </Paper>
          )}
          {tabIndex === 1 && (
            <Paper elevation={0} sx={{ p: 2, background: 'transparent', color: theme.palette.text.primary }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>{editCopyIndex !== null ? 'Edit Copy' : 'Add Book Copy'}</Typography>
              <Grid container spacing={2}>
                {copyFields.map(({ key, label, required, select, options }) => (
                  <Grid item xs={12} sm={6} key={key}>
                    {select && key === 'location' ? (
                      <TextField select label={label} name={key} value={copyForm[key]} onChange={handleCopyChange} fullWidth size="small" required={required}
                        sx={{ background: theme.palette.background.paper, borderRadius: 1 }}>
                        {locations.length === 0 && <MenuItem value="">No locations</MenuItem>}
                        {locations.map(loc => <MenuItem key={loc.ID} value={String(loc.ID)}>{loc.Name}</MenuItem>)}
                      </TextField>
                    ) : select ? (
                      <TextField select label={label} name={key} value={copyForm[key]} onChange={handleCopyChange} fullWidth size="small" required={required}
                        sx={{ background: theme.palette.background.paper, borderRadius: 1 }}>
                        {options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                      </TextField>
                    ) : (
                      <TextField label={label} name={key} value={copyForm[key]} onChange={handleCopyChange} fullWidth size="small" required={required} autoComplete="off"
                        sx={{ background: theme.palette.background.paper, borderRadius: 1 }} />
                    )}
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Button variant={editCopyIndex !== null ? 'contained' : 'outlined'} onClick={handleCopyAction} size="small" startIcon={editCopyIndex !== null ? <Save /> : <Add />}>
                    {editCopyIndex !== null ? 'Update Copy' : 'Add Copy'}
                  </Button>
                  {editCopyIndex !== null && (
                    <Button variant="text" color="secondary" size="small" sx={{ ml: 1 }} onClick={() => { setCopyForm(initialCopyForm); setEditCopyIndex(null); }} startIcon={<Cancel />}>Cancel</Button>
                  )}
                </Grid>
              </Grid>
              {copies.length > 0 && (
                <Box mt={3}>
                  <Typography fontWeight={600} gutterBottom>Book Copies:</Typography>
                  <Table size="small" sx={{ background: theme.palette.background.paper, borderRadius: 2, color: theme.palette.text.primary }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Accession #</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Availability</TableCell>
                        <TableCell>Condition</TableCell>
                        <TableCell>Physical Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {copies.map((copy, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>{copy.accessionNumber}</TableCell>
                          <TableCell>{getLocationName(copy.location)}</TableCell>
                          <TableCell>
                            <Chip label={copy.availability} color={copy.availability === 'Available' ? 'success' : 'warning'} size="small" />
                          </TableCell>
                          <TableCell>{copy.condition}</TableCell>
                          <TableCell>{copy.physicalStatus}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Edit Copy">
                              <IconButton size="small" onClick={() => { setCopyForm({ ...copy }); setEditCopyIndex(idx); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary"><b>Tip:</b> Add all physical copies of this book here. You can edit or remove them before saving.</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ background: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button onClick={onClose} size="small" variant="outlined" color="secondary">Cancel</Button>
          <Button variant="contained" onClick={onSaveBook} size="small" color="primary" startIcon={isEdit ? <EditIcon /> : <Save />}>
            {isEdit ? 'Update Book' : 'Save Book'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </>
  );
};

export default BookFormModal;