import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  useTheme,
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
  physicalStatus: '',
  condition: '',
  location: '',
};

const BookManagementPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [copyForm, setCopyForm] = useState(initialCopyForm);
  const [copies, setCopies] = useState([]);
  const [editCopyIndex, setEditCopyIndex] = useState(null);

  const API_BASE = 'https://api.koronadal-library.site/api';

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/books`);
      setBooks(res.data);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    }
  };

  const openAddModal = () => {
    setIsEdit(false);
    setBookForm(initialBookForm);
    setCopyForm(initialCopyForm);
    setCopies([]);
    setModalOpen(true);
  };

  const openEditModal = (book) => {
    setIsEdit(true);
    setEditId(book.Book_ID || book.id);
    setBookForm({
      title: book.title,
      author: book.author,
      edition: book.edition,
      publisher: book.publisher,
      year: book.year,
      subject: book.subject,
      language: book.language,
      isbn: book.isbn,
    });
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
    setEditCopyIndex(null);
  };

  const handleBookChange = (e) => {
    const { name, value } = e.target;
    setBookForm({
      ...bookForm,
      [name]: name === 'year' ? parseInt(value) || '' : value,
    });
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
  };

  const handleSaveBook = async () => {
    const bookData = {
      ...bookForm,
      inventory: copies,
    };

    try {
      if (isEdit) {
        await axios.put(`${API_BASE}/books/${editId}`, bookData);
      } else {
        await axios.post(`${API_BASE}/books`, bookData);
      }

      await fetchBooks();
      handleClose();
    } catch (error) {
      console.error('Error saving book:', error.response?.data || error.message);
      alert('Failed to save book.');
    }
  };

  const filteredBooks = books.filter((book) =>
    (book.title || '').toLowerCase().includes(search.toLowerCase())
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
          <TableHead sx={{ backgroundColor: theme.palette.primary.light }}>
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
              <React.Fragment key={book.Book_ID || book.id}>
                <TableRow>
                  <TableCell>{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.publisher}</TableCell>
                  <TableCell>{book.year}</TableCell>
                  <TableCell>{book.inventory?.length || 0}</TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => openEditModal(book)}>
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
                {book.inventory?.map((copy, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      backgroundColor: isDark ? theme.palette.action.hover : '#f9f9f9',
                    }}
                  >
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
                  <Button
                    size="small"
                    onClick={() => {
                      setCopyForm(copy);
                      setEditCopyIndex(idx);
                    }}
                  >
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