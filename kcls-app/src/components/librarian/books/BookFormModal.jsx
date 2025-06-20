import React from 'react';
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
  handleAddCopy,
  editCopyIndex,
  copies,
  setCopyForm,
  setEditCopyIndex,
  handleSaveBook,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>{isEdit ? 'Edit Book' : 'Add New Book'}</DialogTitle>
    <DialogContent dividers>
      <Grid container spacing={2}>
        {Object.entries(initialBookForm).map(([key]) => (
          <Grid item xs={12} sm={6} key={key}>
            <TextField
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              name={key}
              value={bookForm[key]}
              onChange={handleBookChange}
              fullWidth
            />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 2 }} />
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
            />
          </Grid>
        ))}
        <Grid item xs={12}>
          <Button
            variant={editCopyIndex !== null ? 'contained' : 'outlined'}
            onClick={handleAddCopy}
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
                  <TableCell>{copy.accessionNumber}</TableCell>
                  <TableCell>{copy.location}</TableCell>
                  <TableCell>{copy.availability}</TableCell>
                  <TableCell>{copy.condition}</TableCell>
                  <TableCell>{copy.physicalStatus}</TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="text"
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
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="contained" onClick={handleSaveBook}>
        {isEdit ? 'Update Book' : 'Save Book'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default BookFormModal;