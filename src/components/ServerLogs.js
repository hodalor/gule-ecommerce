import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../utils/api';
import socketService from '../utils/socket';

const ServerLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 50,
    total: 0,
    hasMore: false
  });
  const [statistics, setStatistics] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    level: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });

  const fetchLogs = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError('');

      const params = {
        ...filters,
        limit: pagination.limit,
        offset: reset ? 0 : pagination.offset
      };

      const response = await api.get('/admin/server-logs', { params });
      
      if (response.data.success) {
        if (reset) {
          setLogs(response.data.data.logs);
          setPagination(prev => ({
            ...prev,
            offset: 0,
            total: response.data.data.pagination.total,
            hasMore: response.data.data.pagination.hasMore
          }));
        } else {
          setLogs(prev => [...prev, ...response.data.data.logs]);
          setPagination(prev => ({
            ...prev,
            offset: response.data.data.pagination.offset,
            total: response.data.data.pagination.total,
            hasMore: response.data.data.pagination.hasMore
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching server logs:', error);
      setError(error.response?.data?.error || 'Failed to fetch server logs');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.offset]);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await api.get('/admin/server-logs/statistics');
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  useEffect(() => {
    fetchLogs(true);
    fetchStatistics();
  }, [filters]);

  // WebSocket real-time updates
  useEffect(() => {
    // Connect to WebSocket
    socketService.connect();

    // Handle real-time log updates
    const handleLogUpdate = (logData) => {
      console.log('Received real-time log update:', logData);
      
      // Add new log to the beginning of the list if it matches current filters
      if (filters.level === 'all' || filters.level === logData.level) {
        setLogs(prevLogs => {
          // Check if log already exists to avoid duplicates
          const exists = prevLogs.some(log => 
            log.timestamp === logData.timestamp && 
            log.message === logData.message
          );
          
          if (!exists) {
            return [logData, ...prevLogs.slice(0, 49)]; // Keep only 50 logs
          }
          return prevLogs;
        });
        
        // Update statistics
        fetchStatistics();
      }
    };

    socketService.onLogUpdate(handleLogUpdate);

    return () => {
      socketService.offLogUpdate(handleLogUpdate);
    };
  }, [filters.level, fetchStatistics]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs(true);
        fetchStatistics();
      }, 5000); // Refresh every 5 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, fetchLogs, fetchStatistics]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleLoadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
    fetchLogs(false);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleDownload = async (logType) => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/server-logs/download/${logType}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${logType}-logs-${format(new Date(), 'yyyy-MM-dd')}.log`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess(`${logType} logs downloaded successfully`);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to download logs');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async (logType, createBackup = true) => {
    try {
      setLoading(true);
      const response = await api.delete('/admin/server-logs/clear', {
        data: { logType, createBackup }
      });
      
      if (response.data.success) {
        setSuccess(response.data.message);
        fetchLogs(true);
        fetchStatistics();
        setClearDialogOpen(false);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to clear logs');
    } finally {
      setLoading(false);
    }
  };

  const getLogLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss');
    } catch (error) {
      return timestamp;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Server Logs
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="Auto Refresh"
          />
          <Tooltip title="Refresh Logs">
            <IconButton onClick={() => fetchLogs(true)} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear Logs">
            <IconButton onClick={() => setClearDialogOpen(true)} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Logs
                </Typography>
                <Typography variant="h5">
                  {statistics?.totalLogs?.toLocaleString() || '0'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Error Logs
                </Typography>
                <Typography variant="h5" color="error">
                  {statistics?.errorLogs?.toLocaleString() || '0'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Warning Logs
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {statistics?.warningLogs?.toLocaleString() || '0'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Info Logs
                </Typography>
                <Typography variant="h5" color="info.main">
                  {statistics?.infoLogs?.toLocaleString() || '0'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Log Level</InputLabel>
                <Select
                  value={filters.level}
                  label="Log Level"
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warn">Warning</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="debug">Debug</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="Start Date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="End Date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleDownload('combined')}
                  startIcon={<DownloadIcon />}
                >
                  Download Combined
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleDownload('error')}
                  startIcon={<DownloadIcon />}
                  color="error"
                >
                  Download Errors
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Server Logs ({pagination?.total?.toLocaleString() || '0'} total)
              {autoRefresh && (
                <Badge color="success" variant="dot" sx={{ ml: 1 }}>
                  <Typography variant="caption" color="success.main">
                    Live
                  </Typography>
                </Badge>
              )}
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {formatTimestamp(log.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.level?.toUpperCase() || 'INFO'}
                        color={getLogLevelColor(log.level)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.source}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'monospace'
                        }}
                      >
                        {log.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.service || 'gule-backend'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(log)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          )}

          {pagination.hasMore && !loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={loading}
              >
                Load More
              </Button>
            </Box>
          )}

          {logs.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">
                No server logs found
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Log Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {formatTimestamp(selectedLog.timestamp)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Level
                  </Typography>
                  <Chip
                    label={selectedLog.level?.toUpperCase() || 'INFO'}
                    color={getLogLevelColor(selectedLog.level)}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Source
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedLog.source}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Service
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedLog.service || 'gule-backend'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Message
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                    >
                      {selectedLog.message}
                    </Typography>
                  </Paper>
                </Grid>
                {selectedLog.stack && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Stack Trace
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                      >
                        {selectedLog.stack}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Metadata
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Clear Logs Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Clear Server Logs</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to clear the server logs? This action cannot be undone.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            A backup will be created before clearing the logs.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleClearLogs('error', true)}
            color="warning"
            variant="outlined"
          >
            Clear Error Logs
          </Button>
          <Button
            onClick={() => handleClearLogs('all', true)}
            color="error"
            variant="contained"
          >
            Clear All Logs
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServerLogs;