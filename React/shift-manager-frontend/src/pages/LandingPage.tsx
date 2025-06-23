import React from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { Schedule, People, Security } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Schedule fontSize="large" />,
      title: 'シフト希望管理',
      description: 'かんたんにシフト希望を提出・編集できます',
    },
    {
      icon: <People fontSize="large" />,
      title: 'チーム管理',
      description: '全メンバーのシフトを一目で確認',
    },
    {
      icon: <Security fontSize="large" />,
      title: '管理者機能',
      description: 'シフト確定や設定変更が簡単に',
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          シフト管理システム
        </Typography>
        <Typography variant="h5" component="h2" color="textSecondary" paragraph>
          授業シフトを効率的に管理しよう
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
      </Box>

      <Grid container spacing={4} sx={{ py: 8 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card sx={{ textAlign: 'center', height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography color="textSecondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default LandingPage;
