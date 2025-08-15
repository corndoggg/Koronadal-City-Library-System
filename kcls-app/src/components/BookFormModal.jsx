import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, Typography, Button, Box,
  Table, TableHead, TableRow, TableCell, TableBody, Tabs, Tab, Snackbar, Alert, Paper, Chip,
  IconButton, Tooltip, Divider, useTheme, MenuItem, Stack
} from '@mui/material';
import {
  Add, Edit as EditIcon, Save, Cancel, LibraryBooks,
  Delete as DeleteIcon, WarningAmber, AutoFixHigh
} from '@mui/icons-material';

const BookFormModal = ({
  open, onClose, isEdit, bookForm, handleBookChange, initialBookForm,
  copyForm, handleCopyChange, initialCopyForm, handleSaveBook,
  editCopyIndex, copies, setCopyForm, setEditCopyIndex, setCopies, locations = [],
}) => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [unsaved, setUnsaved] = useState(false);
  const [attemptClose, setAttemptClose] = useState(false);

  useEffect(() => {
    if (!open) {
      setTabIndex(0);
      setUnsaved(false);
      setAttemptClose(false);
    }
  }, [open]);

  const showToast = (msg, severity = 'success') =>
    setToast({ open: true, message: msg, severity });

  const handleTabChange = (_, v) => setTabIndex(v);

  const requiredBookKeys = ['title', 'author', 'year'];
  const validateBookForm = () => {
    for (let key of requiredBookKeys) {
      if (!bookForm[key]) {
        showToast(`Please fill the ${key.charAt(0).toUpperCase() + key.slice(1)} field.`, 'error');
        return false;
      }
    }
    if (bookForm.year && (bookForm.year < 1500 || bookForm.year > (new Date().getFullYear() + 1))) {
      showToast('Year seems invalid.', 'error');
      return false;
    }
    return true;
  };

  // Accession duplicate / state
  const accessionExists = (val, idx = null) =>
    copies.some((c, i) => c.accessionNumber === val && i !== idx);

  const generateAccession = () => {
    // Simple pattern: YEAR + random 5
    const base = (bookForm.year || new Date().getFullYear()).toString();
    let acc;
    let tries = 0;
    do {
      acc = base + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      tries++;
      if (tries > 25) break;
    } while (accessionExists(acc));
    setCopyForm({ ...copyForm, accessionNumber: acc });
    showToast('Accession generated.', 'info');
  };

  const handleCopyAction = () => {
    for (let key of ['accessionNumber', 'location']) {
      if (!copyForm[key]) {
        showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} is required.`, 'error');
        return;
      }
    }
    if (accessionExists(copyForm.accessionNumber, editCopyIndex)) {
      showToast('Duplicate accession number.', 'error');
      return;
    }
    const normalized = { ...copyForm, location: copyForm.location ? String(copyForm.location) : '' };
    if (editCopyIndex !== null) {
      setCopies(copies.map((c, idx) => (idx === editCopyIndex ? normalized : c)));
      setEditCopyIndex(null);
      showToast('Copy updated.');
    } else {
      setCopies([...copies, normalized]);
      showToast('Copy added.');
    }
    setCopyForm(initialCopyForm);
    setUnsaved(true);
  };

  const removeCopy = (idx) => {
    setCopies(copies.filter((_, i) => i !== idx));
    setUnsaved(true);
  };

  const cancelEditCopy = () => {
    setCopyForm(initialCopyForm);
    setEditCopyIndex(null);
  };

  const onSaveBook = () => {
    if (!validateBookForm()) return;
    if (copies.length === 0) return showToast('Add at least one copy.', 'error');
    const normalizedCopies = copies.map(c => ({
      ...c,
      location: c.location ? parseInt(c.location, 10) : null
    }));
    handleSaveBook(normalizedCopies);
    setUnsaved(false);
  };

  const guardedClose = () => {
    if (unsaved || editCopyIndex !== null) {
      setAttemptClose(true);
    } else {
      onClose();
    }
  };

  const confirmDiscard = () => {
    setAttemptClose(false);
    setUnsaved(false);
    setEditCopyIndex(null);
    onClose();
  };

  const getLocationName = id => {
    const found = locations.find(loc => String(loc.ID) === String(id));
    return found ? found.Name : id || '-';
  };

  const bookFields = [
    { key: 'title', label: 'Title', required: true },
    { key: 'author', label: 'Author', required: true },
    { key: 'edition', label: 'Edition' },
    { key: 'publisher', label: 'Publisher' },
    { key: 'year', label: 'Year', required: true, type: 'number' },
    { key: 'subject', label: 'Subject' },
    { key: 'language', label: 'Language' },
    { key: 'isbn', label: 'ISBN' }
  ];

  const copyFields = [
    { key: 'accessionNumber', label: 'Accession Number', required: true },
    { key: 'location', label: 'Location', required: true, select: true, options: locations },
    { key: 'availability', label: 'Availability', select: true, options: ['Available', 'Borrowed', 'Reserved'] },
    { key: 'condition', label: 'Condition' },
    { key: 'physicalStatus', label: 'Physical Status' }
  ];

  const availabilityStats = useMemo(() => {
    const total = copies.length;
    const available = copies.filter(c => c.availability === 'Available').length;
    const borrowed = copies.filter(c => c.availability === 'Borrowed').length;
    const reserved = copies.filter(c => c.availability === 'Reserved').length;
    return { total, available, borrowed, reserved };
  }, [copies]);

  const copyInvalid =
    !copyForm.accessionNumber ||
    !copyForm.location ||
    accessionExists(copyForm.accessionNumber, editCopyIndex);

  return (
    <>
      <Dialog open={open} onClose={guardedClose} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: theme => `2px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper'
          }}
        >
          <LibraryBooks color="primary" />
          {isEdit ? 'Edit Book' : 'Add New Book'}
          <Box ml="auto" />
          {unsaved && (
            <Chip
              size="small"
              color="warning"
              label="Unsaved Changes"
              icon={<WarningAmber fontSize="small" />}
              sx={{ fontWeight: 600, borderRadius: 0.75 }}
            />
          )}
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            bgcolor: 'background.default',
            p: 2.25
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            sx={{
              mb: 2,
              // remove default underline
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTabs-flexContainer': { alignItems: 'stretch' },
              // base (all tabs)
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                px: 2.25,
                mr: 1,
                minHeight: 40,
                lineHeight: 1.2,
                borderRadius: 0.75,
                border: theme => `2px solid ${theme.palette.divider}`,
                backgroundColor: theme => theme.palette.background.paper,
                color: theme => theme.palette.text.secondary,
                transition: 'all .18s',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: theme => theme.palette.action.hover,
                  borderColor: theme => theme.palette.primary.light,
                  color: theme => theme.palette.text.primary
                }
              },
              // selected state
              '& .MuiTab-root.Mui-selected': {
                backgroundColor: theme => theme.palette.primary.main,
                color: theme => `${theme.palette.primary.contrastText} !important`,
                borderColor: theme => theme.palette.primary.main,
                boxShadow: theme => `0 2px 6px ${theme.palette.primary.main}33`
              },
              // focus-visible for accessibility
              '& .MuiTab-root:focus-visible': {
                outline: theme => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2
              }
            }}
          >
            <Tab label="Book Details" disableRipple />
            <Tab
              disableRipple
              label={
                <Box display="flex" gap={1} alignItems="center">
                  Copies
                  <Chip
                    size="small"
                    label={copies.length}
                    color={copies.length ? 'primary' : 'default'}
                    sx={{ fontWeight: 600, height: 20 }}
                  />
                </Box>
              }
            />
          </Tabs>

          {tabIndex === 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1,
                border: theme => `2px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper'
              }}
            >
              <Grid container spacing={2}>
                {bookFields.map(({ key, label, required, type }) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <TextField
                      label={label}
                      name={key}
                      value={bookForm[key]}
                      onChange={e => {
                        handleBookChange(e);
                        setUnsaved(true);
                      }}
                      fullWidth
                      size="small"
                      required={required}
                      type={type || 'text'}
                      InputLabelProps={type === 'number' ? { shrink: true } : undefined}
                      autoComplete="off"
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 1 }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label="Fill required fields"
                  color={requiredBookKeys.every(k => bookForm[k]) ? 'success' : 'default'}
                  sx={{ fontWeight: 600, borderRadius: 0.75 }}
                />
                <Chip
                  size="small"
                  label={`Copies: ${copies.length}`}
                  color={copies.length ? 'primary' : 'default'}
                  sx={{ fontWeight: 600, borderRadius: 0.75 }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Tip: Add all bibliographic info now; you can still edit later.
              </Typography>
            </Paper>
          )}

            {tabIndex === 1 && (
              <Stack gap={2}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    border: theme => `2px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Typography fontWeight={700} fontSize={14} mb={1}>
                    {editCopyIndex !== null ? 'Edit Copy' : 'Add Book Copy'}
                  </Typography>
                  <Grid container spacing={2}>
                    {copyFields.map(({ key, label, required, select, options }) => (
                      <Grid item xs={12} sm={6} key={key}>
                        {select && key === 'location' ? (
                          <TextField
                            select
                            label={label}
                            name={key}
                            value={copyForm[key]}
                            onChange={e => {
                              handleCopyChange(e);
                              setUnsaved(true);
                            }}
                            fullWidth
                            size="small"
                            required={required}
                            helperText={locations.length === 0 ? 'Add locations first.' : ''}
                            disabled={locations.length === 0}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                          >
                            {locations.length === 0 && <MenuItem value="">No locations</MenuItem>}
                            {locations.map(loc => (
                              <MenuItem key={loc.ID} value={String(loc.ID)}>
                                {loc.Name}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : select ? (
                          <TextField
                            select
                            label={label}
                            name={key}
                            value={copyForm[key]}
                            onChange={e => {
                              handleCopyChange(e);
                              setUnsaved(true);
                            }}
                            fullWidth
                            size="small"
                            required={required}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                          >
                            {options.map(opt => (
                              <MenuItem key={opt} value={opt}>
                                {opt}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <TextField
                            label={label}
                            name={key}
                            value={copyForm[key]}
                            onChange={e => {
                              handleCopyChange(e);
                              setUnsaved(true);
                            }}
                            fullWidth
                            size="small"
                            required={required}
                            autoComplete="off"
                            error={
                              key === 'accessionNumber' &&
                              !!copyForm.accessionNumber &&
                              accessionExists(copyForm.accessionNumber, editCopyIndex)
                            }
                            helperText={
                              key === 'accessionNumber' &&
                              accessionExists(copyForm.accessionNumber, editCopyIndex)
                                ? 'Accession already used.'
                                : ' '
                            }
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                          />
                        )}
                      </Grid>
                    ))}

                    <Grid item xs={12} sm={6}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AutoFixHigh />}
                        onClick={generateAccession}
                        fullWidth
                        disabled={!!copyForm.accessionNumber}
                        sx={{ height: '100%', fontWeight: 600 }}
                      >
                        Auto Accession
                      </Button>
                    </Grid>

                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={editCopyIndex !== null ? <Save /> : <Add />}
                          onClick={handleCopyAction}
                          disabled={copyInvalid || locations.length === 0}
                          sx={{ fontWeight: 700 }}
                        >
                          {editCopyIndex !== null ? 'Update Copy' : 'Add Copy'}
                        </Button>
                        {editCopyIndex !== null && (
                          <Button
                            variant="text"
                            color="secondary"
                            size="small"
                            startIcon={<Cancel />}
                            onClick={cancelEditCopy}
                            sx={{ fontWeight: 600 }}
                          >
                            Cancel
                          </Button>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      label={`Total: ${availabilityStats.total}`}
                      color="primary"
                      sx={{ fontWeight: 600, borderRadius: 0.75 }}
                    />
                    <Chip
                      size="small"
                      label={`Available: ${availabilityStats.available}`}
                      color="success"
                      sx={{ fontWeight: 600, borderRadius: 0.75 }}
                    />
                    <Chip
                      size="small"
                      label={`Borrowed: ${availabilityStats.borrowed}`}
                      color="warning"
                      sx={{ fontWeight: 600, borderRadius: 0.75 }}
                    />
                    <Chip
                      size="small"
                      label={`Reserved: ${availabilityStats.reserved}`}
                      color="info"
                      sx={{ fontWeight: 600, borderRadius: 0.75 }}
                    />
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Tip: Edit or remove any copy before saving the book.
                  </Typography>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 0,
                    overflow: 'hidden',
                    borderRadius: 1,
                    border: theme => `2px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      borderBottom: theme => `1px solid ${theme.palette.divider}`,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Typography fontWeight={700} fontSize={14}>
                      Book Copies ({copies.length})
                    </Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          '& th': {
                            fontWeight: 700,
                            fontSize: 12,
                            bgcolor: 'background.default',
                            borderBottom: theme => `2px solid ${theme.palette.divider}`
                          }
                        }}
                      >
                        <TableCell>Accession #</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Availability</TableCell>
                        <TableCell>Condition</TableCell>
                        <TableCell>Physical Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody
                      sx={{
                        '& td': { borderBottom: theme => `1px solid ${theme.palette.divider}` },
                        '& tr:hover': { background: theme.palette.action.hover }
                      }}
                    >
                      {copies.map((copy, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{copy.accessionNumber}</TableCell>
                          <TableCell>{getLocationName(copy.location)}</TableCell>
                          <TableCell>
                            <Chip
                              label={copy.availability || 'Available'}
                              size="small"
                              color={
                                copy.availability === 'Borrowed'
                                  ? 'warning'
                                  : copy.availability === 'Reserved'
                                  ? 'info'
                                  : 'success'
                              }
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>{copy.condition || '-'}</TableCell>
                          <TableCell>{copy.physicalStatus || '-'}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setCopyForm({ ...copy });
                                  setEditCopyIndex(idx);
                                }}
                                sx={{ borderRadius: 0.75 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeCopy(idx)}
                                sx={{ borderRadius: 0.75 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {copies.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="caption" color="text.secondary">
                              No copies added yet.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Paper>
              </Stack>
            )}
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: theme => `2px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            py: 1
          }}
        >
          <Button
            onClick={guardedClose}
            size="small"
            variant="outlined"
            color="secondary"
            sx={{ fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSaveBook}
            size="small"
            color="primary"
            startIcon={isEdit ? <EditIcon /> : <Save />}
            sx={{ fontWeight: 700 }}
            disabled={
              !validateBookForm ||
              requiredBookKeys.some(k => !bookForm[k]) ||
              copies.length === 0
            }
          >
            {isEdit ? 'Update Book' : 'Save Book'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discard Confirmation */}
      <Dialog
        open={attemptClose}
        onClose={() => setAttemptClose(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: theme => `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1,
            borderBottom: theme => `1px solid ${theme.palette.divider}`
          }}
        >
          Discard changes?
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2">
            You have unsaved changes. Are you sure you want to close?
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: theme => `1px solid ${theme.palette.divider}`,
            py: 1
          }}
        >
          <Button
            size="small"
            onClick={() => setAttemptClose(false)}
            variant="outlined"
          >
            Keep Editing
          </Button>
          <Button
            size="small"
            color="error"
            variant="contained"
            onClick={confirmDiscard}
          >
            Discard
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{ fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BookFormModal;