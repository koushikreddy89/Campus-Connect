import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/services/api';
import {
  Shield, AlertOctagon, Users, KeyRound, Monitor, Clock, 
  Search, Filter, ChevronLeft, ChevronRight, RefreshCw, 
  ArrowLeft, Terminal, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface SecurityMetrics {
  totalFailedLogins: number;
  activeLockouts: number;
  activeSessions: number;
  otpRequestsRecent: number;
  totalUsers: number;
  eventsBreakdown: Array<{
    _id: string;
    count: number;
    successCount: number;
    failureCount: number;
  }>;
  recentAlerts: Array<{
    _id: string;
    userId?: string;
    email?: string;
    event: string;
    status: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
    createdAt: string;
  }>;
}

export default function SecurityDashboardPage() {
  const role = useAuthStore(s => s.role);
  const college = useAuthStore(s => s.college) || 'SR University';
  const navigate = useNavigate();

  // Metrics state
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Logs table state
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Expandable row state
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Double check authorization
  useEffect(() => {
    if (role !== 'admin' && role !== 'super_admin') {
      navigate('/', { replace: true });
    }
  }, [role, navigate]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search change
    }, 4000);
    return () => clearTimeout(handler);
  }, [search]);

  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await adminApi.getSecurityMetrics();
      if (res.success && res.data) {
        setMetrics(res.data);
      } else {
        toast.error(res.error || 'Failed to load security metrics');
      }
    } catch (e: any) {
      toast.error('Network error loading metrics');
    } finally {
      setMetricsLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await adminApi.getSecurityLogsPaged(page, 15, eventFilter, statusFilter, debouncedSearch);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        toast.error(res.error || 'Failed to load security logs');
      }
    } catch (e: any) {
      toast.error('Network error loading audit logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, eventFilter, statusFilter, debouncedSearch]);

  const handleRefreshAll = () => {
    loadMetrics();
    loadLogs();
    toast.success('Security logs refreshed');
  };

  const getEventBadgeClass = (event: string) => {
    if (event.includes('fail') || event.includes('lockout') || event.includes('block')) {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    if (event.includes('mfa') || event.includes('reset') || event.includes('change')) {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
    return 'bg-green-500/10 text-green-400 border border-green-500/20';
  };

  const formatUserAgent = (ua?: string) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
      return 'Mobile Device';
    }
    if (ua.includes('Chrome')) return 'Chrome / Desktop';
    if (ua.includes('Safari')) return 'Safari / Desktop';
    if (ua.includes('Firefox')) return 'Firefox / Desktop';
    return 'Desktop Client';
  };

  return (
    <div className="min-h-screen bg-[#09090B] pb-16 text-foreground font-sans select-none relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]" />
      <div className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-violet-400" />
                <h1 className="text-2xl font-bold tracking-tight text-white">Security Guard & Audit Logs</h1>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-medium">{college} Enterprise Network Administration</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 h-10 px-4 rounded-xl flex items-center gap-2 text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <span className="text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Active Shielding
            </span>
          </div>
        </div>

        {/* Quick Stats Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          
          {/* Card 1: Active Sessions */}
          <div className="glass-card p-5 border border-zinc-900 rounded-2xl flex flex-col justify-between bg-zinc-950/40 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Active Sessions</span>
              <div className="h-7 w-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Monitor className="h-4 w-4 text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-white">{metricsLoading ? '...' : metrics?.activeSessions}</h3>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">Hashed token validations</p>
            </div>
          </div>

          {/* Card 2: Failed Logins */}
          <div className="glass-card p-5 border border-zinc-900 rounded-2xl flex flex-col justify-between bg-zinc-950/40 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Failed Logins</span>
              <div className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertOctagon className="h-4 w-4 text-red-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-white">{metricsLoading ? '...' : metrics?.totalFailedLogins}</h3>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">Total brute force indicators</p>
            </div>
          </div>

          {/* Card 3: Active Lockouts */}
          <div className="glass-card p-5 border border-zinc-900 rounded-2xl flex flex-col justify-between bg-zinc-950/40 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Lockouts</span>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-white">{metricsLoading ? '...' : metrics?.activeLockouts}</h3>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">Suspended IP range / accounts</p>
            </div>
          </div>

          {/* Card 4: OTP Requests (24h) */}
          <div className="glass-card p-5 border border-zinc-900 rounded-2xl flex flex-col justify-between bg-zinc-950/40 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">OTP Sent (24h)</span>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-white">{metricsLoading ? '...' : metrics?.otpRequestsRecent}</h3>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">Verification / MFA prompts</p>
            </div>
          </div>

          {/* Card 5: Registered Users */}
          <div className="glass-card p-5 border border-zinc-900 rounded-2xl flex flex-col justify-between bg-zinc-950/40 min-h-[120px] col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Total Users</span>
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-violet-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-white">{metricsLoading ? '...' : metrics?.totalUsers}</h3>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">Students + Alumni records</p>
            </div>
          </div>

        </div>

        {/* Dashboard Visualizations */}
        {!metricsLoading && metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Events Breakdown Chart (CSS Bars representation) */}
            <div className="glass-card p-6 border border-zinc-900 rounded-2xl bg-zinc-950/40 lg:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-violet-400" /> 7-Day Event Distribution
              </h3>
              
              <div className="space-y-4">
                {metrics.eventsBreakdown.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic text-center py-6">No historical data available for this range.</p>
                ) : (
                  metrics.eventsBreakdown.map((item, idx) => {
                    const total = item.count || 1;
                    const successPct = Math.round((item.successCount / total) * 100);
                    const failurePct = 100 - successPct;
                    
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-zinc-300 capitalize font-mono text-[11px]">{item._id.replace(/_/g, ' ')}</span>
                          <span className="text-zinc-500 text-[10px]">{item.count} hits ({successPct}% success)</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-900 rounded-full flex overflow-hidden">
                          <div 
                            className="bg-green-500 h-full transition-all duration-300" 
                            style={{ width: `${successPct}%` }}
                            title={`Success: ${item.successCount}`}
                          />
                          <div 
                            className="bg-red-500 h-full transition-all duration-300" 
                            style={{ width: `${failurePct}%` }}
                            title={`Failure: ${item.failureCount}`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Critical Alerts / Recent Failures Log */}
            <div className="glass-card p-6 border border-zinc-900 rounded-2xl bg-zinc-950/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" /> Security Critical Alerts
              </h3>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {metrics.recentAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-zinc-500 text-xs gap-1.5">
                    <ShieldCheck className="h-7 w-7 text-green-400" />
                    <span>No critical failure events logged.</span>
                  </div>
                ) : (
                  metrics.recentAlerts.map((alert) => (
                    <div key={alert._id} className="p-3 bg-red-950/10 border border-red-500/10 rounded-xl flex items-start gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 mt-1 animate-pulse shrink-0" />
                      <div className="space-y-1">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[10px] font-bold text-red-400 font-mono capitalize">{alert.event.replace(/_fail/g, '')} Fail</span>
                          <span className="text-[9px] text-zinc-500">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[10px] text-zinc-300 break-all">{alert.email || alert.userId || 'System Entity'}</p>
                        <p className="text-[9px] text-zinc-500 font-mono">IP: {alert.ipAddress}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Security Logs Filter Grid */}
        <div className="glass-card p-6 border border-zinc-900 rounded-2xl bg-zinc-950/40 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="h-4 w-4 text-violet-400" /> Audit Trail Grid
            </h3>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 md:flex-none">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search IP, email, user ID..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              {/* Event Filter */}
              <div className="relative min-w-[120px]">
                <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <select
                  value={eventFilter}
                  onChange={e => { setEventFilter(e.target.value); setPage(1); }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-300 outline-none focus:ring-2 focus:ring-violet-500/30 appearance-none"
                >
                  <option value="">All Events</option>
                  <option value="login">Login</option>
                  <option value="login_fail_password">Password Fail</option>
                  <option value="login_fail_no_user">User Not Found</option>
                  <option value="mfa_initiated">MFA Sent</option>
                  <option value="register_initiate">Register Init</option>
                  <option value="register_attempt_duplicate">Duplicate Sign</option>
                  <option value="password_reset_request_success">Reset Requested</option>
                  <option value="password_reset_complete">Password Changed</option>
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>

            </div>
          </div>

          {/* Audit Logs Table */}
          {logsLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 italic text-xs border border-dashed border-zinc-800 rounded-xl">
              No security log records match your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-950/60">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">User Context</th>
                    <th className="p-3.5">Security Event</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">IP Address</th>
                    <th className="p-3.5">Client Device</th>
                    <th className="p-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log._id;
                    return (
                      <React.Fragment key={log._id}>
                        <tr 
                          onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                          className="hover:bg-zinc-900/40 transition-colors cursor-pointer"
                        >
                          <td className="p-3.5 text-[10px] text-zinc-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3.5 font-semibold text-white break-all max-w-[200px]">
                            {log.email || log.userId || 'system'}
                          </td>
                          <td className="p-3.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${getEventBadgeClass(log.event)}`}>
                              {log.event}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`text-[9px] font-extrabold uppercase ${log.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[10px] text-zinc-400">
                            {log.ipAddress || 'unknown'}
                          </td>
                          <td className="p-3.5 text-zinc-400">
                            {formatUserAgent(log.userAgent)}
                          </td>
                          <td className="p-3.5 text-violet-400 hover:text-violet-300 font-bold text-[10px] whitespace-nowrap">
                            {isExpanded ? 'Hide Payload' : 'View Payload'}
                          </td>
                        </tr>

                        {/* Expanded Payload Row */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 bg-zinc-900/10">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="px-6 py-4 border-t border-b border-zinc-900"
                                >
                                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-[10px] text-zinc-300 overflow-x-auto space-y-2 max-w-full">
                                    <div className="flex justify-between items-center text-zinc-500 border-b border-zinc-900 pb-2 mb-2 font-sans font-semibold">
                                      <span>AUDIT PAYLOAD SPECIFICATION</span>
                                      <span>ID: {log._id}</span>
                                    </div>
                                    <div><span className="text-violet-400">Timestamp:</span> {log.createdAt}</div>
                                    <div><span className="text-violet-400">IP:</span> {log.ipAddress || 'Not Captured'}</div>
                                    <div><span className="text-violet-400">UA:</span> {log.userAgent || 'Not Captured'}</div>
                                    <div><span className="text-violet-400">Event:</span> {log.event}</div>
                                    <div><span className="text-violet-400">Status:</span> {log.status}</div>
                                    {log.details && Object.keys(log.details).length > 0 && (
                                      <div>
                                        <span className="text-violet-400">Metadata details:</span>
                                        <pre className="mt-1 text-zinc-400 bg-zinc-900/60 p-2 rounded border border-zinc-900 overflow-x-auto">
                                          {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!logsLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-900 pt-5 mt-6">
              <span className="text-xs text-zinc-500">
                Showing page <strong className="text-zinc-300">{page}</strong> of <strong className="text-zinc-300">{totalPages}</strong> ({totalCount} total events)
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-700 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-700 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

// Simple React.Fragment import fallback check for Vite builds
import React from 'react';
