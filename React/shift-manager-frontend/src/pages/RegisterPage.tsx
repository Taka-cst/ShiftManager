import React from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useError } from '../contexts/ErrorContext';
import { authAPI } from '../services/api';
import { RegisterFormData } from '../types';

const RegisterPage: React.FC = () => {
  const { showError } = useError();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await authAPI.register({
        username: data.username,
        DisplayName: data.DisplayName,
        password: data.password,
        admin_code: data.admin_code || undefined,
      });
      navigate('/login', {
        state: { message: '登録が完了しました。ログインしてください。' }
      });
    } catch (error: any) {
      if (error.response?.data?.detail) {
        showError(error.response.data.detail);
      } else {
        showError('登録に失敗しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            新規ユーザー登録
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
            <TextField
              {...register('username', {
                required: 'ユーザー名を入力してください',
                minLength: {
                  value: 2,
                  message: 'ユーザー名は2文字以上で入力してください',
                },
              })}
              fullWidth
              label="ユーザー名"
              margin="normal"
              autoComplete="username"
              autoFocus
              error={!!errors.username}
              helperText={errors.username?.message}
            />

            <TextField
              {...register('DisplayName', {
                required: '表示名を入力してください',
                minLength: {
                  value: 1,
                  message: '表示名を入力してください',
                },
              })}
              fullWidth
              label="表示名"
              margin="normal"
              error={!!errors.DisplayName}
              helperText={errors.DisplayName?.message}
            />

            <TextField
              {...register('password', {
                required: 'パスワードを入力してください',
                minLength: {
                  value: 6,
                  message: 'パスワードは6文字以上で入力してください',
                },
              })}
              fullWidth
              label="パスワード"
              type="password"
              margin="normal"
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message}
            />

            <TextField
              {...register('admin_code')}
              fullWidth
              label="管理者コード（任意）"
              margin="normal"
              helperText="管理者権限が必要な場合のみ入力してください"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? '登録中...' : '登録する'}
            </Button>

            <Box textAlign="center">
              <Link component={RouterLink} to="/login" variant="body2">
                すでにアカウントをお持ちの方はログイン
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;
