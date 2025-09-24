//// filepath: c:\Users\CLienT\Desktop\Koronadal City Library System\kcls-app\src\components\DocumentPDFViewer.jsx
import React, { useRef, useState, useEffect, useRef as rRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
  useTheme, Button, Tooltip, Divider, TextField
} from '@mui/material';
import {
  Close, Visibility, NavigateBefore, NavigateNext, FirstPage, LastPage,
  Fullscreen, FullscreenExit
} from '@mui/icons-material';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';
import { logAudit } from '../utils/auditLogger.js'; // NEW

// If not installed yet:
// npm i @react-pdf-viewer/page-navigation

const workerUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const DocumentPDFViewer = ({
  open,
  onClose,
  fileUrl,
  documentId,            // NEW: pass the Document_ID
  title = 'Viewing PDF Document',
  note = 'Downloading and printing are disabled for this preview.'
}) => {
  const theme = useTheme();
  const [fullDialog, setFullDialog] = useState(false);      // MUI fullScreen toggle
  const [pageInput, setPageInput] = useState('');
  const containerRef = useRef(null);

  // Page navigation plugin
  const pageNavPluginInstance = pageNavigationPlugin();
  const {
    GoToNextPage,
    GoToPreviousPage,
    GoToFirstPage,
    GoToLastPage,
    CurrentPageLabel,
    NumberOfPages,
    jumpToPage
  } = pageNavPluginInstance;

  const navBtnSx = {
    minWidth: 36,
    height: 34,
    borderRadius: 1,
    fontSize: 11,
    fontWeight: 700,
    px: 0.5,
    lineHeight: 1,
    border: `1px solid ${theme.palette.divider}`,
    color: 'text.primary'
  };

  const handleToggleFullscreen = () => {
    setFullDialog(prev => !prev);
    // optional native fullscreen request for the inner container
    setTimeout(() => {
      if (!document.fullscreenElement && containerRef.current) {
        containerRef.current.requestFullscreen?.().catch(() => {});
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }, 60);
  };

  const submitPageJump = (pages) => {
    const total = pages;
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && n <= total) {
      jumpToPage(n - 1);
    }
  };

  const loggedRef = useRef(false); // prevent duplicate logs per open cycle

  useEffect(() => {
    if (open && fileUrl && documentId && !loggedRef.current) {
      logAudit('DOC_VIEW', 'Document', documentId, { title });
      loggedRef.current = true;
    }
    if (!open) {
      loggedRef.current = false;
    }
  }, [open, fileUrl, documentId, title]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullDialog}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: fullDialog ? '100%' : { xs: '92vh', md: '88vh' },
          bgcolor: theme.palette.background.paper,
          borderRadius: fullDialog ? 0 : 1,
          border: fullDialog ? 0 : `2px solid ${theme.palette.divider}`,
          boxShadow: fullDialog ? 'none' : '0 8px 28px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            bgcolor: theme.palette.background.default,
            borderBottom: `2px solid ${theme.palette.divider}`,
            minHeight: 56,
            borderTopLeftRadius: fullDialog ? 0 : 1,
            borderTopRightRadius: fullDialog ? 0 : 1
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Visibility color="primary" sx={{ fontSize: 28 }} />
          <Typography fontWeight={800} fontSize={16} letterSpacing={0.5}>
            {title}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={fullDialog ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
            <IconButton
              size="small"
              onClick={handleToggleFullscreen}
              sx={{
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': { bgcolor: theme.palette.action.hover }
              }}
            >
              {fullDialog ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              '&:hover': {
                bgcolor: theme.palette.error.light,
                borderColor: theme.palette.error.main,
                color: theme.palette.error.contrastText
              }
            }}
            aria-label="Close PDF"
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          bgcolor: theme.palette.background.paper,
          borderBottom: `2px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          Navigation
        </Typography>
        <Divider flexItem orientation="vertical" />
        <Tooltip title="First page">
          <span>
            <GoToFirstPage>
              {(props) => (
                <Button onClick={props.onClick} disabled={props.isDisabled} variant="outlined" size="small" sx={navBtnSx}>
                  <FirstPage fontSize="small" />
                </Button>
              )}
            </GoToFirstPage>
          </span>
        </Tooltip>
        <Tooltip title="Previous page">
          <span>
            <GoToPreviousPage>
              {(props) => (
                <Button onClick={props.onClick} disabled={props.isDisabled} variant="outlined" size="small" sx={navBtnSx}>
                  <NavigateBefore fontSize="small" />
                </Button>
              )}
            </GoToPreviousPage>
          </span>
        </Tooltip>

        <NumberOfPages>
          {(pagesProps) => (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1,
                  py: 0.5,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  bgcolor: theme.palette.background.default,
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                <CurrentPageLabel>
                  {(cp) => <span>Page {cp.currentPage + 1}</span>}
                </CurrentPageLabel>
                <Typography component="span" fontSize={12}>/</Typography>
                <span>{pagesProps.numberOfPages}</span>
              </Box>

              {/* Page jump input */}
              <TextField
                size="small"
                placeholder="Go to"
                type="number"
                inputProps={{ min: 1, max: pagesProps.numberOfPages, style: { padding: '6px 8px', fontSize: 12, width: 70 } }}
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    submitPageJump(pagesProps.numberOfPages);
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    height: 34
                  }
                }}
              />
              <Button
                size="small"
                variant="contained"
                sx={{ ...navBtnSx, minWidth: 52 }}
                onClick={() => submitPageJump(pagesProps.numberOfPages)}
              >
                Go
              </Button>
            </>
          )}
        </NumberOfPages>

        <Tooltip title="Next page">
          <span>
            <GoToNextPage>
              {(props) => (
                <Button onClick={props.onClick} disabled={props.isDisabled} variant="outlined" size="small" sx={navBtnSx}>
                  <NavigateNext fontSize="small" />
                </Button>
              )}
            </GoToNextPage>
          </span>
        </Tooltip>
        <Tooltip title="Last page">
          <span>
            <GoToLastPage>
              {(props) => (
                <Button onClick={props.onClick} disabled={props.isDisabled} variant="outlined" size="small" sx={navBtnSx}>
                  <LastPage fontSize="small" />
                </Button>
              )}
            </GoToLastPage>
          </span>
        </Tooltip>

        <Box flexGrow={1} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Preview only
        </Typography>
      </Box>

      <DialogContent
        sx={{
          p: 0,
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: theme.palette.background.default,
          overflow: 'hidden'
        }}
      >
        <Box
          ref={containerRef}
          sx={{
            flexGrow: 1,
            m: 1,
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            position: 'relative'
          }}
        >
          {fileUrl ? (
            <Worker workerUrl={workerUrl}>
              <Viewer
                fileUrl={fileUrl}
                renderToolbar={() => null}
                plugins={[pageNavPluginInstance]}
                defaultScale={1.1}
              />
            </Worker>
          ) : (
            <Box sx={{ width: '100%', textAlign: 'center', mt: 6 }}>
              <Typography color="text.secondary" fontSize={14}>
                PDF not available.
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderTop: `2px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            fontSize: 12,
            textAlign: 'center',
            letterSpacing: 0.3
          }}
        >
          <b>Note:</b> {note}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPDFViewer;