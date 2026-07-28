import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, Briefcase, MapPin, DollarSign, Calendar, 
  CheckCircle, AlertCircle, Shield, UserCheck, Share2, 
  Bookmark, ExternalLink, Mail, Award, Clock, FileText, Check,
  XCircle, CheckCircle2, ChevronRight, HelpCircle, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { placementService } from '@/services/placementService';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect } from 'react';
import { useAnnouncementStore } from '@/store/announcementStore';

export default function PlacementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore(s => s.role);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const trackView = useAnnouncementStore(s => s.trackView);
  const trackClick = useAnnouncementStore(s => s.trackClick);

  useEffect(() => {
    if (id && role !== 'admin') {
      trackView(id);
    }
  }, [id, role, trackView]);

  const { data: placement, isLoading, error } = useQuery({
    queryKey: ['placement', id],
    queryFn: () => placementService.getPlacementDetails(id || ''),
    enabled: !!id
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${placement?.company || placement?.companyName} - ${placement?.role || placement?.jobRole}`,
        text: `Check out this placement opportunity for ${placement?.role || placement?.jobRole} at ${placement?.company || placement?.companyName}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard! 📋');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-3 py-20 text-slate-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6D5EF5]" />
        <span className="text-xs text-[#6D5EF5]">Loading placement details...</span>
      </div>
    );
  }

  if (error || !placement) {
    const errorMsg = error instanceof Error ? error.message : '';
    return (
      <div className="min-h-screen bg-[#0B0F19] px-5 py-12 text-center flex flex-col justify-center items-center">
        <div className="max-w-md bg-[#F04438]/10 border border-[#F04438]/20 rounded-3xl p-8 space-y-4">
          <AlertCircle className="w-12 h-12 text-[#F04438] mx-auto" />
          <h2 className="text-xl font-extrabold text-white">Placement Not Found</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {errorMsg || "The placement opportunity details could not be loaded. It might have been archived or removed by the administrator."}
          </p>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-2xl bg-[#6D5EF5] hover:bg-[#6D5EF5]/90 text-white text-xs font-bold transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const renderLogo = (logoUrl?: string, companyName?: string, size = 'h-20 w-20 text-3xl') => {
    if (logoUrl) {
      return (
        <img 
          src={logoUrl} 
          alt={companyName} 
          className={`${size} rounded-3xl object-contain bg-white/5 p-3 border border-white/10`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '';
          }}
        />
      );
    }
    const name = companyName || 'CC';
    const initials = name.substring(0, 2).toUpperCase();
    const colors = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600'];
    const colorIndex = name.charCodeAt(0) % colors.length;
    return (
      <div className={`${size} rounded-3xl ${colors[colorIndex]} flex items-center justify-center font-black text-white tracking-wider border border-white/10 shadow-inner`}>
        {initials}
      </div>
    );
  };

  const daysLeft = Math.ceil((new Date(placement.expiryDate || placement.registrationDeadline || '').getTime() - Date.now()) / (1000 * 3600 * 24));
  const isExpired = daysLeft <= 0;

  const resolvedCompany = placement.company || placement.companyName || '';
  const resolvedRole = placement.role || placement.jobRole || '';
  const resolvedSalary = placement.salary || placement.package || 'Not Specified';
  const resolvedDeadline = placement.registrationDeadline || placement.expiryDate;
  const resolvedBranches = placement.branches && placement.branches.length > 0 ? placement.branches : (placement.eligibleDepartments || []);
  const resolvedBatches = placement.batches && placement.batches.length > 0 ? placement.batches : (placement.eligibleBatches || []);
  const resolvedCGPA = placement.minCGPA !== undefined ? placement.minCGPA : (placement.minimumCGPA || 0.0);
  const resolvedBacklogs = placement.maxBacklogs !== undefined ? placement.maxBacklogs : (placement.maximumBacklogs || 0);

  return (
    <div className="w-full space-y-8 animate-fade-in pb-24 pt-4 bg-[#0B0F19] text-white">
      {/* Header back button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Placement Hub
      </button>

      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#121826] p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-start gap-6">
            {renderLogo(placement.companyLogo, resolvedCompany)}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-white tracking-tight">{resolvedRole}</h1>
                
                {placement.placementType === 'OFFICIAL' || placement.createdByRole === 'ADMIN' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5" />
                    Official Drive
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                    <UserCheck className="w-3.5 h-3.5" />
                    Referral
                  </span>
                )}
              </div>
              <p className="text-base font-bold text-slate-300">{resolvedCompany}</p>
              
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#6D5EF5]" />
                  {placement.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#6D5EF5]" />
                  {placement.employmentType}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#6D5EF5]" />
                  {placement.workMode || 'Onsite'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-3.5 rounded-2xl border transition-all active:scale-95 ${
                isBookmarked 
                  ? 'bg-[#6D5EF5]/20 border-[#6D5EF5]/30 text-[#6D5EF5]' 
                  : 'bg-white/5 border-white/[0.06] text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={handleShare}
              className="p-3.5 rounded-2xl border bg-white/5 border-white/[0.06] text-slate-400 hover:text-white transition-all active:scale-95"
            >
              <Share2 className="w-5 h-5" />
            </button>
            
            {placement.applyLink ? (
              <a
                href={placement.applyLink.startsWith('http') ? placement.applyLink : `https://${placement.applyLink}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  if (id) trackClick(id);
                }}
                className={`px-7 py-3.5 rounded-2xl text-xs font-black transition-all shadow-xl flex items-center gap-2 ${
                  isExpired 
                    ? 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                    : 'bg-[#6D5EF5] hover:bg-[#6D5EF5]/90 text-white shadow-[#6D5EF5]/20 active:scale-95'
                }`}
              >
                {isExpired ? 'Application Closed' : 'Apply Directly'}
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <button className="px-7 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-500 text-xs font-bold cursor-not-allowed">
                No Link Configured
              </button>
            )}
          </div>
        </div>

        {/* HERO METADATA QUICK STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-white/[0.04]">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Compensation (CTC)</span>
            <div className="text-xl font-black text-[#16C784]">{resolvedSalary}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Min CGPA Threshold</span>
            <div className="text-xl font-black text-white">{resolvedCGPA > 0 ? `${resolvedCGPA} CGPA` : 'No Limit'}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Deadline Date</span>
            <div className="text-xl font-black text-[#FFB020]">
              {resolvedDeadline ? new Date(resolvedDeadline).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Job Posting Date</span>
            <div className="text-xl font-black text-slate-300">
              {placement.createdAt ? new Date(placement.createdAt).toLocaleDateString() : 'Just now'}
            </div>
          </div>
        </div>
      </div>

      {/* SPLIT COLUMN DETAIL DESIGN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COMPONENT: ELIGIBILITY PANEL & METADATA */}
        <div className="space-y-6 lg:col-span-1">
          {/* ELIGIBILITY STATUS CARD */}
          {role === 'student' && (
            placement.isEligible === false ? (
              <div className="rounded-3xl border border-[#F04438]/20 bg-[#F04438]/10 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-[#F04438] flex-shrink-0" />
                  <div>
                    <h3 className="text-base font-extrabold text-white">Not Eligible</h3>
                    <p className="text-[10px] text-slate-300 uppercase tracking-widest font-black mt-0.5">Matching Failed</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                  {placement.ineligibilityReason || "You don't meet the academic criteria configured for this drive."}
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#16C784]/20 bg-[#16C784]/10 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-[#16C784] flex-shrink-0" />
                  <div>
                    <h3 className="text-base font-extrabold text-white">You are Eligible</h3>
                    <p className="text-[10px] text-slate-300 uppercase tracking-widest font-black mt-0.5">Matching Succeeded</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Your academic profile satisfies all constraints. You can proceed with the application.
                </p>
              </div>
            )
          )}

          {/* ELIGIBILITY CRITERIA PANEL */}
          <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-6 space-y-5">
            <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#16C784]" />
              Eligibility Parameters
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-white/[0.04] pb-3">
                <span className="text-xs text-slate-400 font-semibold">Target Branches</span>
                <span className="text-xs text-white font-extrabold text-right max-w-[60%]">
                  {resolvedBranches.length > 0 ? resolvedBranches.join(', ') : 'All Departments'}
                </span>
              </div>
              <div className="flex items-start justify-between border-b border-white/[0.04] pb-3">
                <span className="text-xs text-slate-400 font-semibold">Target Batches</span>
                <span className="text-xs text-white font-extrabold text-right">
                  {resolvedBatches.length > 0 ? resolvedBatches.join(', ') : 'All Batches'}
                </span>
              </div>
              <div className="flex items-start justify-between border-b border-white/[0.04] pb-3">
                <span className="text-xs text-slate-400 font-semibold">Minimum CGPA</span>
                <span className="text-xs text-[#16C784] font-extrabold">
                  {resolvedCGPA > 0 ? `${resolvedCGPA} CGPA` : 'No Threshold'}
                </span>
              </div>
              <div className="flex items-start justify-between border-b border-white/[0.04] pb-3">
                <span className="text-xs text-slate-400 font-semibold">Max Backlogs</span>
                <span className="text-xs text-white font-extrabold">
                  {resolvedBacklogs} Active
                </span>
              </div>
              <div className="flex items-start justify-between pb-1">
                <span className="text-xs text-slate-400 font-semibold">Drive Date</span>
                <span className="text-xs text-white font-extrabold">
                  {placement.driveDate ? new Date(placement.driveDate).toLocaleDateString() : 'To Be Announced'}
                </span>
              </div>
            </div>
          </div>

          {/* CONTACT RECRUITER SECTION */}
          {placement.placementType === 'ALUMNI_REFERRAL' && placement.contactAlumni && (
            <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-6 space-y-4">
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#6D5EF5]" />
                Alumni Contact
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This is a referral opportunity posted by one of our alumni. You can reach out directly for guidance or queries.
              </p>
              <a 
                href={`mailto:${placement.contactAlumni}`}
                className="w-full flex items-center justify-center gap-2 h-11 border border-[#6D5EF5]/35 bg-[#6D5EF5]/15 hover:bg-[#6D5EF5]/25 text-[#6D5EF5] rounded-2xl text-xs font-black transition-all active:scale-95"
              >
                <Mail className="w-4 h-4" />
                Contact Referrer
              </a>
            </div>
          )}
        </div>

        {/* RIGHT COMPONENT: DETAILED TEXT INFO */}
        <div className="lg:col-span-2 space-y-6">
          {/* JOB DESCRIPTION */}
          {placement.description && (
            <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-6 space-y-3">
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#6D5EF5]" />
                Job Description & Scope
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                {placement.description}
              </p>
            </div>
          )}

          {/* KEY RESPONSIBILITIES */}
          {placement.responsibilities && (
            <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-6 space-y-3">
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <Award className="w-4 h-4 text-[#6D5EF5]" />
                Responsibilities & Deliverables
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                {placement.responsibilities}
              </p>
            </div>
          )}

          {/* REQUIRED SKILLS */}
          {((placement.requiredSkills && placement.requiredSkills.length > 0) || 
            (placement.skillsRequired && placement.skillsRequired.length > 0)) && (
            <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-6 space-y-3">
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6D5EF5]" />
                Target Skills
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {(placement.requiredSkills && placement.requiredSkills.length > 0 ? placement.requiredSkills : (placement.skillsRequired || [])).map((skill: string) => (
                  <span key={skill} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.06] text-xs font-bold text-slate-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* REQUIRED DOCUMENTS */}
          {placement.documentsRequired && placement.documentsRequired.length > 0 && (
            <div className="rounded-3xl border border-white/[0.06] bg-[#121826] p-6 space-y-3">
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#6D5EF5]" />
                Documents Required For Hiring
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {placement.documentsRequired.map((doc: string, index: number) => (
                  <div key={index} className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl">
                    <Check className="w-4 h-4 text-[#16C784] flex-shrink-0" />
                    <span className="text-xs text-slate-300 font-semibold">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
