import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Box, Select, InputLabel, FormControl, useTheme
} from '@mui/material';

const staffPositions = ['Librarian', 'Admin'];
const borrowerTypes = ['Researcher', 'Government Agency'];
const accountStatuses = ['Pending', 'Registered', 'Suspended'];

const defaultDetails = {
  firstname: '', middlename: '', lastname: '', email: '', contactnumber: '',
  street: '', barangay: '', city: '', province: '', dateofbirth: ''
};

const defaultStaff = { position: '' };
const defaultBorrower = { type: '', department: '', accountstatus: 'Pending' };

const UsersFormModal = ({
  open,
  onClose,
  onSave,
  isEdit = false,
  userData = null
}) => {
  const theme = useTheme();
  const [role, setRole] = useState('Staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [details, setDetails] = useState(defaultDetails);
  const [staff, setStaff] = useState(defaultStaff);
  const [borrower, setBorrower] = useState(defaultBorrower);

  useEffect(() => {
    if (isEdit && userData) {
      setRole(userData.Role || 'Staff');
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
        dateofbirth: userData.DateOfBirth ? userData.DateOfBirth.slice(0, 10) : ''
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
              accountstatus: userData.borrower?.AccountStatus || 'Pending'
            }
          : defaultBorrower
      );
    } else {
      setRole('Staff');
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          fontWeight: 700,
          letterSpacing: 1
        }}
      >
        {isEdit ? 'Edit User' : 'Add User'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent
          dividers
          sx={{ background: theme.palette.background.default }}
        >
          <Grid container spacing={2}>
            {/* 1. User (Account) Section */}
            <Grid item xs={12}>
              <Box fontWeight={700} color={theme.palette.primary.main} mb={1}>
                User Account
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                fullWidth
                required
                disabled={isEdit}
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                fullWidth
                required={!isEdit}
                placeholder={isEdit ? "Leave blank to keep current" : ""}
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ background: theme.palette.background.paper }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={role}
                  label="Role"
                  onChange={e => setRole(e.target.value)}
                  disabled={isEdit}
                >
                  <MenuItem value="Staff">Staff</MenuItem>
                  <MenuItem value="Borrower">Borrower</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 2. UserDetails Section */}
            <Grid item xs={12} mt={2}>
              <Box fontWeight={700} color={theme.palette.primary.main} mb={1}>
                Personal Details
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="First Name"
                name="firstname"
                value={details.firstname}
                onChange={handleDetailsChange}
                fullWidth
                required
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Middle Name"
                name="middlename"
                value={details.middlename}
                onChange={handleDetailsChange}
                fullWidth
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Last Name"
                name="lastname"
                value={details.lastname}
                onChange={handleDetailsChange}
                fullWidth
                required
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                name="email"
                value={details.email}
                onChange={handleDetailsChange}
                fullWidth
                required
                type="email"
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Number"
                name="contactnumber"
                value={details.contactnumber}
                onChange={handleDetailsChange}
                fullWidth
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Street"
                name="street"
                value={details.street}
                onChange={handleDetailsChange}
                fullWidth
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Barangay"
                name="barangay"
                value={details.barangay}
                onChange={handleDetailsChange}
                fullWidth
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="City"
                name="city"
                value={details.city}
                onChange={handleDetailsChange}
                fullWidth
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Province"
                name="province"
                value={details.province}
                onChange={handleDetailsChange}
                fullWidth
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date of Birth"
                name="dateofbirth"
                type="date"
                value={details.dateofbirth}
                onChange={handleDetailsChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ background: theme.palette.background.paper }}
              />
            </Grid>

            {/* 3. Staff or Borrower Section */}
            {role === 'Staff' && (
              <>
                <Grid item xs={12} mt={2}>
                  <Box fontWeight={700} color={theme.palette.primary.main} mb={1}>
                    Staff Details
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth sx={{ background: theme.palette.background.paper }}>
                    <InputLabel>Position</InputLabel>
                    <Select
                      name="position"
                      value={staff.position}
                      label="Position"
                      onChange={handleStaffChange}
                      required
                    >
                      {staffPositions.map(pos => (
                        <MenuItem key={pos} value={pos}>{pos}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            {role === 'Borrower' && (
              <>
                <Grid item xs={12} mt={2}>
                  <Box fontWeight={700} color={theme.palette.primary.main} mb={1}>
                    Borrower Details
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth sx={{ background: theme.palette.background.paper }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="type"
                      value={borrower.type}
                      label="Type"
                      onChange={handleBorrowerChange}
                      required
                    >
                      {borrowerTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Department"
                    name="department"
                    value={borrower.department || ''}
                    onChange={handleBorrowerChange}
                    fullWidth
                    sx={{ background: theme.palette.background.paper }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth sx={{ background: theme.palette.background.paper }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="accountstatus"
                      value={borrower.accountstatus}
                      label="Status"
                      onChange={handleBorrowerChange}
                      required
                    >
                      {accountStatuses.map(status => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ bgcolor: theme.palette.background.paper }}>
          <Button onClick={onClose} color="secondary" variant="outlined">Cancel</Button>
          <Button type="submit" color="primary" variant="contained">{isEdit ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UsersFormModal;