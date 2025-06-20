import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, useTheme,
  Pagination, Snackbar, Alert, Stack
} from '@mui/material';
import { Edit, Add } from '@mui/icons-material';
import BookFormModal from '../../../components/librarian/books/BookFormModal';

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
  const API_BASE = 'https://api.koronadal-library.site/api';

  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [copyForm, setCopyForm] = useState(initialCopyForm);
  const [copies, setCopies] = useState([]);
  const [editCopyIndex, setEditCopyIndex] = useState(null);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [search, books]);

  const fetchBooks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/books`);
      setBooks(res.data);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      showToast('Failed to load books', 'error');
    }
  };

  const handleSearch = () => {
    const lowerSearch = search.toLowerCase();
    const filtered = books.filter(book =>
      Object.values(book).some(
        value => typeof value === 'string' && value.toLowerCase().includes(lowerSearch)
      ) ||
      book.inventory?.some(copy =>
        Object.values(copy).some(
          val => typeof val === 'string' && val.toLowerCase().includes(lowerSearch)
        )
      )
    );
    setFilteredBooks(filtered);
    setCurrentPage(1);
  };

  const handleBookChange = (e) => {
    const { name, value } = e.target;
    setBookForm({ ...bookForm, [name]: name === 'year' ? parseInt(value) || '' : value });
  };

  const handleCopyChange = (e) => {
    setCopyForm({ ...copyForm, [e.target.name]: e.target.value });
  };

  const handleAddCopy = () => {
    if (copyForm.accessionNumber && copyForm.location) {
      const updated = [...copies];
      if (editCopyIndex !== null) {
        updated[editCopyIndex] = copyForm;
        setEditCopyIndex(null);
        showToast('Copy updated');
      } else {
        updated.push(copyForm);
        showToast('Copy added');
      }
      setCopies(updated);
      setCopyForm(initialCopyForm);
    } else {
      showToast('Accession Number and Location are required', 'error');
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
        showToast('Book updated');
      } else {
        await axios.post(`${API_BASE}/books`, bookData);
        showToast('Book added');
      }
      await fetchBooks();
      handleClose();
    } catch (error) {
      console.error('Error saving book:', error);
      showToast('Failed to save book', 'error');
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setIsEdit(false);
    setBookForm(initialBookForm);
    setCopyForm(initialCopyForm);
    setCopies([]);
    setEditCopyIndex(null);
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
      title: book.Title,
      author: book.Author,
      edition: book.Edition,
      publisher: book.Publisher,
      year: book.Year,
      subject: book.Subject,
      language: book.Language,
      isbn: book.ISBN,
    });
    setCopies(book.inventory || []);
    setCopyForm(initialCopyForm);
    setModalOpen(true);
  };

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirst, indexOfLast);

  return (
    <Box p={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Book Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openAddModal}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          Add Book
        </Button>
      </Box>

      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          label="Search books..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 300 }}
        />
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead sx={{ backgroundColor: theme.palette.background.neutral }}>
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
            {currentBooks.map((book) => (
              <React.Fragment key={book.Book_ID || book.id}>
                <TableRow hover>
                  <TableCell>{book.Title}</TableCell>
                  <TableCell>{book.Author}</TableCell>
                  <TableCell>{book.Publisher}</TableCell>
                  <TableCell>{book.Year}</TableCell>
                  <TableCell>{book.inventory?.length || 0}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => openEditModal(book)} color="primary">
                      <Edit fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
                {book.inventory?.map((copy, index) => (
                  <TableRow
                    key={index}
                    sx={{ backgroundColor: isDark ? theme.palette.action.hover : '#f5f5f5' }}
                  >
                    <TableCell colSpan={2} sx={{ pl: 4 }}>
                      Accession #: {copy.accessionNumber}
                    </TableCell>
                    <TableCell>Location: {copy.location}</TableCell>
                    <TableCell>Condition: {copy.condition}</TableCell>
                    <TableCell>Availability: {copy.availability}</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
            {currentBooks.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No books found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={Math.ceil(filteredBooks.length / rowsPerPage)}
          page={currentPage}
          onChange={(e, page) => setCurrentPage(page)}
          color="primary"
        />
      </Box>

      <BookFormModal
        open={modalOpen}
        onClose={handleClose}
        isEdit={isEdit}
        bookForm={bookForm}
        handleBookChange={handleBookChange}
        initialBookForm={initialBookForm}
        copyForm={copyForm}
        handleCopyChange={handleCopyChange}
        initialCopyForm={initialCopyForm}
        handleAddCopy={handleAddCopy}
        editCopyIndex={editCopyIndex}
        copies={copies}
        setCopyForm={setCopyForm}
        setCopies={setCopies}
        setEditCopyIndex={setEditCopyIndex}
        handleSaveBook={handleSaveBook}
      />

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
    </Box>
  );
};

export default BookManagementPage;