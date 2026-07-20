import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/services/api';
import {
  Shield, AlertOctagon, Users, KeyRound, Monitor, Clock, 
  Search, Filter, ChevronLeft, ChevronRight, RefreshCw, 
  ArrowLeft, Terminal, AlertTriangle, ShieldCheck, Download,
  Calendar, FileText, ChevronDown, User, Layers, Info, Trash2, X, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const currentAdminEmail = useAuthStore(s => s.email) || 'admin@sru.edu';
  const navigate = useNavigate();

  // Metrics state
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Date states
  const [datePreset, setDatePreset] = useState<string>('last-7-days');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Drawer / Filter options
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [deviceFilter, setDeviceFilter] = useState<string>('');
  const [browserFilter, setBrowserFilter] = useState<string>('');
  const [osFilter, setOsFilter] = useState<string>('');
  const [ipFilter, setIpFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [authMethodFilter, setAuthMethodFilter] = useState<string>('');
  const [mfaStatusFilter, setMfaStatusFilter] = useState<string>('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>('');
  
  // Sort states
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Logs table state
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // UI state
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [selectedSessionLog, setSelectedSessionLog] = useState<any | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

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
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Handle preset date logic
  useEffect(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let from = new Date();
    from.setHours(0, 0, 0, 0);

    if (datePreset === 'today') {
      // today only
    } else if (datePreset === 'yesterday') {
      from.setDate(today.getDate() - 1);
      const yesterdayEnd = new Date(from);
      yesterdayEnd.setHours(23, 59, 59, 999);
      setFromDate(from.toISOString().split('T')[0]);
      setToDate(yesterdayEnd.toISOString().split('T')[0]);
      return;
    } else if (datePreset === 'last-7-days') {
      from.setDate(today.getDate() - 7);
    } else if (datePreset === 'last-30-days') {
      from.setDate(today.getDate() - 30);
    } else if (datePreset === 'this-month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (datePreset === 'last-month') {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(from.toISOString().split('T')[0]);
      setToDate(lastMonthEnd.toISOString().split('T')[0]);
      return;
    } else if (datePreset === 'custom') {
      return; // Do nothing, let user set it manually
    }

    setFromDate(from.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  }, [datePreset]);

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

  const buildFilterParams = () => {
    return {
      page,
      limit,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      event: eventFilter || undefined,
      fromDate: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
      toDate: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
      sort: `${sortOrder === 'desc' ? '-' : ''}${sortField}`,
      // Advanced Filters
      role: roleFilter || undefined,
      department: departmentFilter || undefined,
      branch: branchFilter || undefined,
      batch: batchFilter || undefined,
      device: deviceFilter || undefined,
      browser: browserFilter || undefined,
      os: osFilter || undefined,
      ipAddress: ipFilter || undefined,
      location: locationFilter || undefined,
      authMethod: authMethodFilter || undefined,
      mfaStatus: mfaStatusFilter || undefined,
      accountStatus: accountStatusFilter || undefined
    };
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const params = buildFilterParams();
      const res = await adminApi.getEnterpriseSecurityLogs(params);
      if (res.success && res.data) {
        setLogs(res.data);
        setTotalPages(res.pagination?.pages || 1);
        setTotalCount(res.pagination?.total || res.data.length);
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
  }, [
    page, 
    limit, 
    statusFilter, 
    eventFilter, 
    fromDate, 
    toDate, 
    debouncedSearch, 
    sortField, 
    sortOrder,
    roleFilter,
    departmentFilter,
    branchFilter,
    batchFilter,
    ipFilter,
    deviceFilter,
    browserFilter,
    osFilter,
    locationFilter,
    authMethodFilter,
    mfaStatusFilter,
    accountStatusFilter
  ]);

  const handleRefreshAll = () => {
    loadMetrics();
    loadLogs();
    toast.success('Audit trail synchronized! 🔐');
  };

  // Quick Action triggers
  const triggerQuickFilter = (preset: string) => {
    setPage(1);
    
    // Reset all advanced filters
    setStatusFilter('');
    setEventFilter('');
    setRoleFilter('');
    setDepartmentFilter('');
    setBranchFilter('');
    setBatchFilter('');
    setIpFilter('');
    setSearch('');
    setDeviceFilter('');
    setBrowserFilter('');
    setOsFilter('');
    setLocationFilter('');
    setAuthMethodFilter('');
    setMfaStatusFilter('');
    setAccountStatusFilter('');

    if (preset === 'today-logins') {
      setDatePreset('today');
      setEventFilter('login');
    } else if (preset === 'today-logouts') {
      setDatePreset('today');
      setEventFilter('logout');
    } else if (preset === 'failed-logins') {
      setStatusFilter('failure');
      setEventFilter('login');
    } else if (preset === 'success-logins') {
      setStatusFilter('success');
      setEventFilter('login');
    } else if (preset === 'mfa-events') {
      setEventFilter('mfa');
    } else if (preset === 'suspicious') {
      setEventFilter('suspicious');
    } else if (preset === 'locked') {
      setEventFilter('lock');
    } else if (preset === 'new-registers') {
      setEventFilter('register');
    }
  };

  // Export handlers
  const handleExport = async (type: 'csv' | 'xlsx' | 'pdf') => {
    setShowExportDropdown(false);
    toast.info(`Preparing data for ${type.toUpperCase()} export...`);

    let allLogs: any[] = [];
    try {
      // Build same filter params but fetch all matching records (high limit, page 1)
      const params = {
        ...buildFilterParams(),
        page: 1,
        limit: 100000
      };

      const res = await adminApi.getEnterpriseSecurityLogs(params);
      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to fetch logs for export');
        return;
      }

      allLogs = res.data;



      if (allLogs.length === 0) {
        toast.error('No records found matching the applied filters');
        return;
      }

      const currentDateStr = format(new Date(), 'yyyy-MM-dd');

      if (type === 'csv') {
        const csvHeaders = [
          'Timestamp', 'User', 'Email', 'Role', 'Event', 'IP Address', 'Device',
          'Browser', 'Operating System', 'Status', 'Location', 'Session ID', 'Created At'
        ];

        const csvRows = allLogs.map((log: any) => {
          const ua = log.userAgent || '';
          let os = 'Unknown OS';
          if (ua.includes('Windows')) os = 'Windows';
          else if (ua.includes('Macintosh')) os = 'MacOS';
          else if (ua.includes('Linux')) os = 'Linux';
          else if (ua.includes('Android')) os = 'Android';
          else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

          let browser = 'Unknown Browser';
          if (ua.includes('Chrome')) browser = 'Chrome';
          else if (ua.includes('Safari')) browser = 'Safari';
          else if (ua.includes('Firefox')) browser = 'Firefox';
          else if (ua.includes('Edge')) browser = 'Edge';

          let device = 'Desktop';
          if (ua.includes('Mobi') || ua.includes('Android') || ua.includes('iPhone')) {
            device = 'Mobile';
          }

          const escape = (val: any) => {
            if (val === undefined || val === null) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };

          return [
            escape(new Date(log.createdAt).toISOString()),
            escape(log.userProfile?.name || 'Unknown User'),
            escape(log.email || log.userProfile?.email || ''),
            escape(log.userProfile?.role || ''),
            escape(log.event),
            escape(log.ipAddress || ''),
            escape(device),
            escape(browser),
            escape(os),
            escape(log.status),
            escape(log.details?.location || 'Remote'),
            escape(log.details?.sessionId || ''),
            escape(log.createdAt)
          ].join(',');
        });

        const csvContent = '\uFEFF' + [csvHeaders.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Security_Audit_Logs_${currentDateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV Export downloaded successfully!');
      } 
      else if (type === 'xlsx') {
        const excelData = allLogs.map((log: any) => {
          const ua = log.userAgent || '';
          let os = 'Unknown OS';
          if (ua.includes('Windows')) os = 'Windows';
          else if (ua.includes('Macintosh')) os = 'MacOS';
          else if (ua.includes('Linux')) os = 'Linux';
          else if (ua.includes('Android')) os = 'Android';
          else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

          let browser = 'Unknown Browser';
          if (ua.includes('Chrome')) browser = 'Chrome';
          else if (ua.includes('Safari')) browser = 'Safari';
          else if (ua.includes('Firefox')) browser = 'Firefox';
          else if (ua.includes('Edge')) browser = 'Edge';

          let device = 'Desktop';
          if (ua.includes('Mobi') || ua.includes('Android') || ua.includes('iPhone')) {
            device = 'Mobile';
          }

          return {
            'Timestamp': new Date(log.createdAt).toLocaleString(),
            'User': log.userProfile?.name || 'Unknown User',
            'Email': log.email || log.userProfile?.email || '',
            'Role': log.userProfile?.role || '',
            'Event': log.event,
            'IP Address': log.ipAddress || '',
            'Device': device,
            'Browser': browser,
            'Operating System': os,
            'Status': log.status,
            'Location': log.details?.location || 'Remote',
            'Session ID': log.details?.sessionId || '',
            'Created At': log.createdAt
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Security Logs');

        // Freeze top header row
        worksheet['!views'] = [
          { state: 'frozen', ySplit: 1, activePane: 'bottomLeft', paneState: 'frozen' }
        ];

        // Autofit Column Widths
        const maxColWidths = excelData.reduce((acc: any, row: any) => {
          Object.keys(row).forEach((key, colIdx) => {
            const val = row[key] ? String(row[key]) : '';
            const len = Math.max(val.length, key.length) + 2;
            acc[colIdx] = Math.max(acc[colIdx] || 10, len);
          });
          return acc;
        }, []);
        worksheet['!cols'] = maxColWidths.map((w: number) => ({ wch: w }));

        // Enable Auto Filters
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

        XLSX.writeFile(workbook, `Security_Audit_Logs_${currentDateStr}.xlsx`);
        toast.success('Excel Export downloaded successfully!');
      }
      else if (type === 'pdf') {
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
        const filenameDate = format(new Date(), 'yyyy-MM-dd_HH-mm');
        const adminName = useAuthStore.getState().email || currentAdminEmail;
        const organization = college;
        const title = 'Security Audit & Event Logs Report';

        // Title & Branding
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(34, 197, 94); // Green accent
        doc.text(title, 14, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175);
        doc.text(`Organization: ${organization}  |  Generated By: ${adminName}  |  Date: ${timestamp}`, 14, 21);

        // Applied Filters
        let filtersStr = 'Filters: ';
        const activeFilters = [];
        if (debouncedSearch) activeFilters.push(`Search: "${debouncedSearch}"`);
        if (statusFilter) activeFilters.push(`Status: ${statusFilter}`);
        if (eventFilter) activeFilters.push(`Event: ${eventFilter}`);
        if (fromDate) activeFilters.push(`From: ${fromDate}`);
        if (toDate) activeFilters.push(`To: ${toDate}`);
        if (roleFilter) activeFilters.push(`Role: ${roleFilter}`);
        if (departmentFilter) activeFilters.push(`Dept: ${departmentFilter}`);
        if (ipFilter) activeFilters.push(`IP: ${ipFilter}`);
        filtersStr += activeFilters.length > 0 ? activeFilters.join(', ') : 'None';

        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(filtersStr, 14, 26);

        const tableHeaders = [['Timestamp', 'User (Email)', 'Event', 'Status', 'IP Address', 'Location', 'Browser/OS', 'Session ID']];
        const tableRows = allLogs.map((log: any) => {
          const ua = log.userAgent || '';
          let os = 'Unknown OS';
          if (ua.includes('Windows')) os = 'Windows';
          else if (ua.includes('Macintosh')) os = 'MacOS';
          else if (ua.includes('Linux')) os = 'Linux';
          else if (ua.includes('Android')) os = 'Android';
          else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

          let browser = 'Unknown Browser';
          if (ua.includes('Chrome')) browser = 'Chrome';
          else if (ua.includes('Safari')) browser = 'Safari';
          else if (ua.includes('Firefox')) browser = 'Firefox';
          else if (ua.includes('Edge')) browser = 'Edge';

          const userVal = log.email || log.userProfile?.email || log.userId || 'N/A';
          const browserOS = `${browser} / ${os}`;
          
          return [
            new Date(log.createdAt).toLocaleString(),
            userVal,
            log.event,
            log.status,
            log.ipAddress || 'N/A',
            log.details?.location || 'Remote',
            browserOS,
            log.details?.sessionId || 'N/A'
          ];
        });

        autoTable(doc, {
          startY: 30,
          head: tableHeaders,
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7, textColor: [63, 63, 70] },
          alternateRowStyles: { fillColor: [244, 244, 245] },
          columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 15 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
            6: { cellWidth: 35 },
            7: { cellWidth: 50 }
          },
          didDrawPage: (data: any) => {
            const str = `Page ${doc.internal.getNumberOfPages()}`;
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(str, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
            doc.text(`${organization} Security Audit Report - Confidential`, 14, doc.internal.pageSize.height - 10);
          }
        });

        doc.save(`Security_Audit_Logs_${filenameDate}.pdf`);
        toast.success('PDF Report downloaded successfully!');
      }
    } catch (error: any) {
      console.error('Export Error details:', {
        message: error.message,
        stack: error.stack,
        format: type,
        datasetSize: allLogs?.length || 0,
        stage: 'Generation / Download'
      });
      toast.error(`Error generating ${type.toUpperCase()} file: ${error.message || 'Unknown error'}`);
    }
  };

  // Session duration calculator helper
  const calculateSessionDuration = (log: any) => {
    if (!log.createdAt) return 'N/A';
    // If login, look for a corresponding logout in the loaded logs
    const logoutLog = logs.find(l => l.details?.sessionId === log.details?.sessionId && l.event === 'logout');
    if (logoutLog) {
      const diff = new Date(logoutLog.createdAt).getTime() - new Date(log.createdAt).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 60) return `${minutes}m`;
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }
    return 'Active Session';
  };

  // Timeline computation
  const userTimelineEvents = useMemo(() => {
    if (!debouncedSearch) return [];
    // Sort chronological (oldest to newest)
    return [...logs]
      .filter(l => l.email === debouncedSearch || l.userId === debouncedSearch)
      .reverse();
  }, [logs, debouncedSearch]);

  const getFriendlyEventName = (ev: string) => {
    return ev.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#070709] pb-24 text-zinc-200 font-sans select-none relative overflow-x-hidden">
      
      {/* Entra ID styled glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(109,94,245,0.07),rgba(255,255,255,0))]" />
      <div className="absolute top-1/4 -left-12 h-[350px] w-[350px] rounded-full bg-violet-600/5 blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-zinc-900 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5.5 w-5.5 text-violet-400 animate-pulse" />
                <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Security Audit & Event Logs</h1>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Enterprise Access, Authentication, and Session Investigation Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              className="border-zinc-850 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 h-10 px-4 rounded-xl flex items-center gap-2 text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Synchronize Logs
            </Button>
            <span className="text-[10px] px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
              OKTA Shield Enabled
            </span>
          </div>
        </div>

        {/* Audit Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4.5 mb-8">
          {/* Card 1: Total Events */}
          <div className="glass-card p-5 border border-zinc-900 rounded-2xl flex flex-col justify-between bg-zinc-950/20 min-h-[120px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Security Events</span>
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-violet-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-white">{metricsLoading ? '...' : totalCount}</h3>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">Total filtered audit hits</p>
            </div>
          </div>

          {/* Card 2: Failed Logins */}
          <div className="glass-card p-5 border border-zinc-900 rounded-2xl flex flex-col justify-between bg-zinc-950/20 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Failed Logins</span>
              <div className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertOctagon className="h-4 w-4 text-red-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-white">{metricsLoading ? '...' : metrics?.totalFailedLogins}</h3>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">Brute force indicators</p>
            </div>
          </div>

          {/* Card 3: Active Sessions */}
          <div className="glass-card p-5 border border-zinc-900 rounded-2xl flex flex-col justify-between bg-zinc-950/20 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Active Sessions</span>
              <div className="h-7 w-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Monitor className="h-4 w-4 text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-white">{metricsLoading ? '...' : metrics?.activeSessions}</h3>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">Active tokens verified</p>
            </div>
          </div>

          {/* Card 4: Unique Logins */}
          <div className="glass-card p-5 border border-zinc-900 rounded-2xl flex flex-col justify-between bg-zinc-950/20 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">MFA Verification</span>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold text-white">{metricsLoading ? '...' : metrics?.otpRequestsRecent}</h3>
              <p className="text-[9px] text-zinc-500 font-medium mt-1">MFA & login validations</p>
            </div>
          </div>
        </div>

        {/* Global Smart Search & Presets Grid */}
        <div className="glass-card p-6 border border-zinc-900 rounded-2xl bg-zinc-950/30 mb-6 space-y-5">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search inputs */}
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Smart Search by user ID, roll number, email, IP address, session ID, device ID..."
                className="w-full bg-[#0D0D11] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-zinc-650 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all font-sans"
              />
            </div>

            {/* Date range selection */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <select
                value={datePreset}
                onChange={e => setDatePreset(e.target.value)}
                className="bg-[#0D0D11] border border-zinc-800 text-zinc-300 rounded-xl px-3 py-3 text-xs outline-none focus:ring-1 focus:ring-violet-500/30 font-medium shrink-0"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last-7-days">Last 7 Days</option>
                <option value="last-30-days">Last 30 Days</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="custom">Custom Date Range</option>
              </select>

              {datePreset === 'custom' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="bg-[#0D0D11] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                  <span className="text-zinc-650 text-xs">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="bg-[#0D0D11] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              )}

              {/* Advanced Filters Button */}
              <Button
                onClick={() => setShowFiltersDrawer(true)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-4 py-3 text-xs rounded-xl hover:bg-zinc-800 flex items-center gap-2"
              >
                <Filter className="h-3.5 w-3.5 text-violet-400" /> Filters
              </Button>

              {/* Export Button */}
              <div className="relative">
                <Button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="bg-violet-650 text-white px-4.5 py-3 text-xs rounded-xl hover:bg-violet-755 flex items-center gap-2 font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3" />
                </Button>

                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-[#0E0E12] border border-zinc-850 rounded-xl py-1.5 shadow-2xl z-50">
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-900 text-zinc-300 hover:text-white"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => handleExport('xlsx')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-900 text-zinc-300 hover:text-white"
                    >
                      Export as Excel
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-900 text-zinc-300 hover:text-white"
                    >
                      Generate PDF Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filters Panel */}
          <div className="border-t border-zinc-900/60 pt-4">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2.5">Investigative Quick Actions</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Today's Logins", action: 'today-logins' },
                { label: "Today's Logouts", action: 'today-logouts' },
                { label: 'Failed Logins', action: 'failed-logins' },
                { label: 'Successful Logins', action: 'success-logins' },
                { label: 'MFA Events', action: 'mfa-events' },
                { label: 'Suspicious Activity', action: 'suspicious' },
                { label: 'Locked Accounts', action: 'locked' },
                { label: 'New Registrations', action: 'new-registers' }
              ].map((qf, idx) => (
                <button
                  key={idx}
                  onClick={() => triggerQuickFilter(qf.action)}
                  className="px-3 py-1.5 bg-[#121217] border border-zinc-850 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-white rounded-lg font-medium transition-colors"
                >
                  {qf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Activity Chronological Timeline */}
        {debouncedSearch && userTimelineEvents.length > 0 && (
          <div className="glass-card p-6 border border-zinc-900 rounded-2xl bg-zinc-950/20 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-400" /> User Chronological Activity Timeline ({debouncedSearch})
            </h3>
            
            <div className="relative border-l border-zinc-900 ml-3 pl-6 space-y-4">
              {userTimelineEvents.map((event, idx) => {
                const isSuccess = event.status === 'success';
                return (
                  <div key={idx} className="relative">
                    <div className={`absolute -left-[30px] top-1.5 h-3 w-3 rounded-full border border-[#070709] ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div>
                        <span className="font-mono text-[10px] text-zinc-550 mr-3">{new Date(event.createdAt).toLocaleTimeString()}</span>
                        <span className="font-semibold text-white font-mono">{getFriendlyEventName(event.event)}</span>
                        <span className="text-zinc-450 ml-2">from IP {event.ipAddress}</span>
                      </div>
                      <span className={`text-[9px] uppercase font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Table & Results Grid */}
        <div className="glass-card border border-zinc-900 bg-zinc-950/40 rounded-2xl p-6 relative">
          
          <div className="flex items-center justify-between mb-4 text-xs text-zinc-500 font-medium">
            <span>Showing logs with status {statusFilter || 'All'}</span>
            <div className="flex items-center gap-2">
              <span>Records per page:</span>
              <select
                value={limit}
                onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-1.5 py-0.5"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {logsLoading ? (
            <div className="space-y-3 py-10">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="h-11 w-full bg-zinc-900/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-900 p-8">
              <ShieldCheck className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No Matching Security Records</h3>
              <p className="text-xs text-zinc-500 mt-1.5 max-w-sm mx-auto">No security audits matched the selected search keyword or filtering criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-950/60 sticky top-0 z-10 backdrop-blur-md">
                    <th 
                      onClick={() => { setSortField('createdAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="p-4 cursor-pointer hover:text-white transition-colors"
                    >
                      Timestamp {sortField === 'createdAt' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th 
                      onClick={() => { setSortField('userId'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="p-4 cursor-pointer hover:text-white transition-colors"
                    >
                      User / Subject {sortField === 'userId' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th 
                      onClick={() => { setSortField('role'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="p-4 cursor-pointer hover:text-white transition-colors"
                    >
                      Role {sortField === 'role' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th 
                      onClick={() => { setSortField('event'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="p-4 cursor-pointer hover:text-white transition-colors"
                    >
                      Event {sortField === 'event' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th 
                      onClick={() => { setSortField('status'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="p-4 cursor-pointer hover:text-white transition-colors"
                    >
                      Status {sortField === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th 
                      onClick={() => { setSortField('ipAddress'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="p-4 cursor-pointer hover:text-white transition-colors"
                    >
                      IP Address {sortField === 'ipAddress' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th 
                      onClick={() => { setSortField('userAgent'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                      className="p-4 cursor-pointer hover:text-white transition-colors"
                    >
                      Client Device {sortField === 'userAgent' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {logs.map((log, idx) => {
                    const isSuccess = log.status === 'success';
                    return (
                      <tr 
                        key={log._id || idx} 
                        className="hover:bg-zinc-900/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedSessionLog(log)}
                      >
                        <td className="p-4 text-[10px] text-zinc-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{log.userProfile?.name || log.email || 'System'}</span>
                            <span className="text-[10px] text-zinc-500 break-all">{log.email || log.userId}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] uppercase font-bold text-zinc-450">{log.userProfile?.role || 'system'}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                            {log.event}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-extrabold uppercase ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[10px] text-zinc-400">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="p-4 text-zinc-450 whitespace-nowrap">
                          {log.userAgent ? (log.userAgent.includes('Windows') ? 'Windows' : log.userAgent.includes('Mac') ? 'macOS' : 'Mobile') : 'Chrome'}
                        </td>
                        <td 
                          className="p-4 text-right text-violet-400 font-bold hover:text-violet-300 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setSelectedSessionLog(log); }}
                        >
                          Inspect
                        </td>
                      </tr>
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
                Page <strong className="text-zinc-300">{page}</strong> of <strong className="text-zinc-300">{totalPages}</strong> ({totalCount} entries)
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* FILTER DRAWER */}
      <AnimatePresence>
        {showFiltersDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFiltersDrawer(false)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#09090C] border-l border-zinc-900 p-6 z-50 shadow-2xl flex flex-col justify-between"
            >
              <div className="space-y-6 overflow-y-auto pr-1">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Filter className="h-4 w-4 text-violet-400" /> Advanced Filter Settings
                  </h3>
                  <button onClick={() => setShowFiltersDrawer(false)} className="text-zinc-500 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Filters Forms */}
                <div className="space-y-4">
                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Authentication Status</label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="success">Success</option>
                      <option value="failure">Failure</option>
                    </select>
                  </div>

                  {/* Security Event */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Security Event</label>
                    <select
                      value={eventFilter}
                      onChange={e => setEventFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    >
                      <option value="">All Events</option>
                      <option value="login_success">Login Success</option>
                      <option value="login_fail_password">Failed Login (Password)</option>
                      <option value="login_fail_no_user">Failed Login (User Not Found)</option>
                      <option value="mfa_initiated">MFA Initiated</option>
                      <option value="mfa_verify">MFA Verified</option>
                      <option value="logout">Logout</option>
                      <option value="password_reset_request_success">Password Reset Requested</option>
                      <option value="password_reset_complete">Password Reset Complete</option>
                      <option value="account_locked">Account Locked</option>
                      <option value="register_success">New Registration</option>
                    </select>
                  </div>

                  {/* Subject Role */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">User Role</label>
                    <select
                      value={roleFilter}
                      onChange={e => setRoleFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    >
                      <option value="">All Roles</option>
                      <option value="student">Student</option>
                      <option value="admin">Administrator</option>
                      <option value="alumni">Alumni</option>
                    </select>
                  </div>

                  {/* Academic Context */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Department / Branch</label>
                    <input
                      type="text"
                      placeholder="e.g. AIML, CSE"
                      value={departmentFilter}
                      onChange={e => setDepartmentFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  {/* Batch Year */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Graduation Batch</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026"
                      value={batchFilter}
                      onChange={e => setBatchFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  {/* IP Address */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">IP Filter</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1."
                      value={ipFilter}
                      onChange={e => setIpFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  {/* Device Type */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Device Type</label>
                    <select
                      value={deviceFilter}
                      onChange={e => setDeviceFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    >
                      <option value="">All Devices</option>
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile / Tablet</option>
                    </select>
                  </div>

                  {/* Browser */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Browser</label>
                    <input
                      type="text"
                      placeholder="e.g. Chrome, Safari"
                      value={browserFilter}
                      onChange={e => setBrowserFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  {/* Operating System */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Operating System</label>
                    <input
                      type="text"
                      placeholder="e.g. Windows, macOS"
                      value={osFilter}
                      onChange={e => setOsFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Remote, India"
                      value={locationFilter}
                      onChange={e => setLocationFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  {/* Authentication Method */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Authentication Method</label>
                    <select
                      value={authMethodFilter}
                      onChange={e => setAuthMethodFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    >
                      <option value="">All Methods</option>
                      <option value="password">Password</option>
                      <option value="mfa">Email MFA</option>
                      <option value="captcha">CAPTCHA Challenge</option>
                    </select>
                  </div>

                  {/* MFA Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">MFA Setup Status</label>
                    <select
                      value={mfaStatusFilter}
                      onChange={e => setMfaStatusFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    >
                      <option value="">All States</option>
                      <option value="enabled">MFA Enabled</option>
                      <option value="disabled">MFA Disabled</option>
                    </select>
                  </div>

                  {/* Account Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Account Lock Status</label>
                    <select
                      value={accountStatusFilter}
                      onChange={e => setAccountStatusFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2 text-xs outline-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active (Unlocked)</option>
                      <option value="locked">Temporarily Locked</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex gap-2">
                <Button
                  onClick={() => {
                    setStatusFilter('');
                    setEventFilter('');
                    setRoleFilter('');
                    setDepartmentFilter('');
                    setBranchFilter('');
                    setBatchFilter('');
                    setIpFilter('');
                    setDeviceFilter('');
                    setBrowserFilter('');
                    setOsFilter('');
                    setLocationFilter('');
                    setAuthMethodFilter('');
                    setMfaStatusFilter('');
                    setAccountStatusFilter('');
                    toast.success('Filters cleared! 🧹');
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 rounded-xl py-2 text-xs font-semibold"
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={() => setShowFiltersDrawer(false)}
                  className="flex-1 bg-violet-650 hover:bg-violet-755 text-white rounded-xl py-2 text-xs font-semibold"
                >
                  Apply Filters
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SESSION INSPECTOR MODAL */}
      <AnimatePresence>
        {selectedSessionLog && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSessionLog(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto max-h-[580px] w-full max-w-lg bg-[#09090C] border border-zinc-850 p-6 rounded-2xl z-50 shadow-2xl overflow-y-auto space-y-5"
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                <div className="flex items-center gap-2 text-zinc-300 font-bold text-sm">
                  <ShieldCheck className="h-4.5 w-4.5 text-violet-400" />
                  <span>Audit Session details</span>
                </div>
                <button onClick={() => setSelectedSessionLog(null)} className="text-zinc-550 hover:text-white">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Session Meta */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-zinc-550 block">Subject Context</span>
                  <span className="font-semibold text-white block mt-0.5">{selectedSessionLog.userProfile?.name || 'System Operator'}</span>
                  <span className="text-[10px] text-zinc-450 block break-all">{selectedSessionLog.email}</span>
                </div>

                <div className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-zinc-550 block">Session ID</span>
                  <span className="font-mono text-[10px] text-violet-400 block mt-0.5 break-all">
                    {selectedSessionLog.details?.sessionId || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Specifications List */}
              <div className="bg-zinc-950 border border-zinc-900 p-4.5 rounded-xl space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500 font-medium">Activity Type</span>
                  <span className="font-mono text-zinc-300 font-semibold uppercase">{selectedSessionLog.event}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500 font-medium">Timestamp</span>
                  <span className="text-zinc-300">{new Date(selectedSessionLog.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500 font-medium">IP Address</span>
                  <span className="text-zinc-300 font-mono">{selectedSessionLog.ipAddress || '127.0.0.1'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500 font-medium">Session Status</span>
                  <span className={`font-bold uppercase text-[10px] ${selectedSessionLog.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedSessionLog.status}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500 font-medium">Session Duration</span>
                  <span className="text-zinc-350">{calculateSessionDuration(selectedSessionLog)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500 font-medium">MFA Verified</span>
                  <span className="text-zinc-300">{selectedSessionLog.userProfile?.mfaEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500 font-medium">Department context</span>
                  <span className="text-zinc-300 font-semibold">{selectedSessionLog.userProfile?.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Browser / Agent</span>
                  <span className="text-zinc-350 text-[10px] max-w-[280px] break-words text-right">
                    {selectedSessionLog.userAgent || 'Chrome Client'}
                  </span>
                </div>
              </div>

              {selectedSessionLog.details && Object.keys(selectedSessionLog.details).length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Extended payload JSON</span>
                  <pre className="text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-zinc-900 font-mono text-[9px] overflow-x-auto max-h-[140px] scrollbar-thin">
                    {JSON.stringify(selectedSessionLog.details, null, 2)}
                  </pre>
                </div>
              )}

              <Button
                onClick={() => setSelectedSessionLog(null)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-zinc-800"
              >
                Close Investigator
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
