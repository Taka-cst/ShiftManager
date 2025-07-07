import React from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const {isAuthenticated} = useAuth();
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper elevation={3} sx={{ p: 5, width: '100%', textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            公文式<br />シフト管理システム
          </Typography>
          <Typography variant="h6" color="textSecondary" paragraph>
            公文式教室のための、<br />
            シフト管理ツールです。
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{ mr: 2 }}
            >
              はじめる
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login')}
            >
              ログイン
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LandingPage;