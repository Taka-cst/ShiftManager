import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CardActions,
  CircularProgress,
  Chip,
} from '@mui/material';
import { People, Assignment, CalendarToday, Settings, DateRange, TrendingUp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { adminAPI, confirmedShiftAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { User, ShiftRequest, ConfirmedShift } from '../types';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useError();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalShiftRequests: 0,
    confirmedShifts: 0,
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const [usersData, shiftRequestsData, confirmedShiftsData] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getAllShiftRequests(),
        confirmedShiftAPI.getAllConfirmedShifts()
      ]);

      // 管理者以外のユーザー数をカウント
      const nonAdminUsers = usersData.filter(user => !user.admin);

      setStats({
        totalUsers: nonAdminUsers.length,
        totalShiftRequests: shiftRequestsData.length,
        confirmedShifts: confirmedShiftsData.length,
      });
    } catch (error) {
      showError('統計情報の取得に失敗しました😭');
    } finally {
      setLoading(false);
    }
  };

  const adminMenuItems = [
    {
      title: 'ユーザー管理',
      description: 'ユーザーの一覧や削除を管理します。',
      icon: <People fontSize="large" />,
      action: () => navigate('/admin/users'),
      color: 'primary.main',
    },
    {
      title: 'シフト希望一覧',
      description: '全ユーザーのシフト希望を確認し、確定できます。',
      icon: <Assignment fontSize="large" />,
      action: () => navigate('/admin/shift-requests'),
      color: 'secondary.main',
    },
    {
      title: '月間シフト管理',
      description: '表形式で授業日のシフトを管理します。',
      icon: <DateRange fontSize="large" />,
      action: () => navigate('/admin/monthly-shifts'),
      color: 'info.main',
    },
    {
      title: '確定シフト管理',
      description: 'シフトの確定・編集・削除を行います。',
      icon: <CalendarToday fontSize="large" />,
      action: () => navigate('/admin/confirmed-shifts'),
      color: 'success.main',
    },
    {
      title: '授業曜日設定',
      description: '授業がある曜日を設定します。',
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
          管理者機能を利用してシフト管理を行ってください。
        </Typography>
      </Box>

      {/* 統計情報カード */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
          システム統計
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h3" component="div">
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="body2">
                    登録ユーザー数
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ textAlign: 'center', bgcolor: 'secondary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h3" component="div">
                    {stats.totalShiftRequests}
                  </Typography>
                  <Typography variant="body2">
                    シフト希望件数
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h3" component="div">
                    {stats.confirmedShifts}
                  </Typography>
                  <Typography variant="body2">
                    確定シフト件数
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* 管理機能メニュー */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          管理機能メニュー
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
          <strong>月間シフト管理</strong>: 表形式で授業日のシフトを直接編集できます。管理者は表示されません。<br/>
          <strong>シフト希望一覧</strong>: ユーザーが提出したシフト希望を確認し、確定シフトを作成できます。<br/>
          <strong>ユーザー管理</strong>: 登録されているユーザーの一覧表示や削除ができます。<br/>
          <strong>確定シフト管理</strong>: 作成済みの確定シフトの確認・編集・削除ができます。<br/>
          <strong>授業曜日設定</strong>: 授業がある曜日を設定できます。
        </Typography>
      </Box>
    </Container>
  );
};

export default AdminDashboard;