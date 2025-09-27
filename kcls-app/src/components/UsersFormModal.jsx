import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  Button, TextField, MenuItem, Grid, Box, useTheme
} from '@mui/material';
import { formatDate } from '../utils/date';

const staffPositions = ['Librarian', 'Admin'];
const borrowerTypes = ['Researcher', 'Government Agency'];
const accountStatuses = ['Pending', 'Registered', 'Suspended', 'Rejected'];

const defaultDetails = {
  firstname: '', middlename: '', lastname: '', email: '', contactnumber: '',
  street: '', barangay: '', city: '', province: '', dateofbirth: ''
};

const defaultStaff = { position: '' };
const defaultBorrower = { type: '', department: '', accountstatus: '' };

const UsersFormModal = ({
  open,
  onClose,
  onSave,
  isEdit = false,
  userData = null
}) => {
  const theme = useTheme();
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [details, setDetails] = useState(defaultDetails);
  const [staff, setStaff] = useState(defaultStaff);
  const [borrower, setBorrower] = useState(defaultBorrower);

  useEffect(() => {
    if (isEdit && userData) {
  setRole(userData.Role || '');
      setUsername(userData.Username || '');
      setPassword('');
      setDetails({
        firstname: userData.Firstname || '',
        middlename: userData.Middlename || '',
        lastname: userData.Lastname || '',
        email: userData.Email || '',
        contactnumber: userData.ContactNumber || '',
        street: userData.Street || '',
        barangay: userData.Barangay || '',
        city: userData.City || '',
        province: userData.Province || '',
        dateofbirth: userData.DateOfBirth ? formatDate(userData.DateOfBirth) : ''
      });
      // Ensure staff and borrower details are always filled on edit
      setStaff(
        userData.Role === 'Staff'
          ? { position: userData.staff?.Position || '' }
          : defaultStaff
      );
      setBorrower(
        userData.Role === 'Borrower'
          ? {
              type: userData.borrower?.Type || '',
              department: userData.borrower?.Department || '',
              accountstatus: userData.borrower?.AccountStatus || ''
            }
          : defaultBorrower
      );
    } else {
  setRole('');
      setUsername('');
      setPassword('');
      setDetails(defaultDetails);
      setStaff(defaultStaff);
      setBorrower(defaultBorrower);
    }
  }, [open, isEdit, userData]);

  const handleDetailsChange = e => {
    setDetails({ ...details, [e.target.name]: e.target.value });
  };

  const handleStaffChange = e => {
    setStaff({ ...staff, [e.target.name]: e.target.value });
  };

  const handleBorrowerChange = e => {
    setBorrower({ ...borrower, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const payload = {
      username,
      password: password || undefined,
      role,
      details,
      ...(role === 'Staff' ? { staff } : { borrower })
    };
    onSave(payload);
  };

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

  const renderEmptyValue = label => value => (
    value ? (
      value
    ) : (
      <Typography component="span" color="text.disabled" sx={{ fontStyle: 'italic' }}>
        {`Select ${label.toLowerCase()}`}
      </Typography>
    )
  );

  const isStaff = role === 'Staff';
  const isBorrower = role === 'Borrower';
  const staffIncomplete = isStaff && !staff.position;
  const borrowerIncomplete =
    isBorrower && (!borrower.type || !borrower.accountstatus);

  const submitDisabled =
    !username ||
    !role ||
    (!isEdit && (!password || password.length < 6)) ||
    staffIncomplete ||
    borrowerIncomplete;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 1,
          border: `2px solid ${theme.palette.divider}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle
        sx={{
          px: 2,
          py: 1.5,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: .5,
          bgcolor: theme.palette.background.default,
          borderBottom: `2px solid ${theme.palette.divider}`,
          borderTopLeftRadius: 1,
          borderTopRightRadius: 1
        }}
      >
        {isEdit ? 'Edit User' : 'Add User'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent
          dividers
          sx={{
            bgcolor: theme.palette.background.default,
            p: 2.25,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            '& .MuiTextField-root, & .MuiFormControl-root': {
              borderRadius: 1
            }
          }}
        >
          {/* Section: Account */}
          <Box
            sx={{
              p: 1.5,
              border: `1.5px solid ${theme.palette.divider}`,
              borderRadius: 1,
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography fontSize={14} fontWeight={800} letterSpacing={.5}>
                User Account
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Basic login credentials
              </Typography>
            </Box>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  fullWidth
                  required
                  size="small"
                  disabled={isEdit}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  fullWidth
                  required={!isEdit}
                  placeholder={isEdit ? "Leave blank to keep" : ""}
                  size="small"
                  helperText={!isEdit && password && password.length < 6 ? "Min 6 chars" : " "}
                  error={!isEdit && !!password && password.length < 6}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Role"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  fullWidth
                  size="medium"
                  disabled={isEdit}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ sx: { borderRadius: 1, minHeight: 54 } }}
                  SelectProps={{
                    MenuProps: baseSelectMenuProps,
                    displayEmpty: true,
                    renderValue: renderEmptyValue('Role')
                  }}
                  helperText={isEdit ? 'Role cannot be changed' : 'Pick the account role'}
                >
                  <MenuItem value="" disabled>Select a role</MenuItem>
                  <MenuItem value="Staff">Staff</MenuItem>
                  <MenuItem value="Borrower">Borrower</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>

          {/* Section: Personal */}
          <Box
            sx={{
              p: 1.5,
              border: `1.5px solid ${theme.palette.divider}`,
              borderRadius: 1,
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography fontSize={14} fontWeight={800} letterSpacing={.5}>
                Personal Details
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Identity & contact
              </Typography>
            </Box>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="First Name"
                  name="firstname"
                  value={details.firstname}
                  onChange={handleDetailsChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Middle Name"
                  name="middlename"
                  value={details.middlename}
                  onChange={handleDetailsChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Last Name"
                  name="lastname"
                  value={details.lastname}
                  onChange={handleDetailsChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={details.email}
                  onChange={handleDetailsChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Contact Number"
                  name="contactnumber"
                  value={details.contactnumber}
                  onChange={handleDetailsChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Date of Birth"
                  name="dateofbirth"
                  type="date"
                  value={details.dateofbirth}
                  onChange={handleDetailsChange}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Street"
                  name="street"
                  value={details.street}
                  onChange={handleDetailsChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Barangay"
                  name="barangay"
                  value={details.barangay}
                  onChange={handleDetailsChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="City"
                  name="city"
                  value={details.city}
                  onChange={handleDetailsChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Province"
                  name="province"
                  value={details.province}
                  onChange={handleDetailsChange}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Role-specific */}
          {role === 'Staff' && (
            <Box
              sx={{
                p: 1.5,
                border: `1.5px solid ${theme.palette.divider}`,
                borderRadius: 1,
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography fontSize={14} fontWeight={800}>Staff Details</Typography>
                <Typography variant="caption" color="text.secondary">
                  Position assignment
                </Typography>
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <TextField
                    select
                    label="Position"
                    name="position"
                    value={staff.position}
                    onChange={handleStaffChange}
                    fullWidth
                    size="medium"
                    required
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ sx: { borderRadius: 1, minHeight: 54 } }}
                    SelectProps={{
                      MenuProps: wideSelectMenuProps,
                      displayEmpty: true,
                      renderValue: renderEmptyValue('Position')
                    }}
                    helperText="Assign the staff member's primary role"
                  >
                    <MenuItem value="" disabled>Select a position</MenuItem>
                    {staffPositions.map(pos => (
                      <MenuItem key={pos} value={pos}>{pos}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          )}

          {role === 'Borrower' && (
            <Box
              sx={{
                p: 1.5,
                border: `1.5px solid ${theme.palette.divider}`,
                borderRadius: 1,
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography fontSize={14} fontWeight={800}>Borrower Details</Typography>
                <Typography variant="caption" color="text.secondary">
                  Classification & status
                </Typography>
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Type"
                    name="type"
                    value={borrower.type}
                    onChange={handleBorrowerChange}
                    fullWidth
                    size="medium"
                    required
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ sx: { borderRadius: 1, minHeight: 54 } }}
                    SelectProps={{
                      MenuProps: baseSelectMenuProps,
                      displayEmpty: true,
                      renderValue: renderEmptyValue('Type')
                    }}
                    helperText="Choose how this borrower will be categorized"
                  >
                    <MenuItem value="" disabled>Select a type</MenuItem>
                    {borrowerTypes.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Department"
                    name="department"
                    value={borrower.department || ''}
                    onChange={handleBorrowerChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Status"
                    name="accountstatus"
                    value={borrower.accountstatus}
                    onChange={handleBorrowerChange}
                    fullWidth
                    size="medium"
                    required
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ sx: { borderRadius: 1, minHeight: 54 } }}
                    SelectProps={{
                      MenuProps: baseSelectMenuProps,
                      displayEmpty: true,
                      renderValue: renderEmptyValue('Status')
                    }}
                    helperText="Select current registration status"
                  >
                    <MenuItem value="" disabled>Select a status</MenuItem>
                    {accountStatuses.map(status => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: theme.palette.background.default,
            borderTop: `2px solid ${theme.palette.divider}`,
            borderBottomLeftRadius: 1,
            borderBottomRightRadius: 1
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 1, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
              variant="contained"
              size="small"
              sx={{ borderRadius: 1, fontWeight: 700 }}
              disabled={submitDisabled}
          >
            {isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UsersFormModal;