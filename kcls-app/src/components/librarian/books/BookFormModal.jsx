import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Divider,
  Typography,
  Button,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from '@mui/material';

const BookFormModal = ({
  open,
  onClose,
  isEdit,
  bookForm,
  handleBookChange,
  initialBookForm,
  copyForm,
  handleCopyChange,
  initialCopyForm,
  handleSaveBook,
  editCopyIndex,
  copies,
  setCopyForm,
  setEditCopyIndex,
  setCopies,
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleTabChange = (event, newValue) => setTabIndex(newValue);

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleCopyAction = () => {
    if (!copyForm.accessionNumber || !copyForm.location) {
      return showToast('Accession Number and Location are required.', 'error');
    }

    if (editCopyIndex !== null) {
      const updated = [...copies];
      updated[editCopyIndex] = copyForm;
      setCopies(updated);
      setEditCopyIndex(null);
      showToast('Copy updated.');
    } else {
      if (copies.some((c) => c.accessionNumber === copyForm.accessionNumber)) {
        return showToast('Duplicate accession number.', 'error');
      }
      setCopies([...copies, copyForm]);
      showToast('Copy added.');
    }

    setCopyForm(initialCopyForm);
  };

  const validateBookForm = () => {
    const requiredFields = ['title', 'author', 'year'];
    for (let key of requiredFields) {
      if (!bookForm[key]) {
        showToast(`Please fill in the ${key} field.`, 'error');
        return false;
      }
    }
    return true;
  };

  const onSaveBook = () => {
    if (!validateBookForm()) return;
    if (copies.length === 0) {
      return showToast('Please add at least one copy.', 'error');
    }
    handleSaveBook();
    showToast(isEdit ? 'Book updated.' : 'Book added.');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? 'Edit Book' : 'Add New Book'}</DialogTitle>
        <DialogContent dividers>
          <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Book Details" />
            <Tab label="Book Copies" />
          </Tabs>

          {tabIndex === 0 && (
            <Grid container spacing={2}>
              {Object.entries(initialBookForm).map(([key]) => (
                <Grid item xs={12} sm={6} key={key}>
                  <TextField
                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                    name={key}
                    value={bookForm[key]}
                    onChange={handleBookChange}
                    fullWidth
                    size="small"
                    required={['title', 'author', 'year'].includes(key)}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {tabIndex === 1 && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                {editCopyIndex !== null ? 'Edit Copy' : 'Add Book Copy'}
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(initialCopyForm).map(([key]) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <TextField
                      label={key.charAt(0).toUpperCase() + key.slice(1)}
                      name={key}
                      value={copyForm[key]}
                      onChange={handleCopyChange}
                      fullWidth
                      size="small"
                      required={['accessionNumber', 'location'].includes(key)}
                    />
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Button
                    variant={editCopyIndex !== null ? 'contained' : 'outlined'}
                    onClick={handleCopyAction}
                    size="small"
                  >
                    {editCopyIndex !== null ? 'Update Copy' : 'Add Copy'}
                  </Button>
                </Grid>
              </Grid>

              {copies.length > 0 && (
                <Box mt={3}>
                  <Typography fontWeight={600} gutterBottom>
                    Book Copies:
                  </Typography>
                  <Table size="small">
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
                        <TableRow key={idx}>
                          <TableCell>{copy.Accession_Number}</TableCell>
                          <TableCell>{copy.Booklocation}</TableCell>
                          <TableCell>{copy.Availability}</TableCell>
                          <TableCell>{copy.BookCondition}</TableCell>
                          <TableCell>{copy.Physical_Status}</TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              onClick={() => {
                                setCopyForm(copy);
                                setEditCopyIndex(idx);
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} size="small">Cancel</Button>
          <Button variant="contained" onClick={onSaveBook} size="small">
            {isEdit ? 'Update Book' : 'Save Book'}
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
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BookFormModal;