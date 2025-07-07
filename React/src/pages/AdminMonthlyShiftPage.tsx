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
    TextField,
    Button,
    Chip,
    IconButton,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Card,
    CardContent,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import {
    Save,
    Edit,
    Check,
    Close,
    NavigateBefore,
    NavigateNext,
    Schedule,
    Person,
    Warning,
    Info
} from '@mui/icons-material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameDay,
    parseISO,
    differenceInMinutes
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useError } from '../contexts/ErrorContext';
import { adminAPI, confirmedShiftAPI, authAPI } from '../services/api';
import { User, ShiftRequest, ConfirmedShift, ConfirmedShiftCreate, DayOfWeekSettings } from '../types';

// 各日のシフト情報を管理する型
interface DayShiftInfo {
    date: string;
    user_id: number;
    canwork: boolean;
    start_time: string | null;
    end_time: string | null;
    confirmed_shift_id?: number;
    shift_request_id?: number;
    is_confirmed: boolean;
    is_editing?: boolean;
    temp_start_time?: Date | null;
    temp_end_time?: Date | null;
    description?: string;
}

// ユーザー毎の月間シフト情報
interface UserMonthlyShifts {
    user: User;
    shifts: { [date: string]: DayShiftInfo };
}

const AdminMonthlyShiftPage: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [users, setUsers] = useState<User[]>([]);
    const [userShifts, setUserShifts] = useState<UserMonthlyShifts[]>([]);
    const [dayOfWeekSettings, setDayOfWeekSettings] = useState<DayOfWeekSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingCells, setEditingCells] = useState<Set<string>>(new Set());
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        message: string;
        onConfirm: () => void;
    }>({ open: false, message: '', onConfirm: () => { } });

    const { showError } = useError();

    // 授業曜日設定に基づいて表示対象の日を決定
    const getValidDays = () => {
        if (!dayOfWeekSettings) return [];

        const allDays = eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
        });

        return allDays.filter(day => {
            const dayOfWeek = day.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
            switch (dayOfWeek) {
                case 0: return dayOfWeekSettings.sunday;
                case 1: return dayOfWeekSettings.monday;
                case 2: return dayOfWeekSettings.tuesday;
                case 3: return dayOfWeekSettings.wednesday;
                case 4: return dayOfWeekSettings.thursday;
                case 5: return dayOfWeekSettings.friday;
                case 6: return dayOfWeekSettings.saturday;
                default: return false;
            }
        });
    };

    const monthDays = getValidDays();

    useEffect(() => {
        loadMonthlyData();
    }, [currentMonth]);

    const loadMonthlyData = async () => {
        try {
            setLoading(true);

            // 全ユーザー、シフト希望、確定シフト、授業曜日設定を並行取得
            const [usersData, shiftRequestsData, confirmedShiftsData, dayOfWeekData] = await Promise.all([
                adminAPI.getAllUsers(),
                adminAPI.getAllShiftRequests(),
                confirmedShiftAPI.getConfirmedShifts(),
                adminAPI.getDayOfWeekSettings()
            ]);

            // 管理者を除外
            const nonAdminUsers = usersData.filter(user => !user.admin);

            setDayOfWeekSettings(dayOfWeekData);

            // 現在の月のデータのみフィルタリング
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(currentMonth);

            const monthlyRequests = shiftRequestsData.filter(req => {
                const reqDate = parseISO(req.date);
                return reqDate >= monthStart && reqDate <= monthEnd;
            });

            const monthlyConfirmed = confirmedShiftsData.filter(shift => {
                const shiftDate = parseISO(shift.date);
                return shiftDate >= monthStart && shiftDate <= monthEnd;
            });

            // 授業曜日設定に基づいて表示対象の日を決定
            const validDays = eachDayOfInterval({
                start: monthStart,
                end: monthEnd
            }).filter(day => {
                const dayOfWeek = day.getDay();
                switch (dayOfWeek) {
                    case 0: return dayOfWeekData.sunday;
                    case 1: return dayOfWeekData.monday;
                    case 2: return dayOfWeekData.tuesday;
                    case 3: return dayOfWeekData.wednesday;
                    case 4: return dayOfWeekData.thursday;
                    case 5: return dayOfWeekData.friday;
                    case 6: return dayOfWeekData.saturday;
                    default: return false;
                }
            });

            // ユーザー毎の月間シフトデータを構築（管理者を除外）
            const userShiftsData: UserMonthlyShifts[] = nonAdminUsers.map(user => {
                const shifts: { [date: string]: DayShiftInfo } = {};

                validDays.forEach(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');

                    // シフト希望を確認
                    const shiftRequest = monthlyRequests.find(req =>
                        req.user_id === user.id && req.date === dateStr
                    );

                    // 確定シフトを確認
                    const confirmedShift = monthlyConfirmed.find(shift =>
                        shift.user_id === user.id && shift.date === dateStr
                    );

                    if (confirmedShift) {
                        // 確定シフトが存在する場合
                        const startTime = parseISO(confirmedShift.start_time);
                        const endTime = parseISO(confirmedShift.end_time);

                        shifts[dateStr] = {
                            date: dateStr,
                            user_id: user.id,
                            canwork: true,
                            start_time: format(startTime, 'HH:mm'),
                            end_time: format(endTime, 'HH:mm'),
                            confirmed_shift_id: confirmedShift.id,
                            shift_request_id: shiftRequest?.id,
                            is_confirmed: true,
                            description: shiftRequest?.description
                        };
                    } else if (shiftRequest) {
                        // シフト希望のみ存在する場合
                        shifts[dateStr] = {
                            date: dateStr,
                            user_id: user.id,
                            canwork: shiftRequest.canwork,
                            start_time: shiftRequest.start_time || null,
                            end_time: shiftRequest.end_time || null,
                            shift_request_id: shiftRequest.id,
                            is_confirmed: false,
                            description: shiftRequest.description
                        };
                    } else {
                        // 未登録の場合
                        shifts[dateStr] = {
                            date: dateStr,
                            user_id: user.id,
                            canwork: false,
                            start_time: null,
                            end_time: null,
                            is_confirmed: false
                        };
                    }
                });

                return { user, shifts };
            });

            setUsers(nonAdminUsers);
            setUserShifts(userShiftsData);
        } catch (error) {
            showError('データの読み込みに失敗しました😭');
        } finally {
            setLoading(false);
        }
    };

    const calculateWorkingHours = (start: string | null, end: string | null): string => {
        if (!start || !end) return '';

        const startTime = parseISO(`2000-01-01T${start}:00`);
        const endTime = parseISO(`2000-01-01T${end}:00`);
        const minutes = differenceInMinutes(endTime, startTime);

        if (minutes <= 0) return '';

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        return mins > 0 ? `${hours}.${mins}時間` : `${hours}時間`;
    };

    const handleEditStart = (userId: number, date: string) => {
        const cellKey = `${userId}-${date}`;
        setEditingCells(prev => new Set(prev.add(cellKey)));

        // 編集用の一時的な時間を設定（希望時間を初期値として使用）
        setUserShifts(prev => prev.map(userShift => {
            if (userShift.user.id === userId) {
                const shift = userShift.shifts[date];
                
                // 希望時間がある場合はそれを初期値として使用、なければnull
                let initialStartTime = null;
                let initialEndTime = null;
                
                if (shift.start_time) {
                    try {
                        initialStartTime = parseISO(`2000-01-01T${shift.start_time}:00`);
                    } catch (error) {
                        console.error('開始時間のパースに失敗:', shift.start_time);
                    }
                }
                
                if (shift.end_time) {
                    try {
                        initialEndTime = parseISO(`2000-01-01T${shift.end_time}:00`);
                    } catch (error) {
                        console.error('終了時間のパースに失敗:', shift.end_time);
                    }
                }

                const updatedShift = {
                    ...shift,
                    is_editing: true,
                    temp_start_time: initialStartTime,
                    temp_end_time: initialEndTime
                };

                return {
                    ...userShift,
                    shifts: {
                        ...userShift.shifts,
                        [date]: updatedShift
                    }
                };
            }
            return userShift;
        }));
    };

    const handleEditCancel = (userId: number, date: string) => {
        const cellKey = `${userId}-${date}`;
        setEditingCells(prev => {
            const newSet = new Set(prev);
            newSet.delete(cellKey);
            return newSet;
        });

        // 編集状態をリセット
        setUserShifts(prev => prev.map(userShift => {
            if (userShift.user.id === userId) {
                const shift = userShift.shifts[date];
                const updatedShift = {
                    ...shift,
                    is_editing: false,
                    temp_start_time: undefined,
                    temp_end_time: undefined
                };

                return {
                    ...userShift,
                    shifts: {
                        ...userShift.shifts,
                        [date]: updatedShift
                    }
                };
            }
            return userShift;
        }));
    };

    const handleTimeChange = (userId: number, date: string, field: 'start' | 'end', value: Date | null) => {
        setUserShifts(prev => prev.map(userShift => {
            if (userShift.user.id === userId) {
                const shift = userShift.shifts[date];
                const updatedShift = {
                    ...shift,
                    [field === 'start' ? 'temp_start_time' : 'temp_end_time']: value
                };

                return {
                    ...userShift,
                    shifts: {
                        ...userShift.shifts,
                        [date]: updatedShift
                    }
                };
            }
            return userShift;
        }));
    };

    const handleEditSave = async (userId: number, date: string) => {
        try {
            setSaving(true);

            const userShift = userShifts.find(us => us.user.id === userId);
            if (!userShift) return;

            const shift = userShift.shifts[date];
            if (!shift.temp_start_time || !shift.temp_end_time) {
                showError('開始時間と終了時間を入力してください！');
                return;
            }

            const startTime = format(shift.temp_start_time, 'HH:mm');
            const endTime = format(shift.temp_end_time, 'HH:mm');

            if (shift.is_confirmed && shift.confirmed_shift_id) {
                // 確定シフトの更新
                await adminAPI.updateConfirmedShift(shift.confirmed_shift_id, {
                    date,
                    start_time: shift.temp_start_time.toISOString(),
                    end_time: shift.temp_end_time.toISOString(),
                    user_id: userId
                });
            } else {
                // 新しい確定シフトの作成
                await adminAPI.createConfirmedShift({
                    date,
                    start_time: shift.temp_start_time.toISOString(),
                    end_time: shift.temp_end_time.toISOString(),
                    user_id: userId
                });
            }

            // 編集状態を終了
            const cellKey = `${userId}-${date}`;
            setEditingCells(prev => {
                const newSet = new Set(prev);
                newSet.delete(cellKey);
                return newSet;
            });

            // データを再読み込み
            await loadMonthlyData();
            showError('シフトを保存しました！✨');

        } catch (error) {
            showError('シフトの保存に失敗しました😭');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteShift = async (userId: number, date: string) => {
        const userShift = userShifts.find(us => us.user.id === userId);
        if (!userShift) return;

        const shift = userShift.shifts[date];
        if (!shift.confirmed_shift_id) return;

        setConfirmDialog({
            open: true,
            message: `${userShift.user.DisplayName}さんの${format(parseISO(date), 'M月d日', { locale: ja })}のシフトを削除しますか？`,
            onConfirm: async () => {
                try {
                    await adminAPI.deleteConfirmedShift(shift.confirmed_shift_id!);
                    await loadMonthlyData();
                    showError('シフトを削除しました！');
                } catch (error) {
                    showError('シフトの削除に失敗しました😭');
                }
                setConfirmDialog({ open: false, message: '', onConfirm: () => { } });
            }
        });
    };

    const getStatusChip = (shift: DayShiftInfo) => {
        if (shift.is_confirmed) {
            return <Chip label="確定" color="success" size="small" />;
        } else if (shift.canwork) {
            return <Chip label="勤務可" color="primary" size="small" />;
        } else if (shift.shift_request_id) {
            return <Chip label="勤務不可" color="error" size="small" />;
        } else {
            return <Chip label="未登録" color="default" size="small" />;
        }
    };

    const renderTimeCell = (shift: DayShiftInfo, userId: number, date: string) => {
        const cellKey = `${userId}-${date}`;
        const isEditing = editingCells.has(cellKey);

        if (isEditing) {
            return (
                <Box sx={{ p: 1 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <TimePicker
                                label="開始時間"
                                value={shift.temp_start_time}
                                onChange={(value) => handleTimeChange(userId, date, 'start', value)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true
                                    }
                                }}
                            />
                            <TimePicker
                                label="終了時間"
                                value={shift.temp_end_time}
                                onChange={(value) => handleTimeChange(userId, date, 'end', value)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true
                                    }
                                }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button
                                    size="small"
                                    onClick={() => handleEditCancel(userId, date)}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleEditSave(userId, date)}
                                    disabled={saving}
                                    startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                                >
                                    保存
                                </Button>
                            </Box>
                        </Box>
                    </LocalizationProvider>
                </Box>
            );
        }

        // 非編集時の表示
        if (!shift.canwork && !shift.is_confirmed) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">
                        {shift.shift_request_id ? '勤務不可' : '未登録'}
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Schedule />}
                        onClick={() => handleEditStart(userId, date)}
                    >
                        時間設定
                    </Button>
                </Box>
            );
        }

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    {shift.start_time && shift.end_time ? (
                        <Box>
                            <Typography variant="body2">
                                {getDisplayTime(shift.start_time)} - {getDisplayTime(shift.end_time)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {calculateWorkingHours(shift.start_time, shift.end_time)}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="textSecondary">
                            時間未設定
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                        size="small"
                        onClick={() => handleEditStart(userId, date)}
                    >
                        <Edit />
                    </IconButton>
                    {shift.is_confirmed && (
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteShift(userId, date)}
                        >
                            <Close />
                        </IconButton>
                    )}
                </Box>
            </Box>
        );
    };

    if (loading) {
        return (
            <Container>
                <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>読み込み中...</Typography>
                </Box>
            </Container>
        );
    }

    // 授業曜日設定が読み込まれるまで待機
    if (!dayOfWeekSettings) {
        return (
            <Container>
                <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>設定を読み込み中...</Typography>
                </Box>
            </Container>
        );
    }

    const validDays = getValidDays();
    // 追加：時刻表示用の関数
    function getDisplayTime(timeStr: string) {
        // すでに "HH:mm" 形式ならそのまま返す
        if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
        // それ以外は parseISO して "HH:mm" で表示
        try {
            return format(parseISO(timeStr), 'HH:mm');
        } catch {
            return '';
        }
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <Container maxWidth="xl">
                <Box sx={{ mt: 4, mb: 4 }}>
                    {/* ヘッダー */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1">
                            月間シフト管理
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                <NavigateBefore />
                            </IconButton>
                            <Typography variant="h6">
                                {format(currentMonth, 'yyyy年M月', { locale: ja })}
                            </Typography>
                            <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                <NavigateNext />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* 統計情報 */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Person color="primary" />
                                        <Typography variant="h6">{users.length}</Typography>
                                        <Typography variant="body2">登録メンバー</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Schedule color="info" />
                                        <Typography variant="h6">{validDays.length}</Typography>
                                        <Typography variant="body2">授業日数</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Schedule color="success" />
                                        <Typography variant="h6">
                                            {userShifts.reduce((total, userShift) =>
                                                total + Object.values(userShift.shifts).filter(shift => shift.is_confirmed).length, 0
                                            )}
                                        </Typography>
                                        <Typography variant="body2">確定シフト</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Warning color="warning" />
                                        <Typography variant="h6">
                                            {userShifts.reduce((total, userShift) =>
                                                total + Object.values(userShift.shifts).filter(shift => shift.canwork && !shift.is_confirmed).length, 0
                                            )}
                                        </Typography>
                                        <Typography variant="body2">未確定希望</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* 使用方法の説明 */}
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                            <strong>使用方法:</strong>
                            各セルの編集ボタンをクリックして時間を設定してください。
                            「勤務可」の場合は希望時間が表示されます。
                            「未登録」や「勤務不可」の場合でも時間を設定できます。
                            <br />
                            <strong>※</strong> 授業曜日設定で有効にした曜日のみ表示されます。
                        </Typography>
                    </Alert>

                    {/* メインテーブル */}
                    <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ minWidth: 120, position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                                        氏名
                                    </TableCell>
                                    {validDays.map((day) => (
                                        <TableCell key={day.toISOString()} sx={{ minWidth: 160, textAlign: 'center' }}>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {format(day, 'M/d', { locale: ja })}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {format(day, '(E)', { locale: ja })}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {userShifts.map((userShift) => (
                                    <TableRow key={userShift.user.id}>
                                        <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {userShift.user.DisplayName}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    ID: {userShift.user.id}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        {validDays.map((day) => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const shift = userShift.shifts[dateStr];

                                            return (
                                                <TableCell key={dateStr} sx={{ minWidth: 350, verticalAlign: 'top' }}>
                                                    <Box sx={{ mb: 1 }}>
                                                        {getStatusChip(shift)}
                                                        {shift.description && (
                                                            <Tooltip title={shift.description}>
                                                                <Info color="info" sx={{ ml: 1, fontSize: 16 }} />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                    {renderTimeCell(shift, userShift.user.id, dateStr)}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                {/* 確認ダイアログ */}
                <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, message: '', onConfirm: () => { } })}>
                    <DialogTitle>確認</DialogTitle>
                    <DialogContent>
                        <Typography>{confirmDialog.message}</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmDialog({ open: false, message: '', onConfirm: () => { } })}>
                            キャンセル
                        </Button>
                        <Button onClick={confirmDialog.onConfirm} color="error">
                            削除
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </LocalizationProvider>
    );
};

export default AdminMonthlyShiftPage;
