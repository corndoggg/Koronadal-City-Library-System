import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  MenuItem,
  Alert,
  Snackbar,
  Box,
  LinearProgress,
  useTheme,
} from "@mui/material";
import axios from "axios";

const initialForm = {
  title: "",
  author: "",
  category: "",
  department: "",
  classification: "",
  year: "",
  sensitivity: "",
  file: null,
  filePath: "",
};

const categories = [
  "Thesis",
  "Research",
  "Case Study",
  "Feasibility Study",
  "Capstone",
  "Other",
];

const sensitivities = [
  "Public",
  "Restricted",
  "Confidential",
];

function DocumentFormModal({ open, onClose, onSave, isEdit, documentData }) {
  const theme = useTheme();
  const [form, setForm] = useState(initialForm);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const API_BASE = import.meta.env.VITE_API_BASE;

  // Ref for the hidden file input
  const fileInputRef = React.useRef();

  useEffect(() => {
    if (isEdit && documentData) {
      setForm({
        title: documentData.Title || "",
        author: documentData.Author || "",
        category: documentData.Category || "",
        department: documentData.Department || "",
        classification: documentData.Classification || "",
        year: documentData.Year || "",
        sensitivity: documentData.Sensitivity || "",
        file: null,
        filePath: documentData.File_Path || "",
      });
    } else {
      setForm(initialForm);
    }
    setUploadProgress(0);
  }, [isEdit, documentData, open]);

  // Update handleChange to also set filePath when adding a document
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file" && files && files[0]) {
      setForm((prev) => ({
        ...prev,
        file: files[0],
        filePath: files[0].name, // Set the filePath to the file name on add
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      // For edit, send as FormData (no file upload)
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("author", form.author);
      payload.append("category", form.category);
      payload.append("department", form.department);
      payload.append("classification", form.classification);
      payload.append("year", form.year);
      payload.append("sensitivity", form.sensitivity);
      payload.append("filePath", form.filePath);
      onSave(payload);
    } else {
      // For add, send as FormData (with file)
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("author", form.author);
      fd.append("category", form.category);
      fd.append("department", form.department);
      fd.append("classification", form.classification);
      fd.append("year", form.year);
      fd.append("sensitivity", form.sensitivity);
      if (form.file) fd.append("file", form.file);
      onSave(fd);
    }
  };

  // Handle file change for edit mode with progress bar
  const handleFileChangeEdit = async (e) => {
    const file = e.target.files[0];
    if (!file || !documentData) return;
    setFileUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.put(
        `${API_BASE}/upload/edit/${documentData.Document_ID}`,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          },
        }
      );
      setForm((prev) => ({
        ...prev,
        filePath: res.data.filePath,
      }));
      setSnackbar({ open: true, message: "PDF file updated!", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to update PDF file", severity: "error" });
    }
    setFileUploading(false);
    setUploadProgress(0);
  };

  // "Change PDF File" directly opens file selection
  const handleChangePdfClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // reset so same file can be selected again
      fileInputRef.current.click();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          pb: 1,
          background: theme.palette.background.default,
          color: theme.palette.text.primary,
        }}
      >
        {isEdit ? "Edit Document" : "Add Document"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent
          sx={{
            background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#f9f9fb',
            color: theme.palette.text.primary,
          }}
        >
          <Stack spacing={2}>
            <TextField
              label="Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              fullWidth
              size="small"
              sx={{
                background: theme.palette.background.paper,
                borderRadius: 1,
              }}
            />
            <TextField
              label="Author"
              name="author"
              value={form.author}
              onChange={handleChange}
              required
              fullWidth
              size="small"
              sx={{
                background: theme.palette.background.paper,
                borderRadius: 1,
              }}
            />
            <TextField
              label="Category"
              name="category"
              value={form.category}
              onChange={handleChange}
              select
              required
              fullWidth
              size="small"
              sx={{
                background: theme.palette.background.paper,
                borderRadius: 1,
              }}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Department"
              name="department"
              value={form.department}
              onChange={handleChange}
              required
              fullWidth
              size="small"
              sx={{
                background: theme.palette.background.paper,
                borderRadius: 1,
              }}
            />
            <TextField
              label="Classification"
              name="classification"
              value={form.classification}
              onChange={handleChange}
              required
              fullWidth
              size="small"
              sx={{
                background: theme.palette.background.paper,
                borderRadius: 1,
              }}
            />
            <TextField
              label="Year"
              name="year"
              value={form.year}
              onChange={handleChange}
              required
              type="number"
              fullWidth
              size="small"
              sx={{
                background: theme.palette.background.paper,
                borderRadius: 1,
              }}
            />
            <TextField
              label="Sensitivity"
              name="sensitivity"
              value={form.sensitivity}
              onChange={handleChange}
              select
              required
              fullWidth
              size="small"
              sx={{
                background: theme.palette.background.paper,
                borderRadius: 1,
              }}
            >
              {sensitivities.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            {!isEdit && (
              <Button variant="outlined" component="label">
                Upload PDF
                <input
                  type="file"
                  name="file"
                  accept="application/pdf"
                  hidden
                  onChange={handleChange}
                  required
                />
              </Button>
            )}
            {isEdit && (
              <Box>
                <TextField
                  label="File Path"
                  name="filePath"
                  value={form.filePath}
                  fullWidth
                  disabled
                  helperText="To change the file, click 'Change PDF File'."
                  sx={{ mb: 1 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleChangePdfClick}
                  disabled={fileUploading}
                >
                  {fileUploading ? "Uploading..." : "Change PDF File"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={handleFileChangeEdit}
                />
                {fileUploading && (
                  <Box sx={{ width: '100%', mt: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                      {uploadProgress}%
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            {!isEdit && form.filePath && (
              <Box sx={{ mt: 1, color: 'text.secondary', fontSize: 14 }}>
                Selected file: {form.filePath}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            background: theme.palette.background.paper,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Button onClick={onClose} size="small" variant="outlined" color="secondary">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={fileUploading} size="small" color="primary">
            {isEdit ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </form>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

export default DocumentFormModal;
