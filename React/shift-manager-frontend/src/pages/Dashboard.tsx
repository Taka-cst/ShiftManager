import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Schedule, CalendarToday, Assignment } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'シフト希望を提出',
      description: '新しいシフト希望を登録します',
      icon: <Schedule fontSize="large" />,
      action: () => navigate('/shift-requests/new'),
      color: 'primary.main',
    },
    {
      title: 'シフト希望を確認',
      description: '提出済みのシフト希望を確認・編集します',
      icon: <Assignment fontSize="large" />,
      action: () => navigate('/shift-requests'),
      color: 'secondary.main',
    },
    {
      title: '確定シフトを見る',
      description: '確定したシフトを確認します',
      icon: <CalendarToday fontSize="large" />,
      action: () => navigate('/confirmed-shifts'),
      color: 'success.main',
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ようこそ、{user?.DisplayName}さん！
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          シフト管理システムへようこそ。下記のメニューから操作を選択してください。
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {menuItems.map((item, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.2s',
              }}
              onClick={item.action}
            >
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <Box sx={{ color: item.color, mb: 2 }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  {item.title}
                </Typography>
                <Typography color="textSecondary" paragraph>
                  {item.description}
                </Typography>
                <Button variant="outlined" size="small">
                  選択
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {user?.admin && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            管理者メニュー
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => navigate('/admin')}
            sx={{ mt: 2 }}
          >
            管理者ダッシュボードへ
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
