import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { AccountCircle, ExitToApp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    handleClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    handleClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer' }}
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}>
          シフト管理システム
        </Typography>

        {isAuthenticated ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button color="inherit" onClick={() => navigate('/dashboard')}>
              ダッシュボード
            </Button>
            <Button color="inherit" onClick={() => navigate('/shift-requests')}>
              シフト希望
            </Button>
            <Button color="inherit" onClick={() => navigate('/confirmed-shifts')}>
              確定シフト
            </Button>
            {isAdmin && (
              <>
                <Button color="inherit" onClick={() => navigate('/admin/monthly-shifts')}>
                  月間シフト管理
                </Button>
                <Button color="inherit" onClick={() => navigate('/admin')}>
                  管理者メニュー
                </Button>
              </>
            )}
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <Typography variant="body2">
                  {user?.DisplayName} ({user?.admin ? '管理者' : '一般ユーザー'})
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} />
                ログアウト
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box>
            <Button color="inherit" onClick={() => navigate('/login')}>
              ログイン
            </Button>
            <Button color="inherit" onClick={() => navigate('/register')}>
              新規登録
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
