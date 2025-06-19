// Same imports as before
import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from '@mui/material';
import { Edit, Add } from '@mui/icons-material';

const initialBookForm = {
  title: '',
  author: '',
  edition: '',
  publisher: '',
  year: '',
  subject: '',
  language: '',
  isbn: '',
};

const initialCopyForm = {
  accessionNumber: '',
  availability: 'Available',
  condition: '',
  location: '',
};

const sampleBooks = [
  {
    id: 1,
    title: 'Fundamentals of Soil',
    author: 'J. Smith',
    edition: '2nd',
    publisher: 'AgriPub',
    year: 2018,
    subject: 'Agriculture',
    language: 'English',
    isbn: '97801234567',
    inventory: [
      {
        accessionNumber: 'B1001',
        availability: 'Available',
        condition: 'Shelf-worn',
        location: 'Shelf A1',
      },
    ],
  },
  {
    id: 2,
    title: 'Farming Basics',
    author: 'L. Gomez',
    edition: '1st',
    publisher: 'GreenBooks',
    year: 2020,
    subject: 'Farming',
    language: 'English',
    isbn: '97809876543',
    inventory: [
      {
        accessionNumber: 'B1002',
        availability: 'Borrowed',
        condition: 'None',
        location: 'Shelf A2',
      },
    ],
  },
];

const BookManagementPage = () => {
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState(sampleBooks);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  const [bookForm, setBookForm] = useState(initialBookForm);
  const [copyForm, setCopyForm] = useState(initialCopyForm);
  const [copies, setCopies] = useState([]);
  const [editCopyIndex, setEditCopyIndex] = useState(null);

  const openAddModal = () => {
    setIsEdit(false);
    setBookForm(initialBookForm);
    setCopyForm(initialCopyForm);
    setCopies([]);
    setModalOpen(true);
  };

  const openEditModal = (book) => {
    setIsEdit(true);
    setEditId(book.id);
    setBookForm({ ...book });
    setCopies(book.inventory || []);
    setCopyForm(initialCopyForm);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setIsEdit(false);
    setBookForm(initialBookForm);
    setCopyForm(initialCopyForm);
    setCopies([]);
  };

  const handleBookChange = (e) => {
    setBookForm({ ...bookForm, [e.target.name]: e.target.value });
  };

  const handleCopyChange = (e) => {
    setCopyForm({ ...copyForm, [e.target.name]: e.target.value });
  };

  const handleAddCopy = () => {
    if (copyForm.accessionNumber && copyForm.location) {
      if (editCopyIndex !== null) {
        const updated = [...copies];
        updated[editCopyIndex] = copyForm;
        setCopies(updated);
        setEditCopyIndex(null);
      } else {
        setCopies([...copies, copyForm]);
      }
      setCopyForm(initialCopyForm);
    }
  }

  const handleSaveBook = () => {
    const bookData = {
      ...bookForm,
      id: isEdit ? editId : books.length + 1,
      inventory: copies,
    };

    if (isEdit) {
      setBooks((prev) =>
        prev.map((book) => (book.id === editId ? bookData : book))
      );
    } else {
      setBooks([...books, bookData]);
    }

    handleClose();
  };

  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Book Management
        </Typography>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          sx={{ borderRadius: 2, fontWeight: 'bold', px: 3 }}
          onClick={openAddModal}
        >
          Add Book
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          label="Search books"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 250 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: 'primary.light' }}>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Publisher</TableCell>
              <TableCell>Year</TableCell>
              <TableCell>Copies</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBooks.map((book) => (
              <React.Fragment key={book.id}>
                <TableRow>
                  <TableCell>{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.publisher}</TableCell>
                  <TableCell>{book.year}</TableCell>
                  <TableCell>{book.inventory.length}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => openEditModal(book)}
                    >
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
                {book.inventory.map((copy, index) => (
                  <TableRow key={index} sx={{ backgroundColor: '#f9f9f9' }}>
                    <TableCell colSpan={2} sx={{ pl: 4 }}>
                      Accession: {copy.accessionNumber}
                    </TableCell>
                    <TableCell>Location: {copy.location}</TableCell>
                    <TableCell>Condition: {copy.condition}</TableCell>
                    <TableCell>Availability: {copy.availability}</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
            {filteredBooks.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No books found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Shared Modal for Add/Edit */}
      <Dialog open={modalOpen} onClose={handleClose} maxWidth="md" fullWidth>
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
            <Box mt={2}>
                <Typography fontWeight={600}>Book Copies:</Typography>
                {copies.map((copy, idx) => (
                <Box
                    key={idx}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={1}
                >
                    <Typography variant="body2">
                    • {copy.accessionNumber} – {copy.location}, {copy.availability}
                    </Typography>
                    <Button size="small" onClick={() => {
                    setCopyForm(copy);
                    setEditCopyIndex(idx);
                    }}>
                    Edit
                    </Button>
                </Box>
                ))}
            </Box>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveBook}>
            {isEdit ? 'Update Book' : 'Save Book'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookManagementPage;
