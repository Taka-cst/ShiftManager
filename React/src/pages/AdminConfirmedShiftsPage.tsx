import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
} from '@mui/material';
import { Edit, Delete, Add, Visibility, Schedule, CheckCircle } from '@mui/icons-material';
import { LocalizationProvider, TimePicker, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useError } from '../contexts/ErrorContext';
import { confirmedShiftAPI, adminAPI, shiftRequestAPI } from '../services/api';
import { ConfirmedShift, ConfirmedShiftCreate, ShiftRequest } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminConfirmedShiftsPage: React.FC = () => {
  const [shifts, setShifts] = useState<ConfirmedShift[]>([]);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; shift: ConfirmedShift | null }>({
    open: false,
    shift: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; shift: ConfirmedShift | null }>({
    open: false,
    shift: null,
  });
  const [quickCreateDialog, setQuickCreateDialog] = useState<{ 
    open: boolean; 
    request: ShiftRequest | null;
    start_time: Date | null;
    end_time: Date | null;
  }>({
    open: false,
    request: null,
    start_time: null,
    end_time: null,
  });
  const [newShift, setNewShift] = useState({
    date: new Date(),
    start_time: new Date(),
    end_time: new Date(),
    user_id: '',
  });
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { showError } = useError();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shiftsData, requestsData] = await Promise.all([
        confirmedShiftAPI.getAllConfirmedShifts(),
        adminAPI.getAllShiftRequests()
      ]);
      setShifts(shiftsData);
      setShiftRequests(requestsData);
    } catch (error) {
      showError('データの読み込みに失敗しました😭');
    } finally {
      setLoading(false);
    }
  };

  // 確定シフトから除外済みのシフト希望を取得
  const getAvailableRequests = () => {
    return shiftRequests.filter(request => {
      // 勤務可能な希望のみ
      if (!request.canwork) return false;
      
      // 既に確定シフトが作成されていない希望のみ
      const hasConfirmedShift = shifts.some(shift => 
        isSameDay(new Date(shift.date), new Date(request.date)) && 
        shift.user_id === request.user_id
      );
      return !hasConfirmedShift;
    });
  };

  // 日付別にグループ化
  const getRequestsByDate = () => {
    const availableRequests = getAvailableRequests();
    const grouped: { [key: string]: ShiftRequest[] } = {};
    
    availableRequests.forEach(request => {
      const dateKey = format(new Date(request.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(request);
    });
    
    return grouped;
  };

  const handleQuickCreate = async () => {
    if (!quickCreateDialog.request || !quickCreateDialog.start_time || !quickCreateDialog.end_time) {
      showError('開始時間と終了時間を設定してください！');
      return;
    }

    try {
      const shiftData: ConfirmedShiftCreate = {
        date: quickCreateDialog.request.date,
        start_time: format(quickCreateDialog.start_time, 'HH:mm'),  // HH:mm形式
        end_time: format(quickCreateDialog.end_time, 'HH:mm'),      // HH:mm形式
        user_id: quickCreateDialog.request.user_id,
      };

      await adminAPI.createConfirmedShift(shiftData);
      setQuickCreateDialog({ open: false, request: null, start_time: null, end_time: null });
      loadData();
      showError('確定シフトを作成しました！✨');
    } catch (error: any) {
      if (error.response?.data?.detail) {
        // detailが配列やオブジェクトの場合も考慮
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // バリデーションエラーなど（Pydanticのerrors配列）
          showError(detail.map((d: any) => d.msg).join('\n'));
        } else if (typeof detail === 'object') {
          showError(JSON.stringify(detail));
        } else {
          showError(detail);
        }
        } else {
            showError('シフト希望の登録に失敗しました😭');
        }
    }
  };

  const handleCreate = async () => {
    try {
      const shiftData: ConfirmedShiftCreate = {
        date: format(newShift.date, 'yyyy-MM-dd'),
        start_time: format(newShift.start_time, 'HH:mm'),  // HH:mm形式
        end_time: format(newShift.end_time, 'HH:mm'),      // HH:mm形式
        user_id: parseInt(newShift.user_id),
      };

      await adminAPI.createConfirmedShift(shiftData);
      setCreateDialog(false);
      loadData();
      showError('確定シフトを作成しました！✨');
    } catch (error: any) {
      if (error.response?.data?.detail) {
        showError(error.response.data.detail);
      } else {
        showError('確定シフトの作成に失敗しました😭');
      }
    }
  };

  const handleEdit = async () => {
    if (!editDialog.shift) return;

    try {
      const shiftData = {
        date: format(new Date(editDialog.shift.date), 'yyyy-MM-dd'),
        start_time: editDialog.shift.start_time,
        end_time: editDialog.shift.end_time,
        user_id: editDialog.shift.user_id,
      };

      await adminAPI.updateConfirmedShift(editDialog.shift.id, shiftData);
      setEditDialog({ open: false, shift: null });
      loadData();
      showError('確定シフトを更新しました！✨');
    } catch (error: any) {
      if (error.response?.data?.detail) {
        showError(error.response.data.detail);
      } else {
        showError('確定シフトの更新に失敗しました😭');
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.shift) return;

    try {
      await adminAPI.deleteConfirmedShift(deleteDialog.shift.id);
      setDeleteDialog({ open: false, shift: null });
      loadData();
      showError('確定シフトを削除しました！');
    } catch (error: any) {
      if (error.response?.data?.detail) {
        showError(error.response.data.detail);
      } else {
        showError('確定シフトの削除に失敗しました😭');
      }
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

  const requestsByDate = getRequestsByDate();
  const availableRequests = getAvailableRequests();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Container maxWidth="xl">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            確定シフト管理
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab 
                label={
                  <Badge badgeContent={availableRequests.length} color="primary">
                    シフト希望から作成
                  </Badge>
                } 
                icon={<Schedule />} 
              />
              <Tab label="確定シフト一覧" icon={<CheckCircle />} />
            </Tabs>
          </Box>

          {/* シフト希望から作成タブ */}
          <TabPanel value={tabValue} index={0}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                未確定のシフト希望 ({availableRequests.length}件)
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setCreateDialog(true)}
              >
                手動で新規作成
              </Button>
            </Box>

            {availableRequests.length === 0 ? (
              <Alert severity="info">
                確定待ちのシフト希望がありません！全て確定済みです👏
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {Object.entries(requestsByDate).map(([date, requests]) => (
                  <Grid item xs={12} md={6} lg={4} key={date}>
                    <Card elevation={2}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          {format(new Date(date), 'M月d日(E)', { locale: ja })}
                        </Typography>
                        <List dense>
                          {requests.map((request) => (
                            <ListItem key={request.id} divider>
                              <ListItemText
                                primary={
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Chip
                                      label={request.user_display_name || `ユーザー${request.user_id}`}
                                      size="small"
                                      color="primary"
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Box>
                                    <Typography variant="body2" color="textSecondary">
                                      希望時間: {request.start_time} - {request.end_time}
                                    </Typography>
                                    {request.description && (
                                      <Typography variant="body2" color="textSecondary">
                                        コメント: {request.description}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                              <ListItemSecondaryAction>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<CheckCircle />}
                                  onClick={() => {
                                    const startTime = new Date();
                                    const endTime = new Date();
                                    
                                    if (request.start_time && request.end_time) {
                                      const [startHour, startMin] = request.start_time.split(':');
                                      const [endHour, endMin] = request.end_time.split(':');
                                      
                                      startTime.setHours(parseInt(startHour), parseInt(startMin), 0);
                                      endTime.setHours(parseInt(endHour), parseInt(endMin), 0);
                                    }
                                    
                                    setQuickCreateDialog({
                                      open: true,
                                      request,
                                      start_time: startTime,
                                      end_time: endTime,
                                    });
                                  }}
                                >
                                  確定
                                </Button>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          {/* 確定シフト一覧タブ */}
          <TabPanel value={tabValue} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                確定済みシフト ({shifts.length}件)
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialog(true)}
              >
                新規作成
              </Button>
            </Box>

            {shifts.length === 0 ? (
              <Alert severity="info">
                確定シフトがありません。シフト希望から確定するか、新規作成ボタンから追加してください！
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>日付</TableCell>
                      <TableCell>ユーザー</TableCell>
                      <TableCell>勤務時間</TableCell>
                      <TableCell>アクション</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell>
                          {format(new Date(shift.date), 'M月d日(E)', { locale: ja })}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={shift.user_display_name || `ユーザー${shift.user_id}`}
                            color="success"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            // 時刻表示の修正：UTCから日本時間への適切な変換
                            let startTimeDisplay: string;
                            let endTimeDisplay: string;
                            
                            try {
                              if (typeof shift.start_time === 'string') {
                                if (shift.start_time.includes('T')) {
                                  // ISO形式の場合、時刻部分のみ抽出
                                  const startDate = new Date(shift.start_time);
                                  startTimeDisplay = format(startDate, 'HH:mm');
                                } else if (shift.start_time.match(/^\d{2}:\d{2}$/)) {
                                  // 既に "HH:mm" 形式の場合
                                  startTimeDisplay = shift.start_time;
                                } else {
                                  // その他の形式
                                  startTimeDisplay = shift.start_time;
                                }
                              } else {
                                startTimeDisplay = format(new Date(shift.start_time), 'HH:mm');
                              }
                              
                              if (typeof shift.end_time === 'string') {
                                if (shift.end_time.includes('T')) {
                                  const endDate = new Date(shift.end_time);
                                  endTimeDisplay = format(endDate, 'HH:mm');
                                } else if (shift.end_time.match(/^\d{2}:\d{2}$/)) {
                                  endTimeDisplay = shift.end_time;
                                } else {
                                  endTimeDisplay = shift.end_time;
                                }
                              } else {
                                endTimeDisplay = format(new Date(shift.end_time), 'HH:mm');
                              }
                            } catch (error) {
                              console.error('時刻表示エラー:', error, shift);
                              startTimeDisplay = '??:??';
                              endTimeDisplay = '??:??';
                            }
                            
                            return `${startTimeDisplay} - ${endTimeDisplay}`;
                          })()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setEditDialog({ open: true, shift })}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, shift })}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Box>

        {/* クイック確定ダイアログ */}
        <Dialog 
          open={quickCreateDialog.open} 
          onClose={() => setQuickCreateDialog({ open: false, request: null, start_time: null, end_time: null })}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>シフト確定</DialogTitle>
          <DialogContent>
            {quickCreateDialog.request && (
              <Box sx={{ pt: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    {quickCreateDialog.request.user_display_name}さんの
                    {format(new Date(quickCreateDialog.request.date), 'M月d日(E)', { locale: ja })}のシフトを確定します
                  </Typography>
                </Alert>

                <TextField
                  label="ユーザー"
                  value={quickCreateDialog.request.user_display_name || `ユーザー${quickCreateDialog.request.user_id}`}
                  disabled
                  fullWidth
                  margin="normal"
                />

                <TextField
                  label="日付"
                  value={format(new Date(quickCreateDialog.request.date), 'yyyy年M月d日(E)', { locale: ja })}
                  disabled
                  fullWidth
                  margin="normal"
                />

                <Box display="flex" gap={2} mt={2}>
                  <TimePicker
                    label="開始時間"
                    value={quickCreateDialog.start_time}
                    onChange={(newValue) => setQuickCreateDialog({ 
                      ...quickCreateDialog, 
                      start_time: newValue 
                    })}
                    slots={{ textField: TextField }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: 'normal',
                      },
                    }}
                  />

                  <TimePicker
                    label="終了時間"
                    value={quickCreateDialog.end_time}
                    onChange={(newValue) => setQuickCreateDialog({ 
                      ...quickCreateDialog, 
                      end_time: newValue 
                    })}
                    slots={{ textField: TextField }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: 'normal',
                      },
                    }}
                  />
                </Box>

                {quickCreateDialog.request.description && (
                  <TextField
                    label="シフト希望時のコメント"
                    value={quickCreateDialog.request.description}
                    disabled
                    multiline
                    rows={2}
                    fullWidth
                    margin="normal"
                  />
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQuickCreateDialog({ open: false, request: null, start_time: null, end_time: null })}>
              キャンセル
            </Button>
            <Button onClick={handleQuickCreate} variant="contained">
              確定する
            </Button>
          </DialogActions>
        </Dialog>

        {/* 新規作成ダイアログ */}
        <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>新規確定シフト作成</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <DatePicker
                label="日付"
                value={newShift.date}
                onChange={(newValue) => newValue && setNewShift({ ...newShift, date: newValue })}
                slots={{ textField: TextField }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
              />

              <TextField
                label="ユーザーID"
                type="number"
                value={newShift.user_id}
                onChange={(e) => setNewShift({ ...newShift, user_id: e.target.value })}
                fullWidth
                margin="normal"
                helperText="ユーザーのIDを入力してください"
              />

              <Box display="flex" gap={2} mt={2}>
                <TimePicker
                  label="開始時間"
                  value={newShift.start_time}
                  onChange={(newValue) => newValue && setNewShift({ ...newShift, start_time: newValue })}
                  slots={{ textField: TextField }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                    },
                  }}
                />

                <TimePicker
                  label="終了時間"
                  value={newShift.end_time}
                  onChange={(newValue) => newValue && setNewShift({ ...newShift, end_time: newValue })}
                  slots={{ textField: TextField }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal',
                    },
                  }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialog(false)}>キャンセル</Button>
            <Button onClick={handleCreate} variant="contained">作成する</Button>
          </DialogActions>
        </Dialog>

        {/* 編集ダイアログ */}
        <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, shift: null })} maxWidth="sm" fullWidth>
          <DialogTitle>確定シフト編集</DialogTitle>
          <DialogContent>
            {editDialog.shift && (
              <Box sx={{ pt: 2 }}>
                <TextField
                  label="日付"
                  value={format(new Date(editDialog.shift.date), 'yyyy-MM-dd')}
                  disabled
                  fullWidth
                  margin="normal"
                />

                <TextField
                  label="ユーザー"
                  value={editDialog.shift.user_display_name || `ユーザー${editDialog.shift.user_id}`}
                  disabled
                  fullWidth
                  margin="normal"
                />

                <Box display="flex" gap={2} mt={2}>
                  <TimePicker
                    label="開始時間"
                    value={(() => {
                      // 編集ダイアログでの時刻処理を修正
                      try {
                        if (typeof editDialog.shift.start_time === 'string') {
                          if (editDialog.shift.start_time.includes('T')) {
                            return new Date(editDialog.shift.start_time);
                          } else if (editDialog.shift.start_time.match(/^\d{2}:\d{2}$/)) {
                            // "HH:mm" 形式の場合、今日の日付と組み合わせて Date オブジェクトを作成
                            const today = new Date();
                            const [hours, minutes] = editDialog.shift.start_time.split(':');
                            today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                            return today;
                          }
                        }
                        return new Date(editDialog.shift.start_time);
                      } catch (error) {
                        console.error('開始時間パースエラー:', error, editDialog.shift.start_time);
                        return new Date();
                      }
                    })()}
                    onChange={(newValue) => {
                      if (newValue && editDialog.shift) {
                        setEditDialog({
                          ...editDialog,
                          shift: { ...editDialog.shift, start_time: format(newValue, 'HH:mm') }
                        });
                      }
                    }}
                    slots={{ textField: TextField }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: 'normal',
                      },
                    }}
                  />

                  <TimePicker
                    label="終了時間"
                    value={(() => {
                      try {
                        if (typeof editDialog.shift.end_time === 'string') {
                          if (editDialog.shift.end_time.includes('T')) {
                            return new Date(editDialog.shift.end_time);
                          } else if (editDialog.shift.end_time.match(/^\d{2}:\d{2}$/)) {
                            const today = new Date();
                            const [hours, minutes] = editDialog.shift.end_time.split(':');
                            today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                            return today;
                          }
                        }
                        return new Date(editDialog.shift.end_time);
                      } catch (error) {
                        console.error('終了時間パースエラー:', error, editDialog.shift.end_time);
                        return new Date();
                      }
                    })()}
                    onChange={(newValue) => {
                      if (newValue && editDialog.shift) {
                        setEditDialog({
                          ...editDialog,
                          shift: { ...editDialog.shift, end_time: format(newValue, 'HH:mm') }
                        });
                      }
                    }}
                    slots={{ textField: TextField }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: 'normal',
                      },
                    }}
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog({ open: false, shift: null })}>キャンセル</Button>
            <Button onClick={handleEdit} variant="contained">更新する</Button>
          </DialogActions>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, shift: null })}>
          <DialogTitle>確定シフトを削除しますか？</DialogTitle>
          <DialogContent>
            <Typography>
              {deleteDialog.shift && (
                <>
                  {format(new Date(deleteDialog.shift.date), 'M月d日(E)', { locale: ja })}の
                  {deleteDialog.shift.user_display_name || `ユーザー${deleteDialog.shift.user_id}`}さんの
                  シフトを削除します。この操作は取り消せません！
                </>
              )}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, shift: null })}>キャンセル</Button>
            <Button color="error" onClick={handleDelete}>削除する</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default AdminConfirmedShiftsPage;