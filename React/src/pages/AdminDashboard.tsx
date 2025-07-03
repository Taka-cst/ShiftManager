import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CardActions,
} from '@mui/material';
import { People, Assignment, CalendarToday, Settings } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const adminMenuItems = [
    {
      title: 'ユーザー管理',
      description: 'ユーザーの一覧・削除を管理するよ〜',
      icon: <People fontSize="large" />,
      action: () => navigate('/admin/users'),
      color: 'primary.main',
    },
    {
      title: 'シフト希望一覧',
      description: '全ユーザーのシフト希望を確認して確定するよ〜',
      icon: <Assignment fontSize="large" />,
      action: () => navigate('/admin/shift-requests'),
      color: 'secondary.main',
    },
    {
      title: '確定シフト管理',
      description: 'シフトの確定・編集・削除を行うよ〜',
      icon: <CalendarToday fontSize="large" />,
      action: () => navigate('/admin/confirmed-shifts'),
      color: 'success.main',
    },
    {
      title: '授業曜日設定',
      description: '授業がある曜日を設定するよ〜',
      icon: <Settings fontSize="large" />,
      action: () => navigate('/admin/settings'),
      color: 'warning.main',
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          管理者ダッシュボード
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          管理者機能を使用して、シフト管理を行ってちょうだい♪
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {adminMenuItems.map((item, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ color: item.color, mb: 2 }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  {item.title}
                </Typography>
                <Typography color="textSecondary" paragraph>
                  {item.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={item.action}
                  sx={{ 
                    minWidth: 120,
                    backgroundColor: item.color,
                    '&:hover': {
                      backgroundColor: item.color,
                      filter: 'brightness(0.9)',
                    }
                  }}
                >
                  開く
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          管理者メニューの使い方
        </Typography>
        <Typography variant="body2" color="textSecondary">
          💡 <strong>シフト希望一覧</strong>: ユーザーが提出したシフト希望を確認して、確定シフトを作成できるよ〜<br/>
          👥 <strong>ユーザー管理</strong>: 登録されているユーザーの一覧表示・削除ができるよ〜<br/>
          📅 <strong>確定シフト管理</strong>: 作成済みの確定シフトの確認・編集・削除ができるよ〜<br/>
          ⚙️ <strong>授業曜日設定</strong>: どの曜日に授業があるかを設定できるよ〜
        </Typography>
      </Box>
    </Container>
  );
};

export default AdminDashboard;