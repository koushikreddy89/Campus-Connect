import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Plus, Briefcase, MapPin, DollarSign, 
  Calendar, CheckCircle, Shield, X, Trash2, ArrowUpDown, 
  ChevronRight, ExternalLink, Mail, UserCheck, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { placementService, PlacementOpportunity } from '@/services/placementService';

const COMMON_DEPARTMENTS = [
  'CSE (Core)', 'AIML', 'Data Science', 'IT', 'ECE', 'EEE', 'Civil', 'Mechanical', 'MBA', 'MCA'
];

const PRESET_LOGOS = [
  { name: 'Google', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg' },
  { name: 'Microsoft', url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' },
  { name: 'Meta', url: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg' },
  { name: 'Amazon', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
  { name: 'Netflix', url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
  { name: 'Apple', url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
  { name: 'Uber', url: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.svg' },
  { name: 'Stripe', url: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_blue.svg' }
];

export default function PlacementsDashboard() {
  const navigate = useNavigate();
  const role = useAuthStore(s => s.role);
  const college = useAuthStore(s => s.college) || 'SR University';
  const userId = useAuthStore(s => s.uid);
  const profile = useProfileStore(s => s.profile);

  const [activeTab, setActiveTab] = useState<'admin' | 'alumni'>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementOpportunity | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for creating placement
  const [companyName, setCompanyName] = useState('');
  const [selectedLogo, setSelectedLogo] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [employmentType, setEmploymentType] = useState<'Internship' | 'Full Time' | 'Internship + PPO' | 'Contract'>('Full Time');
  const [packageStr, setPackageStr] = useState('');
  const [packageVal, setPackageVal] = useState(0);
  const [location, setLocation] = useState('Remote');
  const [expiryDate, setExpiryDate] = useState('');
  const [description, setDescription] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [minimumCGPA, setMinimumCGPA] = useState(0);
  const [maximumBacklogs, setMaximumBacklogs] = useState(0);
  const [applyLink, setApplyLink] = useState('');
  const [contactAlumni, setContactAlumni] = useState('');

  // Eligibility criteria multi-select
  const [eligibleYears, setEligibleYears] = useState<string[]>([]);
  const [eligibleDepartments, setEligibleDepartments] = useState<string[]>([]);
  const [eligibleBatches, setEligibleBatches] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Placements via react-query (separate endpoints for Official and Referrals)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['placements', college, activeTab, searchQuery, selectedFilters.join(',')],
    queryFn: () => {
      const params = {
        search: searchQuery || undefined,
        filters: selectedFilters.length > 0 ? selectedFilters.join(',') : undefined
      };
      return activeTab === 'admin'
        ? placementService.getOfficialPlacements(params)
        : placementService.getAlumniReferrals(params);
    },
    staleTime: 3000
  });

  const placements = useMemo(() => data?.data || [], [data]);

  const handleFilterToggle = (filterName: string) => {
    // Mutual exclusivity for sorting filters
    if (['Newest', 'Closing Soon', 'High Package', 'Oldest'].includes(filterName)) {
      setSelectedFilters(prev => {
        const cleaned = prev.filter(f => !['Newest', 'Closing Soon', 'High Package', 'Oldest'].includes(f));
        return prev.includes(filterName) ? cleaned : [...cleaned, filterName];
      });
    } else {
      setSelectedFilters(prev => 
        prev.includes(filterName) ? prev.filter(f => f !== filterName) : [...prev, filterName]
      );
    }
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
    setSearchQuery('');
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !jobRole.trim() || !expiryDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalLogo = selectedLogo === 'custom' ? customLogoUrl : selectedLogo;
      
      const payload: Partial<PlacementOpportunity> = {
        companyName: companyName.trim(),
        companyLogo: finalLogo || '',
        jobRole: jobRole.trim(),
        employmentType,
        package: packageStr.trim(),
        packageVal: packageVal || parseFloat(packageStr) || 0,
        location,
        expiryDate,
        description: description.trim(),
        eligibility: eligibility.trim(),
        eligibleYears,
        eligibleDepartments: eligibleDepartments.includes('All Departments') ? ['All Departments'] : eligibleDepartments,
        minimumCGPA: Number(minimumCGPA),
        maximumBacklogs: Number(maximumBacklogs),
        eligibleBatches: eligibleBatches.length > 0 ? eligibleBatches : [new Date().getFullYear().toString(), (new Date().getFullYear() + 1).toString()],
        contactAlumni: role === 'alumni' ? (contactAlumni.trim() || profile.personalEmail || '') : '',
        applyLink: applyLink.trim(),
        college
      };

      await placementService.createPlacement(payload);
      toast.success('Placement opportunity posted successfully! 🚀');
      refetch();
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to post opportunity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlacement = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this placement opportunity?')) return;
    try {
      await placementService.deletePlacement(id);
      toast.success('Opportunity deleted');
      refetch();
      if (selectedPlacement?.id === id || selectedPlacement?._id === id) {
        setSelectedPlacement(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setSelectedLogo('');
    setCustomLogoUrl('');
    setJobRole('');
    setEmploymentType('Full Time');
    setPackageStr('');
    setPackageVal(0);
    setLocation('Remote');
    setExpiryDate('');
    setDescription('');
    setEligibility('');
    setMinimumCGPA(0);
    setMaximumBacklogs(0);
    setApplyLink('');
    setEligibleYears([]);
    setEligibleDepartments([]);
    setEligibleBatches([]);
    setContactAlumni('');
  };

  const renderLogo = (logoUrl: string, companyName: string, size = 'h-10 w-10 text-sm') => {
    if (logoUrl) {
      return (
        <img 
          src={logoUrl} 
          alt={companyName} 
          className={`${size} rounded-xl object-contain bg-white/5 p-1 border border-white/10`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = ''; // Clear source to fallback
          }}
        />
      );
    }
    const initials = companyName.substring(0, 2).toUpperCase();
    const colors = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600'];
    const colorIndex = companyName.charCodeAt(0) % colors.length;
    return (
      <div className={`${size} rounded-xl ${colors[colorIndex]} flex items-center justify-center font-bold text-white tracking-wider border border-white/10 shadow-inner`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="w-full space-y-5 animate-fade-in pb-16">
      {/* Redesigned Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Briefcase className="w-5 h-5 text-blue-400" />
            Careers & Placements
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict eligibility matching engine powered by MongoDB
          </p>
        </div>

        {/* Post Button (Visible only to Admin or Alumni) */}
        {(role === 'admin' || role === 'alumni') && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Post Opportunity
          </button>
        )}
      </div>

      {/* Tabs Selector with instant Framer Motion slider */}
      <div className="relative bg-slate-950/45 p-1.5 rounded-2xl border border-white/5 flex gap-1.5">
        {(['admin', 'alumni'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative z-10 flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors ${
              activeTab === tab ? 'text-white' : 'text-muted-foreground hover:text-white'
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="placements-active-bg"
                className="absolute inset-0 bg-blue-500/20 border border-blue-500/30 rounded-xl"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            <span className="capitalize">{tab === 'admin' ? 'Official Placement drives' : 'Alumni Referrals'}</span>
          </button>
        ))}
      </div>

      {/* Search and filter controls */}
      <div className="space-y-3.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={activeTab === 'admin' ? "Search by company name, job role, location..." : "Search by company, role, location, alumni..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
              showFilters || selectedFilters.length > 0
                ? 'bg-blue-500/20 border-blue-500/30 text-white' 
                : 'bg-slate-900/60 border-white/5 text-muted-foreground hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Drawer / Expandable Area */}
        <AnimatePresence>
          {(showFilters || selectedFilters.length > 0) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-slate-950/20 rounded-xl border border-white/5 p-3.5 space-y-3"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Filter Options</span>
                {selectedFilters.length > 0 && (
                  <button 
                    onClick={handleClearFilters}
                    className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {/* Job Types */}
                {['Internship', 'Full Time', 'Internship + PPO', 'Contract'].map(f => (
                  <button
                    key={f}
                    onClick={() => handleFilterToggle(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                      selectedFilters.includes(f)
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-slate-900/40 border-white/5 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}

                {/* Workplace */}
                {['Remote', 'Hybrid', 'Onsite'].map(f => (
                  <button
                    key={f}
                    onClick={() => handleFilterToggle(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                      selectedFilters.includes(f)
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-slate-900/40 border-white/5 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}

                {/* Custom Filters */}
                {activeTab === 'alumni' && (
                  <button
                    onClick={() => handleFilterToggle('Referral Available')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                      selectedFilters.includes('Referral Available')
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-slate-900/40 border-white/5 text-muted-foreground hover:text-white'
                    }`}
                  >
                    Referral Available
                  </button>
                )}

                {role === 'student' && (
                  <button
                    onClick={() => handleFilterToggle('Eligible Only')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                      selectedFilters.includes('Eligible Only')
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-slate-900/40 border-white/5 text-muted-foreground hover:text-white'
                    }`}
                  >
                    Eligible Only
                  </button>
                )}
              </div>
 
              {/* Sorting Filters */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <span className="text-[10px] text-muted-foreground font-semibold">Sort By:</span>
                <div className="flex gap-1.5">
                  {['Newest', 'Oldest', 'Closing Soon', 'High Package'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleFilterToggle(s)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all border ${
                        selectedFilters.includes(s)
                          ? 'bg-violet-500 border-violet-500 text-white'
                          : 'bg-slate-900/40 border-white/5 text-muted-foreground hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Placement Card List */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse flex items-center justify-between border border-white/5 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-white/5 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-white/5 rounded" />
                  <div className="h-3 w-48 bg-white/5 rounded" />
                </div>
              </div>
              <div className="h-8 w-20 bg-white/5 rounded-xl" />
            </div>
          ))
        ) : error ? (
          <div className="py-12 text-center rounded-2xl border border-white/5 bg-red-950/10 p-6">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">
              {error instanceof Error && (error.message.includes('expired') || error.message.includes('Session') || error.message.includes('token') || error.message.includes('401')) ? 'Session Expired' : 
               error instanceof Error && (error.message.includes('privileges') || error.message.includes('denied') || error.message.includes('403')) ? 'Permission Denied' : 
               'Unable to load placement data.'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {error instanceof Error && (error.message.includes('expired') || error.message.includes('Session') || error.message.includes('token') || error.message.includes('401')) ? 'Please sign in again.' : 
               error instanceof Error && (error.message.includes('privileges') || error.message.includes('denied') || error.message.includes('403')) ? 'You do not have permission to access this page.' : 
               'Please try again later.'}
            </p>
          </div>
        ) : placements.length === 0 ? (
          // Redesigned Empty States
          <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-slate-950/20 p-6">
            <Briefcase className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white">No Matching Placements</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto leading-relaxed">
              {role === 'student' 
                ? "No active placements found that match your CGPA, Backlogs, or Department criteria."
                : "No placement opportunities posted in this tab yet."}
            </p>
          </div>
        ) : (
          // Grid/List of Placement Opportunities
          // Grid/List of Placement Opportunities
          <div className="grid grid-cols-1 gap-6">
            {placements.map((placement: PlacementOpportunity) => {
              const daysLeft = Math.ceil((new Date(placement.expiryDate || placement.registrationDeadline || '').getTime() - Date.now()) / (1000 * 3600 * 24));
              const isClosingSoon = daysLeft > 0 && daysLeft <= 3;
              const isExpired = daysLeft <= 0;

              const resolvedCompany = placement.company || placement.companyName || '';
              const resolvedRole = placement.role || placement.jobRole || '';
              const resolvedSalary = placement.salary || placement.package || 'Not Specified';
              const resolvedBranches = placement.branches && placement.branches.length > 0 ? placement.branches : (placement.eligibleDepartments || []);
              const resolvedBatches = placement.batches && placement.batches.length > 0 ? placement.batches : (placement.eligibleBatches || []);
              const resolvedCGPA = placement.minCGPA !== undefined ? placement.minCGPA : (placement.minimumCGPA || 0.0);
              const resolvedBacklogs = placement.maxBacklogs !== undefined ? placement.maxBacklogs : (placement.maximumBacklogs || 0);

              return (
                <motion.div
                  layoutId={`placement-card-${placement._id || placement.id}`}
                  key={placement._id || placement.id}
                  onClick={() => navigate(`/placement/${placement._id || placement.id}`)}
                  className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121826] p-6 shadow-xl transition-all duration-300 hover:border-[#6D5EF5]/30 hover:shadow-2xl hover:shadow-[#6D5EF5]/5 cursor-pointer"
                  whileHover={{ y: -4 }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* LEFT SECTION */}
                    <div className="flex items-start gap-4.5 lg:max-w-[35%]">
                      {renderLogo(placement.companyLogo, resolvedCompany, 'h-16 w-16 text-2xl')}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-extrabold text-white tracking-tight leading-snug group-hover:text-[#6D5EF5] transition-colors">
                            {resolvedRole}
                          </h3>
                          {placement.createdByRole === 'ADMIN' || placement.placementType === 'OFFICIAL' ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                              <Shield className="w-2.5 h-2.5" />
                              Official
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                              <UserCheck className="w-2.5 h-2.5" />
                              Referral
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-300">{resolvedCompany}</p>
                        
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {placement.location}
                          </span>
                          <span>•</span>
                          <span>{placement.employmentType}</span>
                          <span>•</span>
                          <span>{placement.workMode || 'Onsite'}</span>
                        </div>
                      </div>
                    </div>

                    {/* CENTER SECTION */}
                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6 border-t border-b border-white/[0.04] lg:border-t-0 lg:border-b-0 py-4 lg:py-0">
                      {/* Package/Salary */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block">Estimated Package</span>
                        <div className="text-2xl font-black text-[#16C784] tracking-tight">
                          {resolvedSalary}
                        </div>
                      </div>

                      {/* Eligibility Chips */}
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {resolvedBranches.slice(0, 2).map((b) => (
                          <span key={b} className="px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[10px] font-bold text-slate-300 uppercase">
                            {b}
                          </span>
                        ))}
                        {resolvedBranches.length > 2 && (
                          <span className="px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[10px] font-bold text-slate-400">
                            +{resolvedBranches.length - 2} more
                          </span>
                        )}
                        {resolvedBatches.map((b) => (
                          <span key={b} className="px-2.5 py-1 rounded-xl bg-[#6D5EF5]/10 border border-[#6D5EF5]/20 text-[10px] font-bold text-[#6D5EF5] uppercase">
                            {b}
                          </span>
                        ))}
                        <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400">
                          CGPA {resolvedCGPA}+
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400">
                          {resolvedBacklogs === 0 ? 'No Backlogs' : `Max Backlogs: ${resolvedBacklogs}`}
                        </span>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${isClosingSoon ? 'bg-[#FFB020]/10 border-[#FFB020]/20 text-[#FFB020]' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                          {isExpired ? 'Expired' : `${daysLeft} days left`}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT SECTION */}
                    <div className="flex items-center lg:flex-col lg:items-end justify-between lg:justify-center gap-3">
                      {/* Eligibility Badge */}
                      {role === 'student' && (
                        <div className="flex flex-col lg:items-end gap-1.5 w-full max-w-[200px]">
                          {placement.isEligible === false ? (
                            <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-[#F04438]/10 text-[#F04438] border border-[#F04438]/20 uppercase tracking-wide inline-block text-center w-fit">
                              Not Eligible
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-[#16C784]/10 text-[#16C784] border border-[#16C784]/20 uppercase tracking-wide inline-block text-center w-fit">
                              Eligible
                            </span>
                          )}
                          {placement.eligibilityChecks && (
                            <div className="text-[10px] bg-slate-950/60 backdrop-blur-md border border-white/[0.06] rounded-xl p-2.5 space-y-1 w-full text-left shadow-xl">
                              {/* CGPA */}
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">CGPA</span>
                                {!placement.eligibilityChecks.cgpa ? (
                                  <span className="font-extrabold text-[#F04438] bg-[#F04438]/10 px-1 rounded">
                                    {placement.eligibilityDetails?.cgpa.student} &lt; {placement.eligibilityDetails?.cgpa.required} ❌
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-semibold">
                                    {placement.eligibilityDetails?.cgpa.student} ✅
                                  </span>
                                )}
                              </div>
                              {/* Dept */}
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Dept</span>
                                {!placement.eligibilityChecks.department ? (
                                  <span className="font-extrabold text-[#F04438] bg-[#F04438]/10 px-1 rounded max-w-[100px] truncate" title={placement.eligibilityDetails?.department.student}>
                                    {placement.eligibilityDetails?.department.student || 'None'} ❌
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-semibold truncate max-w-[100px]" title={placement.eligibilityDetails?.department.student}>
                                    {placement.eligibilityDetails?.department.student} ✅
                                  </span>
                                )}
                              </div>
                              {/* Batch */}
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Batch</span>
                                {!placement.eligibilityChecks.batch ? (
                                  <span className="font-extrabold text-[#F04438] bg-[#F04438]/10 px-1 rounded">
                                    {placement.eligibilityDetails?.batch.student || 'None'} ❌
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-semibold">
                                    {placement.eligibilityDetails?.batch.student} ✅
                                  </span>
                                )}
                              </div>
                              {/* Backlogs */}
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Backlogs</span>
                                {!placement.eligibilityChecks.backlogs ? (
                                  <span className="font-extrabold text-[#F04438] bg-[#F04438]/10 px-1 rounded">
                                    {placement.eligibilityDetails?.backlogs.student} &gt; {placement.eligibilityDetails?.backlogs.allowed} ❌
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-semibold">
                                    {placement.eligibilityDetails?.backlogs.student} ✅
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          className="px-5 py-2.5 rounded-2xl bg-[#6D5EF5] hover:bg-[#6D5EF5]/90 text-white text-xs font-bold transition-all shadow-lg shadow-[#6D5EF5]/20 group-hover:scale-[1.02]"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/placement/${placement._id || placement.id}`);
                          }}
                        >
                          View Details
                        </button>
                        
                        {(role === 'admin' || userId === placement.createdBy) && (
                          <button
                            onClick={(e) => handleDeletePlacement(placement._id || placement.id || '', e)}
                            className="p-2.5 rounded-2xl border border-white/5 bg-white/5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Slide-up Drawer/Modal (Simplified fallback) */}
      <AnimatePresence>
        {selectedPlacement && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-white/10 rounded-t-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl p-5"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  {renderLogo(selectedPlacement.companyLogo, selectedPlacement.companyName, 'h-12 w-12 text-lg')}
                  <div>
                    <h3 className="font-bold text-white text-base">{selectedPlacement.jobRole}</h3>
                    <p className="text-xs text-muted-foreground">{selectedPlacement.companyName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPlacement(null)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-slate-300 text-xs">
                {/* Details list */}
                <div className="grid grid-cols-2 gap-3.5 bg-slate-950/40 border border-white/5 p-3.5 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Employment Type</span>
                    <span className="font-bold text-white text-xs">{selectedPlacement.employmentType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Location</span>
                    <span className="font-bold text-white text-xs">{selectedPlacement.location}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Stipend / Package</span>
                    <span className="font-bold text-white text-xs">{selectedPlacement.package || 'Not Specified'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Last Date to Apply</span>
                    <span className="font-bold text-red-400 text-xs">
                      {new Date(selectedPlacement.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Eligibility Engine matching result */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-2xl flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-xs">Eligible Candidate</h4>
                    <p className="text-[10px] text-blue-400/90 mt-0.5 font-medium">
                      You passed the strict eligibility checks for department, CGPA, and backlogs.
                    </p>
                  </div>
                </div>

                {/* Structured Eligibility Parameters */}
                <div>
                  <h4 className="font-bold text-white mb-2 uppercase text-[10px] tracking-wider">Eligibility Criteria</h4>
                  <div className="space-y-1.5 bg-slate-950/20 p-3 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Academic Year</span>
                      <span className="font-semibold text-white">
                        {selectedPlacement.eligibleYears.length > 0 ? selectedPlacement.eligibleYears.join(', ') : 'All Years'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-semibold text-white">
                        {selectedPlacement.eligibleDepartments.length > 0 ? selectedPlacement.eligibleDepartments.join(', ') : 'All Departments'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Minimum CGPA</span>
                      <span className="font-semibold text-white">
                        {selectedPlacement.minimumCGPA > 0 ? selectedPlacement.minimumCGPA : 'No Limit'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Maximum Active Backlogs</span>
                      <span className="font-semibold text-white">
                        {selectedPlacement.maximumBacklogs !== undefined ? selectedPlacement.maximumBacklogs : 'No Limit'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Batch</span>
                      <span className="font-semibold text-white">
                        {selectedPlacement.eligibleBatches.length > 0 ? selectedPlacement.eligibleBatches.join(', ') : 'Any'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plain text description & eligibility */}
                {selectedPlacement.description && (
                  <div>
                    <h4 className="font-bold text-white mb-1.5 uppercase text-[10px] tracking-wider">Job Description</h4>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-[11px]">
                      {selectedPlacement.description}
                    </p>
                  </div>
                )}

                {selectedPlacement.eligibility && (
                  <div>
                    <h4 className="font-bold text-white mb-1.5 uppercase text-[10px] tracking-wider">Additional Requirements</h4>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {selectedPlacement.eligibility}
                    </p>
                  </div>
                )}

                {/* Alumni Contact info (for referrals) */}
                {selectedPlacement.createdByRole === 'Alumni' && (
                  <div className="p-3.5 bg-violet-500/10 border border-violet-500/20 rounded-2xl space-y-2">
                    <span className="text-[10px] text-violet-400 block uppercase font-bold">Posted by Alumni</span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{selectedPlacement.createdByName}</span>
                      {selectedPlacement.contactAlumni && (
                        <a 
                          href={`mailto:${selectedPlacement.contactAlumni}`} 
                          className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 font-bold border border-violet-500/35 rounded-lg px-2.5 py-1"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email Alumni
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Apply / Action Area */}
              <div className="pt-4 border-t border-white/5 flex gap-2.5">
                {selectedPlacement.applyLink ? (
                  <a
                    href={selectedPlacement.applyLink.startsWith('http') ? selectedPlacement.applyLink : `https://${selectedPlacement.applyLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-blue-500/15"
                  >
                    Apply Now
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button className="flex-1 h-11 bg-white/5 border border-white/10 text-muted-foreground rounded-xl text-xs font-bold cursor-not-allowed">
                    No Direct Application Link
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Opportunity Form Dialog (modal) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <div>
                  <h3 className="font-bold text-white text-base">Post Placement Opportunity</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Define job information and eligibility parameters</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePlacement} className="space-y-3.5 text-xs text-slate-300">
                {/* 1. Job details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block uppercase font-bold">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Google"
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block uppercase font-bold">Job Role / Title *</label>
                    <input
                      type="text"
                      required
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      placeholder="e.g. Software Engineer"
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Company Logo Presets or Custom URL */}
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground block uppercase font-bold">Company Logo</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {PRESET_LOGOS.map((logo) => (
                      <button
                        key={logo.name}
                        type="button"
                        onClick={() => {
                          setSelectedLogo(logo.url);
                          setCustomLogoUrl('');
                        }}
                        className={`h-7.5 px-2.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 transition-all ${
                          selectedLogo === logo.url
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'bg-slate-950 border-white/5 text-muted-foreground hover:text-white'
                        }`}
                      >
                        <img src={logo.url} alt={logo.name} className="w-3.5 h-3.5 object-contain" />
                        {logo.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLogo('custom');
                      }}
                      className={`h-7.5 px-2.5 rounded-lg border text-[10px] font-semibold transition-all ${
                        selectedLogo === 'custom'
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-slate-950 border-white/5 text-muted-foreground hover:text-white'
                      }`}
                    >
                      Custom Logo URL
                    </button>
                  </div>

                  {selectedLogo === 'custom' && (
                    <input
                      type="text"
                      value={customLogoUrl}
                      onChange={(e) => setCustomLogoUrl(e.target.value)}
                      placeholder="Enter logo image URL"
                      className="w-full mt-2 bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                    />
                  )}
                </div>

                {/* Job Types and Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block uppercase font-bold">Employment Type *</label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as any)}
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                    >
                      <option value="Full Time">Full Time</option>
                      <option value="Internship">Internship</option>
                      <option value="Internship + PPO">Internship + PPO</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block uppercase font-bold">Location *</label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Remote / Hybrid / Seattle, WA"
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Stipend / Package and Expiry Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block uppercase font-bold">Stipend / Package *</label>
                    <input
                      type="text"
                      required
                      value={packageStr}
                      onChange={(e) => setPackageStr(e.target.value)}
                      placeholder="e.g. 15 LPA / $50k/mo"
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block uppercase font-bold">Last Date to Apply *</label>
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Structured Eligibility Configurator */}
                <div className="border border-white/5 rounded-xl p-3 bg-slate-950/30 space-y-3">
                  <span className="text-[10px] text-blue-400 block uppercase font-bold">Eligibility Constraints Engine</span>

                  {/* CGPA and backlogs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground block uppercase font-bold">Min CGPA</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={minimumCGPA}
                        onChange={(e) => setMinimumCGPA(Number(e.target.value))}
                        className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground block uppercase font-bold">Max Backlogs Allowed</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={maximumBacklogs}
                        onChange={(e) => setMaximumBacklogs(Number(e.target.value))}
                        className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Year selector checkboxes */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-muted-foreground block uppercase font-bold">Eligible Years</label>
                    <div className="flex gap-3">
                      {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((year) => (
                        <label key={year} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={eligibleYears.includes(year)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEligibleYears(prev => [...prev, year]);
                              } else {
                                setEligibleYears(prev => prev.filter(y => y !== year));
                              }
                            }}
                            className="accent-blue-500 rounded border-white/10"
                          />
                          {year}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Departments Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-muted-foreground block uppercase font-bold">Target Departments</label>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-1.5 text-[10px] cursor-pointer bg-slate-950/40 px-2 py-1 rounded-lg border border-white/5">
                        <input
                          type="checkbox"
                          checked={eligibleDepartments.includes('All Departments')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEligibleDepartments(['All Departments']);
                            } else {
                              setEligibleDepartments([]);
                            }
                          }}
                          className="accent-blue-500"
                        />
                        All Departments
                      </label>
                      
                      {!eligibleDepartments.includes('All Departments') && COMMON_DEPARTMENTS.map((dept) => (
                        <label key={dept} className="flex items-center gap-1.5 text-[10px] cursor-pointer bg-slate-950/40 px-2 py-1 rounded-lg border border-white/5">
                          <input
                            type="checkbox"
                            checked={eligibleDepartments.includes(dept)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEligibleDepartments(prev => [...prev, dept]);
                              } else {
                                setEligibleDepartments(prev => prev.filter(d => d !== dept));
                              }
                            }}
                            className="accent-blue-500"
                          />
                          {dept}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description and application link */}
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground block uppercase font-bold">Job Description</label>
                  <textarea
                    rows={2.5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter job description, duties, etc."
                    className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block uppercase font-bold">Application Link / URL *</label>
                    <input
                      type="text"
                      required
                      value={applyLink}
                      onChange={(e) => setApplyLink(e.target.value)}
                      placeholder="e.g. google.com/careers"
                      className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  {role === 'alumni' && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground block uppercase font-bold">Contact Email / LinkedIn (Optional)</label>
                      <input
                        type="text"
                        value={contactAlumni}
                        onChange={(e) => setContactAlumni(e.target.value)}
                        placeholder="e.g. personal@alumni.com"
                        className="w-full bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Submit buttons */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4.5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4.5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Drive'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
