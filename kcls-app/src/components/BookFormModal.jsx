import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, Typography, Button, Box,
  Table, TableHead, TableRow, TableCell, TableBody, Tabs, Tab, Snackbar, Alert, Paper, Chip,
  IconButton, Tooltip, Divider, MenuItem, Stack
} from '@mui/material';
import {
  Add, Edit as EditIcon, Save, Cancel, LibraryBooks,
  Delete as DeleteIcon, WarningAmber, AutoFixHigh
} from '@mui/icons-material';
import { formatDate } from '../utils/date';
import { DEWEY_CLASSES, formatDeweyDisplay } from '../constants/dewey';

const BookFormModal = ({
  open, onClose, isEdit, bookForm, handleBookChange,
  copyForm, handleCopyChange, initialCopyForm, handleSaveBook,
  editCopyIndex, copies, setCopyForm, setEditCopyIndex, setCopies, locations = [],
  existingBooks = []
}) => {
  // Standardized condition options (Good → Bad)
  const conditionOptions = ['Good', 'Fair', 'Average', 'Poor', 'Bad'];
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

  const requiredBookKeys = ['title', 'author', 'year', 'subject'];
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

  const existingAccessionNumbers = useMemo(() => {
    const numbers = [];
    existingBooks.forEach(book => {
      const inventory = book?.inventory || [];
      inventory.forEach(copy => {
        const val =
          copy?.accessionNumber ??
          copy?.AccessionNumber ??
          copy?.Accession_No ??
          copy?.Accession ??
          copy?.Copy_Number ??
          copy?.CopyNo ??
          copy?.Copy_ID ??
          '';
        if (val) {
          numbers.push(String(val));
        }
      });
    });
    return numbers;
  }, [existingBooks]);

  const extractDeweyCode = (subjectValue) => {
    const match = subjectValue?.match?.(/^(\d{3})/);
    return match ? match[1] : null;
  };

  const generateAccession = () => {
    const subjectCode = extractDeweyCode(bookForm.subject);
    if (!subjectCode) {
      showToast('Select a subject before auto generating.', 'error');
      return;
    }

    const pool = [
      ...existingAccessionNumbers,
      ...copies.map(c => String(c.accessionNumber || ''))
    ].filter(Boolean);

    const prefix = subjectCode;
    let nextIndex = 1;

    const matching = pool.filter(val => val.startsWith(prefix));
    if (matching.length) {
      const suffixes = matching
        .map(val => {
          const remainder = val.slice(prefix.length);
          if (!remainder) return 0;
          if (!remainder.startsWith('.')) return null;
          const numericPart = remainder.slice(1);
          if (!numericPart) return null;
          const parsed = parseInt(numericPart, 10);
          return Number.isNaN(parsed) ? null : parsed;
        })
        .filter(value => value !== null);
      if (suffixes.length) {
        nextIndex = Math.max(...suffixes) + 1;
      }
    }

    let candidate = `${prefix}.${nextIndex}`;
    const taken = new Set(pool);
    while (taken.has(candidate)) {
      nextIndex += 1;
      candidate = `${prefix}.${nextIndex}`;
    }

    setCopyForm(prev => ({ ...prev, accessionNumber: candidate }));
    setUnsaved(true);
    showToast(`Accession ${candidate} generated.`, 'info');
  };

  const checkStorageCapacity = async (locationId) => {
    if (!locationId) return { ok: true };
    const loc = locations.find(l => String(l.ID) === String(locationId));
    const capacity = Number(loc?.Capacity ?? 0);
    if (!capacity || capacity <= 0) return { ok: true };
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/storages/${locationId}/usage`);
      if (!res.ok) return { ok: true };
      const data = await res.json();
      const used = Number(data?.used ?? 0);
      if (used >= capacity) return { ok: false, capacity, used };
      return { ok: true, capacity, used };
    } catch {
      return { ok: true };
    }
  };

  const handleCopyAction = () => {
    (async () => {
      const targetLocation = copyForm.location;
      const capacityCheck = await checkStorageCapacity(targetLocation);
      if (!capacityCheck.ok) {
        showToast(`Cannot add to location — capacity ${capacityCheck.capacity} reached (${capacityCheck.used}).`, 'error');
        return;
      }
      if (editCopyIndex !== null) {
        const current = copies[editCopyIndex];
        if (current?.availability === 'Borrowed') {
          showToast('Borrowed copies cannot be modified from this modal.', 'warning');
          return;
        }
      }
    })();
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
    const target = copies[idx];
    if (target?.availability === 'Borrowed') {
      showToast('Borrowed copies cannot be removed.', 'error');
      return;
    }
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

  const deweyOptions = DEWEY_CLASSES.map(item => ({
    value: formatDeweyDisplay(item),
    display: `${item.code} · ${item.label}`
  }));

  const bookFields = [
    { key: 'title', label: 'Title', required: true },
    { key: 'author', label: 'Author', required: true },
    { key: 'edition', label: 'Edition' },
    { key: 'publisher', label: 'Publisher' },
    { key: 'year', label: 'Year', required: true, type: 'number' },
    { key: 'subject', label: 'Subject', required: true, select: true, options: deweyOptions },
    { key: 'language', label: 'Language' },
    { key: 'isbn', label: 'ISBN' }
  ];

  const copyFields = [
    { key: 'accessionNumber', label: 'Accession Number', required: true },
    { key: 'location', label: 'Location', required: true, select: true, options: locations },
    { key: 'availability', label: 'Availability', select: true },
    { key: 'condition', label: 'Condition', select: true, options: conditionOptions }
  ];

  const editingCopy = editCopyIndex !== null ? copies[editCopyIndex] : null;
  const editingCopyAvailability = editingCopy?.availability || '';
  const editingCopyIsAvailable = editingCopyAvailability === 'Available';
  const copyIsBorrowed = editingCopyAvailability === 'Borrowed';
  const copyAvailabilityOptions = useMemo(() => {
    let options;
    if (editCopyIndex === null) {
      options = ['Available', 'Reserved'];
    } else if (copyIsBorrowed) {
      options = ['Borrowed'];
    } else {
      options = ['Available', 'Reserved', 'Lost'];
      if (editingCopyAvailability && !options.includes(editingCopyAvailability)) {
        options = [...options, editingCopyAvailability];
      }
    }
    if (copyForm.availability && !options.includes(copyForm.availability)) {
      options = [...options, copyForm.availability];
    }
    return options;
  }, [editCopyIndex, copyIsBorrowed, editingCopyAvailability, copyForm.availability]);

  const availabilityStats = useMemo(() => {
    const total = copies.length;
    const available = copies.filter(c => c.availability === 'Available').length;
    const borrowed = copies.filter(c => c.availability === 'Borrowed').length;
    const reserved = copies.filter(c => c.availability === 'Reserved').length;
    const lost = copies.filter(c => c.availability === 'Lost').length;
    return { total, available, borrowed, reserved, lost };
  }, [copies]);

  const copyInvalid =
    !copyForm.accessionNumber ||
    !copyForm.location ||
    accessionExists(copyForm.accessionNumber, editCopyIndex);

  const baseSelectMenuProps = useMemo(() => ({
    PaperProps: {
      sx: {
        maxHeight: 320,
        minWidth: 260,
        '& .MuiMenuItem-root': {
          whiteSpace: 'normal',
          lineHeight: 1.25,
          alignItems: 'flex-start'
        }
      }
    }
  }), []);

  const wideSelectMenuProps = useMemo(() => ({
    PaperProps: {
      sx: {
        maxHeight: 320,
        minWidth: 320,
        '& .MuiMenuItem-root': {
          whiteSpace: 'normal',
          lineHeight: 1.25,
          alignItems: 'flex-start'
        }
      }
    }
  }), []);

  const formatLocationLabel = (value) => {
    if (!value) {
      return (
        <Typography component="span" color="text.disabled" sx={{ fontStyle: 'italic' }}>
          Select a location
        </Typography>
      );
    }
    const label = getLocationName(value);
    return label || `Location #${value}`;
  };

  const renderEmptyValue = (label) => (value) =>
    value ? (
      value
    ) : (
      <Typography component="span" color="text.disabled" sx={{ fontStyle: 'italic' }}>
        {`Select ${label.toLowerCase()}`}
      </Typography>
    );

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
            p: 0
          }}
        >
          <Stack spacing={2.5} sx={{ p: { xs: 2, md: 2.75 } }}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                p: { xs: 2, md: 3 },
                bgcolor: 'background.paper'
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {isEdit ? 'Update book record' : 'New book record'}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                    Bibliographic details and copies
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Review required fields and confirm the number of copies before saving.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <Chip
                    size="small"
                    label={requiredBookKeys.every(k => bookForm[k]) ? 'Details complete' : 'Details missing'}
                    color={requiredBookKeys.every(k => bookForm[k]) ? 'success' : 'warning'}
                    sx={{ fontWeight: 600, borderRadius: 1 }}
                  />
                  <Chip
                    size="small"
                    label={`Copies: ${copies.length}`}
                    color={copies.length ? 'primary' : 'default'}
                    sx={{ fontWeight: 600, borderRadius: 1 }}
                  />
                  {unsaved && (
                    <Chip size="small" color="warning" label="Unsaved" sx={{ fontWeight: 600, borderRadius: 1 }} />
                  )}
                </Stack>
              </Stack>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                border: theme => `1.5px solid ${theme.palette.divider}`,
                overflow: 'hidden',
                bgcolor: 'background.paper'
              }}
            >
              <Tabs
                value={tabIndex}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: { xs: 1, md: 2 }, pt: 1 }}
              >
                <Tab
                  value={0}
                  label="Details"
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                />
                <Tab
                  value={1}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
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
              <Divider />

              <Box sx={{ display: tabIndex === 0 ? 'block' : 'none', p: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 2 } }}>
                <Stack spacing={2.5}>
                  <Box
                    sx={{
                      borderRadius: 2,
                      border: theme => `1.5px dashed ${theme.palette.primary.light}`,
                      bgcolor: theme => theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.grey[50],
                      p: { xs: 2, md: 2.5 }
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                        <Typography fontWeight={700} fontSize={15}>
                          Step 1 · Catalog bibliographic details
                        </Typography>
                        <Chip
                          size="small"
                          color={requiredBookKeys.every(k => bookForm[k]) ? 'success' : 'default'}
                          label={requiredBookKeys.every(k => bookForm[k]) ? 'Ready' : 'Fill required fields'}
                          sx={{ fontWeight: 600, borderRadius: 1 }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Provide the essential information found on the book’s title page so search, shelving, and circulation stay in sync.
                      </Typography>
                    </Stack>
                  </Box>

                  <Grid container spacing={2.25}>
                    {bookFields.map(({ key, label, required, type, select, options }) => (
                      <Grid item xs={12} sm={6} key={key}>
                        {select ? (
                          <TextField
                            select
                            label={label}
                            name={key}
                            value={bookForm[key]}
                            onChange={e => {
                              handleBookChange(e);
                              setUnsaved(true);
                            }}
                            fullWidth
                            size="medium"
                            required={required}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
                            SelectProps={{
                              displayEmpty: true,
                              renderValue: value =>
                                value ? (
                                  value
                                ) : (
                                  <Typography component="span" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                    Select a subject
                                  </Typography>
                                )
                            }}
                          >
                            <MenuItem value="" disabled>
                              <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                Select a subject
                              </Typography>
                            </MenuItem>
                            {options.map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.display}
                              </MenuItem>
                            ))}
                            {bookForm[key] && !options.some(option => option.value === bookForm[key]) && (
                              <MenuItem value={bookForm[key]}>
                                {bookForm[key]}
                              </MenuItem>
                            )}
                          </TextField>
                        ) : (
                          <TextField
                            label={label}
                            name={key}
                            value={bookForm[key]}
                            onChange={e => {
                              handleBookChange(e);
                              setUnsaved(true);
                            }}
                            fullWidth
                            size="medium"
                            required={required}
                            type={type || 'text'}
                            InputLabelProps={type === 'number' ? { shrink: true } : undefined}
                            autoComplete="off"
                            InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
                          />
                        )}
                      </Grid>
                    ))}
                  </Grid>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Tip: Complete required fields now—you can still fine-tune the entry before saving.
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ display: tabIndex === 1 ? 'block' : 'none', p: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 2 } }}>
                <Stack spacing={2.5}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Typography fontWeight={700} fontSize={15}>
                      Physical copies ledger
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip size="small" label={`Total ${availabilityStats.total}`} color="primary" sx={{ fontWeight: 600, borderRadius: 1 }} />
                      <Chip size="small" label={`${availabilityStats.available} available`} color="success" sx={{ fontWeight: 600, borderRadius: 1 }} />
                      <Chip size="small" label={`${availabilityStats.borrowed} borrowed`} color="warning" sx={{ fontWeight: 600, borderRadius: 1 }} />
                      <Chip size="small" label={`${availabilityStats.reserved} reserved`} color="info" sx={{ fontWeight: 600, borderRadius: 1 }} />
                      <Chip size="small" label={`${availabilityStats.lost} lost`} color="error" sx={{ fontWeight: 600, borderRadius: 1 }} />
                    </Stack>
                  </Stack>

                  <Grid container spacing={2.25}>
                    {copyFields.map(({ key, label, required, select, options }) => {
                      const isLocationField = key === 'location';
                      const isAvailabilityField = key === 'availability';
                      if (select && isLocationField) {
                        return (
                          <Grid item xs={12} md={6} key={key}>
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
                              size="medium"
                              required={required}
                              helperText={locations.length === 0 ? 'Add locations first.' : 'Choose where this copy is stored.'}
                              disabled={locations.length === 0 || copyIsBorrowed}
                              InputLabelProps={{ shrink: true }}
                              InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
                              SelectProps={{
                                displayEmpty: true,
                                MenuProps: wideSelectMenuProps,
                                renderValue: value => formatLocationLabel(value)
                              }}
                            >
                              {[<MenuItem key="location-placeholder" value="" disabled>
                                <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  Select a location
                                </Typography>
                              </MenuItem>,
                              ...(locations.length === 0 ? [
                                <MenuItem key="location-empty" value="no-location" disabled>
                                  No locations available
                                </MenuItem>
                              ] : []),
                              ...locations.map(loc => (
                                <MenuItem key={loc.ID} value={String(loc.ID)} sx={{ whiteSpace: 'normal', alignItems: 'flex-start' }}>
                                  <Stack spacing={0.25}>
                                    <Typography fontWeight={600}>{loc.Name}</Typography>
                                    {typeof loc.Capacity !== 'undefined' && (
                                      <Typography variant="caption" color="text.secondary">
                                        Capacity: {loc.Capacity || 'Unlimited'}
                                      </Typography>
                                    )}
                                  </Stack>
                                </MenuItem>
                              ))]}
                            </TextField>
                          </Grid>
                        );
                      }

                      if (select && isAvailabilityField) {
                        return (
                          <Grid item xs={12} md={3} key={key}>
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
                              size="medium"
                              required={required}
                              disabled={copyIsBorrowed}
                              InputLabelProps={{ shrink: true }}
                              InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
                              SelectProps={{
                                MenuProps: baseSelectMenuProps,
                                displayEmpty: true,
                                renderValue: renderEmptyValue(label)
                              }}
                            >
                              {[<MenuItem key="availability-placeholder" value="" disabled>
                                <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  {`Select ${label.toLowerCase()}`}
                                </Typography>
                              </MenuItem>,
                              ...copyAvailabilityOptions.map(option => (
                                <MenuItem
                                  key={option}
                                  value={option}
                                  sx={{ whiteSpace: 'normal' }}
                                  disabled={
                                    (copyIsBorrowed && option === 'Borrowed') ||
                                    (editCopyIndex !== null && editingCopyIsAvailable && option === 'Available')
                                  }
                                >
                                  {option}
                                </MenuItem>
                              ))]}
                            </TextField>
                          </Grid>
                        );
                      }

                      if (select) {
                        return (
                          <Grid item xs={12} md={3} key={key}>
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
                              size="medium"
                              required={required}
                              disabled={copyIsBorrowed}
                              InputLabelProps={{ shrink: true }}
                              InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
                              SelectProps={{
                                MenuProps: baseSelectMenuProps,
                                displayEmpty: true,
                                renderValue: renderEmptyValue(label)
                              }}
                            >
                              {[<MenuItem key={`${key}-placeholder`} value="" disabled>
                                <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  {`Select ${label.toLowerCase()}`}
                                </Typography>
                              </MenuItem>,
                              ...options.map(opt => (
                                <MenuItem key={opt} value={opt} sx={{ whiteSpace: 'normal' }}>
                                  {opt}
                                </MenuItem>
                              ))]}
                            </TextField>
                          </Grid>
                        );
                      }

                      return (
                        <Grid item xs={12} md={3} key={key}>
                          <TextField
                            label={label}
                            name={key}
                            value={copyForm[key]}
                            onChange={e => {
                              handleCopyChange(e);
                              setUnsaved(true);
                            }}
                            fullWidth
                            size="medium"
                            required={required}
                            autoComplete="off"
                            InputLabelProps={{ shrink: true }}
                            InputProps={{ sx: { borderRadius: 1.5, minHeight: 56 } }}
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
                          />
                        </Grid>
                      );
                    })}

                    <Grid item xs={12} md={3}>
                      <Button
                        size="medium"
                        variant="outlined"
                        startIcon={<AutoFixHigh />}
                        onClick={generateAccession}
                        fullWidth
                        disabled={!!copyForm.accessionNumber}
                        sx={{ minHeight: 56, fontWeight: 600, borderRadius: 1 }}
                      >
                        Auto accession
                      </Button>
                    </Grid>

                    <Grid item xs={12}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                        <Button
                          variant="contained"
                          size="medium"
                          startIcon={editCopyIndex !== null ? <Save /> : <Add />}
                          onClick={handleCopyAction}
                          disabled={copyIsBorrowed || copyInvalid || locations.length === 0}
                          sx={{ fontWeight: 700, borderRadius: 1, minHeight: 48 }}
                        >
                          {editCopyIndex !== null ? 'Update copy' : 'Add copy'}
                        </Button>
                        {editCopyIndex !== null && (
                          <Button
                            variant="text"
                            color="secondary"
                            size="medium"
                            startIcon={<Cancel />}
                            onClick={cancelEditCopy}
                            sx={{ fontWeight: 600, borderRadius: 1, minHeight: 48 }}
                          >
                            Cancel
                          </Button>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>

                  <Divider />

                  <Box
                    sx={{
                      border: theme => `1.5px solid ${theme.palette.divider}`,
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      bgcolor: 'background.default'
                    }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow
                          sx={{
                            '& th': {
                              fontWeight: 700,
                              fontSize: 12,
                              letterSpacing: 0.4,
                              borderBottom: theme => `2px solid ${theme.palette.divider}`,
                              bgcolor: 'background.paper'
                            }
                          }}
                        >
                          <TableCell>Accession #</TableCell>
                          <TableCell>Location</TableCell>
                          <TableCell>Availability</TableCell>
                          <TableCell>Condition</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody
                        sx={{
                          '& td': { borderBottom: theme => `1px solid ${theme.palette.divider}` },
                          '& tr:hover': { background: theme => theme.palette.action.hover }
                        }}
                      >
                        {copies.map((copy, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <div>{copy.accessionNumber}</div>
                              {(copy.updatedOn || copy.UpdatedOn) ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Updated: {formatDate(copy.updatedOn || copy.UpdatedOn)}
                                </Typography>
                              ) : null}
                            </TableCell>
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
                                    : copy.availability === 'Lost'
                                    ? 'error'
                                    : 'success'
                                }
                                sx={{ fontWeight: 600, borderRadius: 1 }}
                              />
                            </TableCell>
                            <TableCell>{copy.condition || '-'}</TableCell>
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
                              <Tooltip
                                title={
                                  copy.availability === 'Borrowed'
                                    ? 'Borrowed copies cannot be removed'
                                    : 'Remove'
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeCopy(idx)}
                                    sx={{ borderRadius: 0.75 }}
                                    disabled={copy.availability === 'Borrowed'}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                        {copies.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No copies added yet.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Keep your circulation dashboard accurate by logging every shelf or storage location.
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          </Stack>
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