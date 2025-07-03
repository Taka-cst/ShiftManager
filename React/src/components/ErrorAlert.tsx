import React from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useError } from '../contexts/ErrorContext';

const ErrorAlert: React.FC = () => {
  const { error, clearError } = useError();

  const handleClose = () => {
    clearError();
  };

  return (
    <Snackbar
      open={!!error}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
        {error}
      </Alert>
    </Snackbar>
  );
};

export default ErrorAlert;
