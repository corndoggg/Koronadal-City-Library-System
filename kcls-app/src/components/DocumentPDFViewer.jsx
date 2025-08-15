//// filepath: c:\Users\CLienT\Desktop\Koronadal City Library System\kcls-app\src\components\DocumentPDFViewer.jsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, useTheme
} from '@mui/material';
import { Close, Visibility } from '@mui/icons-material';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

const workerUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const DocumentPDFViewer = ({
  open,
  onClose,
  fileUrl,
  title = 'Viewing PDF Document',
  note = 'Downloading and printing are disabled for this preview.'
}) => {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: '90vh', md: 700 },
          bgcolor: theme.palette.background.paper,
          borderRadius: 3,
          boxShadow: 8,
          overflow: 'hidden',
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1,
          background: theme.palette.background.default, borderBottom: `1px solid ${theme.palette.divider}`, minHeight: 56,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Visibility color="primary" sx={{ fontSize: 28, mr: 1 }} />
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: 18 }}>
            {title}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
            size="small"
            sx={{
              color: theme.palette.grey[600],
              '&:hover': { color: theme.palette.error.main, bgcolor: theme.palette.action.hover }
            }}
            aria-label="Close PDF"
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 0, height: { xs: 'calc(90vh - 56px)', md: 644 },
          background: theme.palette.background.paper,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {fileUrl ? (
          <Worker workerUrl={workerUrl}>
            <Box
              sx={{
                width: '100%', height: '100%', maxHeight: 644, maxWidth: '100%',
                overflow: 'auto', background: theme.palette.background.paper,
                borderRadius: 2, boxShadow: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Viewer
                fileUrl={fileUrl}
                defaultScale={1.2}
                renderToolbar={() => null}
                plugins={[]}
                renderLoader={() => (
                  <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}>
                    <Typography color="text.secondary" fontSize={16}>Loading PDF...</Typography>
                  </Box>
                )}
              />
            </Box>
          </Worker>
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}>
            <Typography color="text.secondary" fontSize={16}>PDF not available.</Typography>
          </Box>
        )}
        <Box
          sx={{
            width: '100%', textAlign: 'center', py: 1,
            background: theme.palette.background.default,
            borderTop: `1px solid ${theme.palette.divider}`,
            fontSize: 13, color: theme.palette.text.secondary, letterSpacing: 0.2,
          }}
        >
          <b>Note:</b> {note}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPDFViewer;