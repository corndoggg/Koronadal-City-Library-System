import React, { useEffect, useMemo, useState } from 'react';
import {
	Box,
	Paper,
	Typography,
	TextField,
	Button,
	Stack,
	Alert,
	CircularProgress,
	Divider
} from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const ForgotPasswordPage = () => {
	const [step, setStep] = useState('request'); // request | verify | success
	const [email, setEmail] = useState('');
	const [emailError, setEmailError] = useState('');
	const [code, setCode] = useState('');
	const [password, setPassword] = useState('');
	const [password2, setPassword2] = useState('');
	const [loading, setLoading] = useState(false);
	const [apiError, setApiError] = useState('');
	const [infoMessage, setInfoMessage] = useState('');
	const [lastSentAt, setLastSentAt] = useState(null);
	const [successDetails, setSuccessDetails] = useState(null);
	const [now, setNow] = useState(() => dayjs());

	const canResendAt = useMemo(() => {
		if (!lastSentAt) return dayjs();
		return dayjs(lastSentAt).add(60, 'second');
	}, [lastSentAt]);

	const resendCooldown = useMemo(() => {
		if (!lastSentAt) return 0;
		const diff = canResendAt.diff(now, 'second');
		return diff > 0 ? diff : 0;
	}, [canResendAt, lastSentAt, now]);

	useEffect(() => {
		if (!lastSentAt || step !== 'verify') return undefined;
		setNow(dayjs());
		const interval = setInterval(() => setNow(dayjs()), 1000);
		return () => clearInterval(interval);
	}, [lastSentAt, step]);

	useEffect(() => {
		if (infoMessage) {
			const timer = setTimeout(() => setInfoMessage(''), 5000);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [infoMessage]);

	const validateEmail = value => {
		if (!value) return 'Email is required';
		const pattern = /[^@\s]+@[^@\s]+\.[^@\s]+/;
		if (!pattern.test(value)) return 'Enter a valid email address';
		return '';
	};

	const handleRequestCode = async event => {
		event.preventDefault();
		setApiError('');
		const err = validateEmail(email.trim());
		if (err) {
			setEmailError(err);
			return;
		}
		setEmailError('');
		setLoading(true);
		try {
			await axios.post(`${API_BASE}/auth/password/forgot`, { email: email.trim() });
			setInfoMessage('If an account exists, a verification code has been emailed.');
			setLastSentAt(dayjs());
			setStep('verify');
			setCode('');
			setPassword('');
			setPassword2('');
		} catch (error) {
			const message = error?.response?.data?.error || 'Could not send reset code.';
			setApiError(message === 'email_required' ? 'Email is required.' : message);
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		if (loading || resendCooldown > 0) return;
		setApiError('');
		setLoading(true);
		try {
			await axios.post(`${API_BASE}/auth/password/forgot`, { email: email.trim() });
			setInfoMessage('A new code has been sent (if the account exists).');
			setLastSentAt(dayjs());
		} catch (error) {
			const message = error?.response?.data?.error || 'Unable to resend code right now.';
			setApiError(message);
		} finally {
			setLoading(false);
		}
	};

	const validatePasswords = () => {
		if (!code.trim()) return 'Enter the code sent to your email';
		if (password.length < 6) return 'Password must be at least 6 characters';
		if (password !== password2) return 'Passwords do not match';
		return '';
	};

	const handleResetPassword = async event => {
		event.preventDefault();
		setApiError('');
		const pwdError = validatePasswords();
		if (pwdError) {
			setApiError(pwdError);
			return;
		}
		setLoading(true);
		try {
			const response = await axios.post(`${API_BASE}/auth/password/reset`, {
				email: email.trim(),
				code: code.trim(),
				password: password
			});
			setSuccessDetails({ message: response?.data?.message || 'Password reset successful.' });
			setStep('success');
		} catch (error) {
			const serverError = error?.response?.data;
			const errMsg = typeof serverError === 'string'
				? serverError
				: serverError?.error || 'Unable to reset password. Please try again.';
			setApiError(errMsg);
		} finally {
			setLoading(false);
		}
	};

	const renderRequestForm = () => (
		<form onSubmit={handleRequestCode}>
			<Stack spacing={2}>
				<Typography variant="body1" color="text.secondary">
					Enter the email associated with your account. We will send a verification code that lets you reset your password.
				</Typography>
				<TextField
					label="Email address"
					type="email"
					value={email}
					onChange={event => setEmail(event.target.value)}
					error={Boolean(emailError)}
					helperText={emailError || 'You will receive a verification code if the email exists.'}
					fullWidth
					required
				/>
				{apiError && <Alert severity="error">{apiError}</Alert>}
				{infoMessage && <Alert severity="info">{infoMessage}</Alert>}
				<Button
					type="submit"
					variant="contained"
					size="large"
					disabled={loading}
				>
					{loading ? <CircularProgress color="inherit" size={20} /> : 'Send verification code'}
				</Button>
			</Stack>
		</form>
	);

	const renderVerifyForm = () => (
		<form onSubmit={handleResetPassword}>
			<Stack spacing={2}>
				<Alert severity="info">
					Enter the verification code we sent to <strong>{email}</strong>. Codes expire after 30 minutes.
				</Alert>
				<TextField
					label="Verification code"
					value={code}
					onChange={event => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
					inputProps={{ inputMode: 'numeric' }}
					fullWidth
					required
				/>
				<Divider />
				<TextField
					label="New password"
					type="password"
					value={password}
					onChange={event => setPassword(event.target.value)}
					fullWidth
					required
				/>
				<TextField
					label="Confirm new password"
					type="password"
					value={password2}
					onChange={event => setPassword2(event.target.value)}
					fullWidth
					required
				/>
				{apiError && <Alert severity="error">{apiError}</Alert>}
				{infoMessage && <Alert severity="info">{infoMessage}</Alert>}
				<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
					<Button
						onClick={handleResend}
						type="button"
						variant="outlined"
						disabled={loading || resendCooldown > 0}
					>
						{resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
					</Button>
					<Box flexGrow={1} />
					<Button
						type="submit"
						variant="contained"
						size="large"
						disabled={loading}
					>
						{loading ? <CircularProgress color="inherit" size={20} /> : 'Reset password'}
					</Button>
				</Stack>
			</Stack>
		</form>
	);

	const renderSuccess = () => (
		<Stack spacing={2} alignItems="center" textAlign="center">
			<Alert severity="success" sx={{ width: '100%' }}>
				{successDetails?.message || 'Your password has been updated successfully.'}
			</Alert>
			<Typography variant="body1">
				You can now log in with your new password.
			</Typography>
			<Button href="/login" variant="contained" size="large">
				Back to login
			</Button>
		</Stack>
	);

	return (
		<Box
			sx={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				bgcolor: theme => theme.palette.background.default,
				px: 2
			}}
		>
			<Paper
				elevation={3}
				sx={{
					width: '100%',
					maxWidth: 460,
					p: { xs: 3, sm: 4 },
					borderRadius: 3,
					border: theme => `1px solid ${theme.palette.divider}`,
					boxShadow: theme => `0 24px 48px ${theme.palette.primary.main}1a`
				}}
			>
				<Stack spacing={3}>
					<Box>
						<Typography variant="h5" fontWeight={800} gutterBottom>
							Forgot password
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{step === 'request' && 'We will send a verification code to your email so you can create a new password.'}
							{step === 'verify' && 'Enter the code you received and choose a new password to secure your account.'}
							{step === 'success' && 'Password reset complete.'}
						</Typography>
					</Box>
					{step === 'request' && renderRequestForm()}
					{step === 'verify' && renderVerifyForm()}
					{step === 'success' && renderSuccess()}
				</Stack>
			</Paper>
		</Box>
	);
};

export default ForgotPasswordPage;
