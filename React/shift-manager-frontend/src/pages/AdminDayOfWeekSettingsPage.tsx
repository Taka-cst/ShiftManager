import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
} from '@mui/material';
import { adminAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { DayOfWeekSettings } from '../types';

const DAYS_OF_WEEK = [
  { key: 'monday', label: '月曜日' },
  { key: 'tuesday', label: '火曜日' },
  { key: 'wednesday', label: '水曜日' },
  { key: 'thursday', label: '木曜日' },
  { key: 'friday', label: '金曜日' },
  { key: 'saturday', label: '土曜日' },
  { key: 'sunday', label: '日曜日' },
] as const;

const AdminDayOfWeekSettingsPage: React.FC = () => {
  const { showError } = useError();
  const [settings, setSettings] = useState<DayOfWeekSettings>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await adminAPI.getDayOfWeekSettings();
      setSettings(data);
    } catch (error) {
      showError('曜日設定の取得に失敗しちゃった〜😭');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (day: keyof DayOfWeekSettings) => {
    setSettings(prev => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage('');
    
    try {
      await adminAPI.updateDayOfWeekSettings(settings);
      setSuccessMessage('設定を保存したよ〜！✨');
      setTimeout(() => setSuccessMessage(''), 3000); // 3秒後に消す
    } catch (error: any) {
      if (error.response?.data?.detail) {
        showError(error.response.data.detail);
      } else {
        showError('設定の保存に失敗しちゃった💦');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Typography>読み込み中だよ〜⏰</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          授業曜日設定
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          授業がある曜日を選択してね〜！選択した曜日だけシフト管理の対象になるよ💡
        </Typography>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            授業がある曜日を選択
          </Typography>
          
          <FormGroup>
            {DAYS_OF_WEEK.map((day) => (
              <FormControlLabel
                key={day.key}
                control={
                  <Checkbox
                    checked={settings[day.key]}
                    onChange={() => handleChange(day.key)}
                    color="primary"
                  />
                }
                label={day.label}
                sx={{ mb: 1 }}
              />
            ))}
          </FormGroup>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSave}
              disabled={saving}
              sx={{ minWidth: 200 }}
            >
              {saving ? '保存中...⏰' : '設定を保存する✨'}
            </Button>
          </Box>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              💡 ヒント: この設定は全体のシフト管理に影響するよ〜<br/>
              選択しなかった曜日はシフト希望の対象外になるから注意してね！
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminDayOfWeekSettingsPage;