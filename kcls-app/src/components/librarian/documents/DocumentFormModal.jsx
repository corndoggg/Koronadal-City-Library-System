import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, MenuItem, Typography, Alert
} from '@mui/material';

const defaultForm = {
  title: '',
  author: '',
  category: '',
  department: '',
  classification: '',
  year: '',
  sensitivity: '',
};

const sensitivities = ['Public', 'Confidential', 'Restricted'];

const DocumentFormModal = ({
  open,
  onClose,
  onSave,
  isEdit = false,
  documentData = null,
}) => {
  const [form, setForm] = useState(defaultForm);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && documentData) {
      const { Title, Author, Category, Department, Classification, Year, Sensitivity } = documentData;
      setForm({
        title: Title || '',
        author: Author || '',
        category: Category || '',
        department: Department || '',
        classification: Classification || '',
        year: Year || '',
        sensitivity: Sensitivity || '',
      });
    } else {
      setForm(defaultForm);
      setFile(null);
    }
  }, [isEdit, documentData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'year' ? parseInt(value) || '' : value });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return;
    }
    setFile(selected);
    setError('');
  };

  const handleSubmit = () => {
    const requiredFields = ['title', 'author', 'category', 'department', 'classification', 'year', 'sensitivity'];
    const hasEmpty = requiredFields.some(field => !form[field]);

    if (hasEmpty) {
      setError('Please fill out all required fields.');
      return;
    }

    if (!isEdit && !file) {
      setError('Please select a PDF file to upload.');
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (file) formData.append('file', file);

    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Document' : 'Add Document'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Title" name="title" value={form.title} onChange={handleChange} fullWidth />
          <TextField label="Author" name="author" value={form.author} onChange={handleChange} fullWidth />
          <TextField label="Category" name="category" value={form.category} onChange={handleChange} fullWidth />
          <TextField label="Department" name="department" value={form.department} onChange={handleChange} fullWidth />
          <TextField label="Classification" name="classification" value={form.classification} onChange={handleChange} fullWidth />
          <TextField label="Year" name="year" type="number" value={form.year} onChange={handleChange} fullWidth />
          <TextField
            label="Sensitivity"
            name="sensitivity"
            value={form.sensitivity}
            onChange={handleChange}
            select
            fullWidth
          >
            {sensitivities.map((level) => (
              <MenuItem key={level} value={level}>
                {level}
              </MenuItem>
            ))}
          </TextField>

          {!isEdit && (
            <>
              <Typography variant="body2">Upload PDF Document</Typography>
              <input type="file" accept="application/pdf" onChange={handleFileChange} />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {isEdit ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentFormModal;
