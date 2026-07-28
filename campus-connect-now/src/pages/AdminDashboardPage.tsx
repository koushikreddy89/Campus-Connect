import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useAnnouncementStore } from '@/store/announcementStore';
import { socketService } from '@/services/socketService';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Plus, Trash2, LogOut, Calendar, Users, Bell,
  Image as ImageIcon, X, Megaphone, BarChart3, Briefcase,
  AlertTriangle, CheckCircle, LifeBuoy, MessageSquare,
  Clock, Check, Eye, Globe, MoreVertical, Edit3, Copy,
  Pin, Pause, Play, Archive, RotateCcw, Share2, FileText,
  AlertCircle, BookOpen, Lock, Volume2, Camera, ExternalLink, Bug
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { adminApi } from '@/services/api';
import { placementService } from '@/services/placementService';

const CATEGORIES: { key: any; label: string; icon: any }[] = [
  { key: 'announcement', label: 'Announcement', icon: Megaphone },
  { key: 'placement', label: 'Placement Drive', icon: Briefcase },
  { key: 'internship', label: 'Internship', icon: Calendar },
  { key: 'event', label: 'College Event', icon: Users },
  { key: 'notice', label: 'Circular/Notice', icon: Bell },
  { key: 'emergency', label: 'Emergency Alert', icon: Shield },
];

export default function AdminDashboardPage() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const role = useAuthStore(s => s.role);
  const college = useAuthStore(s => s.college) || 'SR University';
  const token = useAuthStore(s => s.token);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const announcements = useAnnouncementStore(s => s.announcements);
  const createAnnouncement = useAnnouncementStore(s => s.createAnnouncement);
  const deleteAnnouncement = useAnnouncementStore(s => s.deleteAnnouncement);

  const [activeAdminTab, setActiveAdminTab] = useState<'announcements' | 'reports' | 'tickets' | 'alumni' | 'colleges' | 'logs' | 'bugs'>('announcements');

  // Alumni approvals state
  const [alumniVerifications, setAlumniVerifications] = useState<any[]>([]);
  const [alumniLoading, setAlumniLoading] = useState(false);

  // Colleges domain registry state
  const [colleges, setColleges] = useState<any[]>([]);
  const [collegesLoading, setCollegesLoading] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeDomain, setNewCollegeDomain] = useState('');
  const [isAddingCollege, setIsAddingCollege] = useState(false);

  // Security Logs state
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // User Reports state
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Help Desk Tickets state
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<string>('In Progress');

  // Bugs management state
  const [bugs, setBugs] = useState<any[]>([]);
  const [bugsLoading, setBugsLoading] = useState(false);
  const [replyBugId, setReplyBugId] = useState<string | null>(null);
  const [bugInternalNotes, setBugInternalNotes] = useState('');
  const [bugStatus, setBugStatus] = useState<string>('Pending');
  const [bugPriority, setBugPriority] = useState<string>('Medium');

  // Announcement Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<any>('announcement');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Placement Form States
  const [compName, setCompName] = useState('');
  const [compLogo, setCompLogo] = useState('');
  const [compWebsite, setCompWebsite] = useState('');
  const [compIndustry, setCompIndustry] = useState('');
  const [compLocation, setCompLocation] = useState('Remote');
  const [compDesc, setCompDesc] = useState('');

  const [jobRoleTitle, setJobRoleTitle] = useState('');
  const [empType, setEmpType] = useState<any>('Full-Time');
  const [workMode, setWorkMode] = useState<any>('Remote');
  const [salaryCTC, setSalaryCTC] = useState('');
  const [stipend, setStipend] = useState('');
  const [bondDetails, setBondDetails] = useState('');
  const [openPositions, setOpenPositions] = useState<number>(0);

  // Job Description formatted areas
  const [responsibilities, setResponsibilities] = useState('');
  const [reqSkills, setReqSkills] = useState('');
  const [prefSkills, setPrefSkills] = useState('');
  const [hiringProcess, setHiringProcess] = useState('');
  const [interviewRounds, setInterviewRounds] = useState('');
  const [addInstructions, setAddInstructions] = useState('');

  // Eligibility Criteria
  const [targetYears, setTargetYears] = useState<string[]>([]);
  const [targetDepts, setTargetDepts] = useState<string[]>([]);
  const [targetSpecs, setTargetSpecs] = useState<string[]>([]);
  const [minCGPA, setMinCGPA] = useState<number>(0);
  const [maxBacklogs, setMaxBacklogs] = useState<string>('No Restriction');
  const [passingBatches, setPassingBatches] = useState<string[]>([]);
  const [genderRestrict, setGenderRestrict] = useState<string>('All');
  const [targetSections, setTargetSections] = useState<string>('All');

  // Dates
  const [dateRegOpen, setDateRegOpen] = useState('');
  const [dateRegDeadline, setDateRegDeadline] = useState('');
  const [dateAssessment, setDateAssessment] = useState('');
  const [dateInterview, setDateInterview] = useState('');
  const [dateOffer, setDateOffer] = useState('');
  const [dateJoining, setDateJoining] = useState('');

  // Application
  const [appLink, setAppLink] = useState('');
  const [pdfNotification, setPdfNotification] = useState('');

  // Live Count Preview State
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [placementType, setPlacementType] = useState<string>('Full Time');
  const [collegesSelection, setCollegesSelection] = useState<string>('Current College');
  const [audienceStats, setAudienceStats] = useState({
    eligibleStudents: 0,
    eligibleMale: 0,
    eligibleFemale: 0,
    eligibleDepartments: [] as string[],
    targetBatches: [] as string[],
    averageCGPA: 0.0
  });

  const fetchAudienceStats = async () => {
    try {
      const response = await fetch('/api/admin/audience-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          years: targetYears,
          departments: targetDepts,
          gender: genderRestrict,
          batches: passingBatches,
          minCgpa: minCGPA,
          maxBacklogs: maxBacklogs,
          skills: selectedSkills,
          placementType: placementType,
          colleges: collegesSelection
        })
      });
      const data = await response.json();
      if (data.success) {
        setAudienceStats({
          eligibleStudents: data.eligibleStudents,
          eligibleMale: data.eligibleMale,
          eligibleFemale: data.eligibleFemale,
          eligibleDepartments: data.eligibleDepartments,
          targetBatches: data.targetBatches,
          averageCGPA: data.averageCGPA
        });
      }
    } catch (err) {
      console.error('Failed to fetch audience statistics', err);
    }
  };

  useEffect(() => {
    if (showForm) {
      fetchAudienceStats();
    }
  }, [targetYears, targetDepts, genderRestrict, passingBatches, minCGPA, maxBacklogs, selectedSkills, placementType, collegesSelection, showForm]);

  // Wizard active step
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Dynamic Broadcast Module States
  const [summary, setSummary] = useState('');
  const [subCategory, setSubCategory] = useState('General');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [attachmentsList, setAttachmentsList] = useState<string[]>([]);
  const [scheduledPublishDate, setScheduledPublishDate] = useState('');
  const [scheduledExpiryDate, setScheduledExpiryDate] = useState('');
  const [visibilityType, setVisibilityType] = useState<'Public' | 'Restricted' | 'Private'>('Public');
  const [isPinned, setIsPinned] = useState(false);

  // Internships
  const [duration, setDuration] = useState('3 Months');
  const [internshipMode, setInternshipMode] = useState('Remote');
  const [isPaid, setIsPaid] = useState(true);

  // College Events
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('Workshop');
  const [organizingDepartment, setOrganizingDepartment] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [building, setBuilding] = useState('');
  const [hallNumber, setHallNumber] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number>(100);
  const [entryFee, setEntryFee] = useState('Free');
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // Circular / Notice
  const [circularNumber, setCircularNumber] = useState('');
  const [circularTitle, setCircularTitle] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [subject, setSubject] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [pdfAttachment, setPdfAttachment] = useState('');

  // Emergency Alert
  const [alertCategory, setAlertCategory] = useState('Security');
  const [severity, setSeverity] = useState<'Critical' | 'High' | 'Medium'>('Medium');
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState('');
  const [location, setLocation] = useState('');
  const [affectedBuildings, setAffectedBuildings] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [requireAcknowledgement, setRequireAcknowledgement] = useState(false);

  // Editing state
  const [editingBroadcastId, setEditingBroadcastId] = useState<string | null>(null);
  
  // Analytics modal state
  const [analyticsBroadcast, setAnalyticsBroadcast] = useState<any | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const fetchAnalyticsData = useAnnouncementStore(s => s.fetchAnalytics);

  useEffect(() => {
    if (!showAnalyticsModal || !analyticsBroadcast) {
      setAnalyticsData(null);
      setAnalyticsError(null);
      return;
    }

    const targetId = analyticsBroadcast.id || analyticsBroadcast._id || analyticsBroadcast.relatedId;
    if (!targetId) return;

    let isMounted = true;
    const loadData = async () => {
      setLoadingAnalytics(true);
      setAnalyticsError(null);
      try {
        const data = await fetchAnalyticsData(targetId);
        if (isMounted) {
          setAnalyticsData(data);
        }
      } catch (err: any) {
        console.error('Failed to load broadcast analytics:', err);
        if (isMounted) {
          setAnalyticsError(err.message || 'Unable to load analytics.');
        }
      } finally {
        if (isMounted) {
          setLoadingAnalytics(false);
        }
      }
    };

    loadData();

    // Listen to real-time socket updates
    const socket = socketService.getSocket();
    if (socket) {
      const handleUpdate = (update: any) => {
        if (update.announcementId === targetId && isMounted) {
          setAnalyticsData(update);
        }
      };
      socket.on('analytics:update', handleUpdate);
      return () => {
        isMounted = false;
        socket.off('analytics:update', handleUpdate);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [showAnalyticsModal, analyticsBroadcast, fetchAnalyticsData]);
  
  // Preview modal state
  const [previewBroadcast, setPreviewBroadcast] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  // Trash view state
  const [showTrashView, setShowTrashView] = useState(false);
  const [trashList, setTrashList] = useState<any[]>([]);


  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImagePreview(null);
    setCategory('announcement');
    setWizardStep(1);
    setEditingBroadcastId(null);
    
    setSummary('');
    setSubCategory('General');
    setPriority('Medium');
    setAttachmentsList([]);
    setScheduledPublishDate('');
    setScheduledExpiryDate('');
    setVisibilityType('Public');
    setIsPinned(false);
    setCompName('');
    setCompLogo('');
    setCompWebsite('');
    setJobRoleTitle('');
    setEmpType('Full-Time');
    setWorkMode('Remote');
    setSalaryCTC('');
    setStipend('');
    setReqSkills('');
    setTargetYears([]);
    setTargetDepts([]);
    setMinCGPA(0);
    setMaxBacklogs('No Restriction');
    setAppLink('');
    setDateRegDeadline('');

    setDuration('3 Months');
    setInternshipMode('Remote');
    setIsPaid(true);

    setEventName('');
    setEventType('Workshop');
    setOrganizingDepartment('');
    setEventDescription('');
    setVenue('');
    setBuilding('');
    setHallNumber('');
    setEventDate('');
    setEventTime('');
    setMaxParticipants(100);
    setEntryFee('Free');
    setContactPerson('');
    setContactNumber('');

    setCircularNumber('');
    setCircularTitle('');
    setIssuedBy('');
    setSubject('');
    setEffectiveDate('');
    setPdfAttachment('');

    setAlertCategory('Security');
    setSeverity('Medium');
    setEmergencyMessage('');
    setInstructions('');
    setEmergencyContacts('');
    setLocation('');
    setAffectedBuildings('');
    setSendPush(true);
    setSendEmail(true);
    setSendSMS(false);
    setRequireAcknowledgement(false);
  };

  // Auto-fetch eligible count when parameters change
  useEffect(() => {
    if (category === 'placement' && showForm) {
      const fetchCount = async () => {
        setIsLoadingCount(true);
        try {
          const count = await placementService.getPreviewCount({
            eligibleYears: targetYears,
            eligibleDepartments: targetDepts,
            minimumCGPA: minCGPA,
            maximumBacklogs: maxBacklogs,
            eligibleBatches: passingBatches
          });
          setEligibleCount(count);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingCount(false);
        }
      };

      const timer = setTimeout(fetchCount, 500);
      return () => clearTimeout(timer);
    }
  }, [category, showForm, targetYears, targetDepts, minCGPA, maxBacklogs, passingBatches]);

  const handleSubmit = async (isSaveDraft = false) => {
    setInvalidFields([]);
    const invalid: string[] = [];

    // Basic Form validation
    if (category === 'placement') {
      if (!compName.trim()) invalid.push('compName');
      if (!jobRoleTitle.trim()) invalid.push('jobRoleTitle');
      if (!workMode) invalid.push('workMode');
      if (!dateRegDeadline) invalid.push('dateRegDeadline');
      if (!appLink.trim()) invalid.push('appLink');

      if (invalid.length > 0) {
        setInvalidFields(invalid);
        toast.error('Please fill in all required fields (Company Name, Job Role, Work Mode, Registration Deadline, and Application Link)');
        const first = document.getElementById(invalid[0]);
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.focus();
        }
        return;
      }
      if (minCGPA < 0 || minCGPA > 10) {
        toast.error('Minimum CGPA must be between 0 and 10');
        setInvalidFields(['minCGPA']);
        const first = document.getElementById('minCGPA');
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.focus();
        }
        return;
      }
    } else if (category === 'internship') {
      if (!compName.trim()) invalid.push('compName');
      if (!jobRoleTitle.trim()) invalid.push('jobRoleTitle');
      if (!internshipMode) invalid.push('internshipMode');
      if (!dateRegDeadline) invalid.push('dateRegDeadline');
      if (!appLink.trim()) invalid.push('appLink');

      if (invalid.length > 0) {
        setInvalidFields(invalid);
        toast.error('Please fill in all required fields (Company Name, Job Role, Work Mode, Registration Deadline, and Application Link)');
        const first = document.getElementById(invalid[0]);
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.focus();
        }
        return;
      }
    } else if (category === 'event') {
      if (!eventName.trim()) invalid.push('eventName');
      if (!eventDate) invalid.push('eventDate');
      if (!appLink.trim()) invalid.push('appLink');

      if (invalid.length > 0) {
        setInvalidFields(invalid);
        toast.error('Please fill in Event Name, Date, and Registration Link');
        const first = document.getElementById(invalid[0]);
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.focus();
        }
        return;
      }
    } else if (category === 'notice') {
      if (!title.trim()) invalid.push('title');
      if (!circularNumber.trim()) invalid.push('circularNumber');

      if (invalid.length > 0) {
        setInvalidFields(invalid);
        toast.error('Please fill in Circular Title and Circular Number');
        const first = document.getElementById(invalid[0]);
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.focus();
        }
        return;
      }
    } else if (category === 'emergency') {
      if (!title.trim()) invalid.push('title');
      if (!emergencyMessage.trim()) invalid.push('emergencyMessage');

      if (invalid.length > 0) {
        setInvalidFields(invalid);
        toast.error('Please fill in Emergency Title and Message');
        const first = document.getElementById(invalid[0]);
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.focus();
        }
        return;
      }
    } else {
      // General announcements
      if (!title.trim()) invalid.push('title');
      if (!description.trim()) invalid.push('description');

      if (invalid.length > 0) {
        setInvalidFields(invalid);
        toast.error('Please fill in Title and Description');
        const first = document.getElementById(invalid[0]);
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.focus();
        }
        return;
      }
    }

    setIsCreating(true);
    try {
      let finalTitle = title.trim();
      let finalDesc = description.trim();

      if (category === 'placement') {
        finalTitle = `Placement Drive: ${compName.trim()} - ${jobRoleTitle.trim()}`;
        finalDesc = `
Hiring at ${compName.trim()} for the role of ${jobRoleTitle.trim()}.
Work Mode: ${workMode || 'Remote'}
Package: ${salaryCTC || stipend || 'Not Disclosed'}
Eligibility: Min CGPA ${minCGPA}, Max Backlogs ${maxBacklogs}.
Deadline: ${new Date(dateRegDeadline).toLocaleDateString()}
        `.trim();
      } else if (category === 'internship') {
        finalTitle = `Internship Opportunity: ${compName.trim()} - ${jobRoleTitle.trim()}`;
        finalDesc = `
Internship at ${compName.trim()} for the role of ${jobRoleTitle.trim()}.
Duration: ${duration || '3 Months'}
Work Mode: ${internshipMode || 'Remote'}
Stipend: ${stipend || 'Not Disclosed'}
Eligibility: Min CGPA ${minCGPA}.
Deadline: ${new Date(dateRegDeadline).toLocaleDateString()}
        `.trim();
      } else if (category === 'event') {
        finalTitle = `Event: ${eventName.trim()}`;
        finalDesc = `
Department: ${organizingDepartment}
Venue: ${venue || 'Campus Auditorium'} (${building} - Hall ${hallNumber})
Date: ${new Date(eventDate).toLocaleDateString()} at ${eventTime}
Registration Fee: ${entryFee}
Contact Person: ${contactPerson} (${contactNumber})
        `.trim();
      } else if (category === 'notice') {
        finalTitle = `Circular ${circularNumber}: ${title.trim()}`;
      } else if (category === 'emergency') {
        finalTitle = `🚨 EMERGENCY: ${title.trim()}`;
        finalDesc = emergencyMessage.trim();
      }

      const payload: any = {
        title: finalTitle,
        description: finalDesc,
        content: finalDesc,
        category,
        college,
        status: isSaveDraft ? 'draft' : 'active',
        isPinned: isPinned || false,
        scheduledPublish: scheduledPublishDate || undefined,
        expiryDate: scheduledExpiryDate || dateRegDeadline || undefined,
        visibility: visibilityType || 'Public',
        imageURL: imagePreview || ''
      };

      // Set sub-fields to sync database models
      if (category === 'announcement') {
        payload.summary = summary.trim() || title.trim();
        payload.subCategory = subCategory;
        payload.priority = priority;
        payload.attachments = attachmentsList;
      } else if (category === 'placement') {
        payload.companyName = compName.trim();
        payload.companyLogo = compLogo.trim() || 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg';
        payload.companyWebsite = compWebsite.trim();
        payload.jobRole = jobRoleTitle.trim();
        payload.employmentType = empType;
        payload.workMode = workMode;
        payload.package = salaryCTC || stipend || 'Not Disclosed';
        payload.stipend = stipend;
        payload.skillsRequired = reqSkills.split(',').map(s => s.trim()).filter(Boolean);
        payload.eligibilityAcademicYears = targetYears;
        payload.eligibilityDepartments = targetDepts;
        payload.eligibilityCGPA = Number(minCGPA);
        payload.eligibilityBacklogs = maxBacklogs === 'No Restriction' ? 99 : parseInt(maxBacklogs);
        payload.eligibilityBatch = passingBatches.length > 0 ? passingBatches[0] : '2026';
        payload.eligibilityGender = genderRestrict;
        payload.eligibilityBatches = passingBatches;
        payload.eligibilityCollegesSelection = collegesSelection;
        payload.eligibilitySkills = selectedSkills;
        payload.placementType = placementType;
        payload.registrationLink = appLink.trim();
      } else if (category === 'internship') {
        payload.companyName = compName.trim();
        payload.jobRole = jobRoleTitle.trim();
        payload.duration = duration;
        payload.workMode = internshipMode;
        payload.isPaid = isPaid;
        payload.stipend = stipend;
        payload.skillsRequired = reqSkills.split(',').map(s => s.trim()).filter(Boolean);
        payload.eligibilityDepartments = targetDepts;
        payload.eligibilityCGPA = Number(minCGPA);
        payload.eligibilityGender = genderRestrict;
        payload.eligibilityBatches = passingBatches;
        payload.eligibilityCollegesSelection = collegesSelection;
        payload.eligibilitySkills = selectedSkills;
        payload.placementType = placementType;
        payload.registrationLink = appLink.trim();
      } else if (category === 'event') {
        payload.eventName = eventName.trim();
        payload.eventType = eventType;
        payload.organizingDepartment = organizingDepartment.trim();
        payload.venue = venue.trim();
        payload.building = building.trim();
        payload.hallNumber = hallNumber.trim();
        payload.eventDate = eventDate;
        payload.eventTime = eventTime;
        payload.maxParticipants = Number(maxParticipants);
        payload.entryFee = entryFee;
        payload.contactPerson = contactPerson.trim();
        payload.contactNumber = contactNumber.trim();
        payload.registrationLink = appLink.trim();
      } else if (category === 'notice') {
        payload.circularNumber = circularNumber.trim();
        payload.circularTitle = title.trim();
        payload.issuedBy = issuedBy.trim();
        payload.subject = subject.trim();
        payload.effectiveDate = effectiveDate;
        payload.pdfAttachment = pdfAttachment;
      } else if (category === 'emergency') {
        payload.alertCategory = alertCategory;
        payload.severity = severity;
        payload.instructions = instructions;
        payload.emergencyContacts = emergencyContacts.split(',').map(s => s.trim()).filter(Boolean);
        payload.location = location;
        payload.affectedBuildings = affectedBuildings.split(',').map(s => s.trim()).filter(Boolean);
        payload.sendPush = sendPush;
        payload.sendEmail = sendEmail;
        payload.sendSMS = sendSMS;
        payload.requireAcknowledgement = requireAcknowledgement;
      }

      if (editingBroadcastId) {
        await updateAnnouncement(editingBroadcastId, payload);
      } else {
        await createAnnouncement(payload);
      }

      setShowForm(false);
      resetForm();
      fetchAnnouncements(college);
    } catch (e: any) {
      console.error('Failed to publish announcement:', e);
      toast.error('Unable to publish announcement. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (ann: any) => {
    setEditingBroadcastId(ann.id || ann._id);
    setCategory(ann.category);
    setWizardStep(2); // Jump to form step
    setShowForm(true);

    // Pre-fill states
    setTitle(ann.title || '');
    setDescription(ann.description || ann.content || '');
    setImagePreview(ann.imageURL || null);
    setIsPinned(ann.isPinned || false);
    setScheduledPublishDate(ann.scheduledPublish || '');
    setScheduledExpiryDate(ann.expiryDate || '');
    setVisibilityType(ann.visibility || 'Public');

    setSummary(ann.summary || '');
    setSubCategory(ann.subCategory || 'General');
    setPriority(ann.priority || 'Medium');
    setAttachmentsList(ann.attachments || []);

    setCompName(ann.companyName || '');
    setCompLogo(ann.companyLogo || '');
    setCompWebsite(ann.companyWebsite || '');
    setJobRoleTitle(ann.jobRole || '');
    setEmpType(ann.employmentType || 'Full-Time');
    setWorkMode(ann.workMode || 'Remote');
    setSalaryCTC(ann.package || '');
    setStipend(ann.stipend || '');
    setReqSkills(ann.skillsRequired ? ann.skillsRequired.join(', ') : '');
    setTargetYears(ann.eligibilityAcademicYears || []);
    setTargetDepts(ann.eligibilityDepartments || []);
    setMinCGPA(ann.eligibilityCGPA || 0);
    setMaxBacklogs(ann.eligibilityBacklogs ? String(ann.eligibilityBacklogs) : 'No Restriction');
    setAppLink(ann.registrationLink || '');
    setDateRegDeadline(ann.registrationDeadline || '');

    setDuration(ann.duration || '3 Months');
    setInternshipMode(ann.workMode || 'Remote');
    setIsPaid(ann.isPaid || false);

    setEventName(ann.eventName || '');
    setEventType(ann.eventType || 'Workshop');
    setOrganizingDepartment(ann.organizingDepartment || '');
    setEventDescription(ann.content || '');
    setVenue(ann.venue || '');
    setBuilding(ann.building || '');
    setHallNumber(ann.hallNumber || '');
    setEventDate(ann.eventDate || '');
    setEventTime(ann.eventTime || '');
    setMaxParticipants(ann.maxParticipants || 100);
    setEntryFee(ann.entryFee || 'Free');
    setContactPerson(ann.contactPerson || '');
    setContactNumber(ann.contactNumber || '');

    setCircularNumber(ann.circularNumber || '');
    setCircularTitle(ann.title || '');
    setIssuedBy(ann.issuedBy || '');
    setSubject(ann.subject || '');
    setEffectiveDate(ann.effectiveDate || '');
    setPdfAttachment(ann.pdfAttachment || '');

    setAlertCategory(ann.alertCategory || 'Security');
    setSeverity(ann.severity || 'Medium');
    setEmergencyMessage(ann.content || '');
    setInstructions(ann.instructions || '');
    setEmergencyContacts(ann.emergencyContacts ? ann.emergencyContacts.join(', ') : '');
    setLocation(ann.location || '');
    setAffectedBuildings(ann.affectedBuildings ? ann.affectedBuildings.join(', ') : '');
    setSendPush(ann.sendPush !== false);
    setSendEmail(ann.sendEmail !== false);
    setSendSMS(ann.sendSMS || false);
    setRequireAcknowledgement(ann.requireAcknowledgement || false);
  };

  const renderLogo = (logoUrl?: string, companyName?: string, size = 'h-9 w-9 text-xs') => {
    if (logoUrl) {
      return (
        <img 
          src={logoUrl} 
          alt={companyName} 
          className={`${size} rounded-xl object-contain bg-white/5 p-1 border border-white/10`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '';
          }}
        />
      );
    }
    const initials = (companyName || 'CC').substring(0, 2).toUpperCase();
    const colors = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600'];
    const colorIndex = (companyName || 'CC').charCodeAt(0) % colors.length;
    return (
      <div className={`${size} rounded-xl ${colors[colorIndex]} flex items-center justify-center font-bold text-white tracking-wider border border-white/10 shadow-inner`}>
        {initials}
      </div>
    );
  };

  const fetchAnnouncements = useAnnouncementStore(s => s.fetchAnnouncements);
  const updateAnnouncement = useAnnouncementStore(s => s.updateAnnouncement);

  useEffect(() => {
    fetchAnnouncements(college);
  }, [college, fetchAnnouncements]);


  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/reports', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setReports(json.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load user reports');
    } finally {
      setReportsLoading(false);
    }
  };

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/support-tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load support tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  const loadBugs = async () => {
    setBugsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/bugs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setBugs(json.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load bug reports');
    } finally {
      setBugsLoading(false);
    }
  };

  const loadAlumniVerifications = async () => {
    setAlumniLoading(true);
    try {
      const res = await adminApi.getAlumniVerifications();
      if (res.success) {
        setAlumniVerifications(res.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load alumni verifications');
    } finally {
      setAlumniLoading(false);
    }
  };

  const loadColleges = async () => {
    setCollegesLoading(true);
    try {
      const res = await adminApi.getColleges();
      if (res.success) {
        setColleges(res.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load colleges');
    } finally {
      setCollegesLoading(false);
    }
  };

  const loadSecurityLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await adminApi.getSecurityLogs();
      if (res.success) {
        setSecurityLogs(res.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load security logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'reports') {
      loadReports();
    } else if (activeAdminTab === 'tickets') {
      loadTickets();
    } else if (activeAdminTab === 'bugs') {
      loadBugs();
    } else if (activeAdminTab === 'alumni') {
      loadAlumniVerifications();
    } else if (activeAdminTab === 'colleges') {
      loadColleges();
    } else if (activeAdminTab === 'logs') {
      loadSecurityLogs();
    }
  }, [activeAdminTab]);

  const handleApproveAlumni = async (id: string) => {
    try {
      const res = await adminApi.approveAlumni(id);
      if (res.success) {
        toast.success('Alumni registration approved');
        loadAlumniVerifications();
      } else {
        toast.error(res.error || 'Failed to approve');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error approving alumni');
    }
  };

  const handleRejectAlumni = async (id: string) => {
    try {
      const res = await adminApi.rejectAlumni(id);
      if (res.success) {
        toast.success('Alumni registration rejected');
        loadAlumniVerifications();
      } else {
        toast.error(res.error || 'Failed to reject');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error rejecting alumni');
    }
  };

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName.trim() || !newCollegeDomain.trim()) return;
    setIsAddingCollege(true);
    try {
      const res = await adminApi.addCollege(newCollegeName.trim(), newCollegeDomain.trim());
      if (res.success) {
        toast.success('College domain added successfully');
        setNewCollegeName('');
        setNewCollegeDomain('');
        loadColleges();
      } else {
        toast.error(res.error || 'Failed to add college domain');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error adding college');
    } finally {
      setIsAddingCollege(false);
    }
  };

  const handleToggleCollegeStatus = async (id: string, currentStatus: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/colleges/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: currentStatus === 'active' ? 'disabled' : 'active' })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('College domain status updated');
        loadColleges();
      } else {
        toast.error(json.error || 'Failed to update status');
      }
    } catch (e) {
      toast.error('Error updating status');
    }
  };

  const handleDeleteCollege = async (id: string) => {
    if (!confirm('Are you sure you want to delete this college domain?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/colleges/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      if (json.success) {
        toast.success('College domain deleted successfully');
        loadColleges();
      } else {
        toast.error(json.error || 'Failed to delete college domain');
      }
    } catch (e) {
      toast.error('Error deleting college domain');
    }
  };

  const handleResolveReport = async (reportId: string, action: 'suspend' | 'dismiss') => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(action === 'suspend' ? 'User account suspended' : 'Report dismissed');
        loadReports();
      } else {
        toast.error(json.error || 'Failed to resolve report');
      }
    } catch (e) {
      toast.error('Error resolving report');
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTicketId || !replyText.trim()) return;

    try {
      const res = await fetch(`http://localhost:5000/api/admin/support-tickets/${replyTicketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reply: replyText.trim(), status: replyStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Reply submitted and status updated');
        setReplyText('');
        setReplyTicketId(null);
        loadTickets();
      } else {
        toast.error(json.error || 'Failed to submit reply');
      }
    } catch (e) {
      toast.error('Error submitting reply');
    }
  };

  const myAnnouncements = announcements.filter(
    a => a.college.toLowerCase() === college.toLowerCase()
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };



  const handleTriggerClick = (e: React.MouseEvent, annId: string) => {
    e.stopPropagation();
    if (activeMenuId === annId) {
      setActiveMenuId(null);
      setMenuCoords(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      // Calculate placement
      let top = rect.bottom + scrollY;
      let left = rect.right + scrollX - 176; // 176px is width
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuHeight = 280; // approximate height of dropdown
      
      if (rect.bottom + menuHeight > viewportHeight) {
        top = rect.top + scrollY - menuHeight;
      }
      if (left < 0) {
        left = rect.left + scrollX;
      }
      
      setActiveMenuId(annId);
      setMenuCoords({ top, left });
    }
  };

  const handleShare = async (ann: any) => {
    const shareData = {
      title: ann.title,
      text: ann.description,
      url: `${window.location.origin}/broadcast/${ann.id}`,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch (e) {
        navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <EmptyState
          icon={<Shield className="h-8 w-8 text-destructive" />}
          title="Access Denied"
          description="You don't have admin permissions."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12 text-foreground">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-5 pt-5 pb-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Campus Control</h1>
            <p className="text-[11px] text-muted-foreground font-medium">{college}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/security')} className="text-xs rounded-xl h-9 flex items-center gap-1 border border-white/5 bg-zinc-950/20">
            <Shield className="h-3.5 w-3.5 text-violet-400" /> Security Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="text-xs rounded-xl h-9">
            App View
          </Button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleLogout} className="p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="px-5 my-5">
        <div className="flex bg-secondary/40 border border-white/5 p-1 rounded-2xl gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveAdminTab('announcements')}
            className={`flex-1 min-w-[100px] py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'announcements' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" /> Broadcasts
          </button>
          <button
            onClick={() => setActiveAdminTab('alumni')}
            className={`flex-1 min-w-[130px] py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'alumni' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Alumni Approvals
          </button>
          <button
            onClick={() => setActiveAdminTab('colleges')}
            className={`flex-1 min-w-[130px] py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'colleges' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="h-3.5 w-3.5" /> Domains Registry
          </button>
          <button
            onClick={() => setActiveAdminTab('logs')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'logs' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="h-3.5 w-3.5" /> Security Logs
          </button>
          <button
            onClick={() => setActiveAdminTab('reports')}
            className={`flex-1 min-w-[100px] py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'reports' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Reports
          </button>
          <button
            onClick={() => setActiveAdminTab('tickets')}
            className={`flex-1 min-w-[100px] py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'tickets' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LifeBuoy className="h-3.5 w-3.5" /> Help Desk
          </button>
          <button
            onClick={() => setActiveAdminTab('bugs')}
            className={`flex-1 min-w-[100px] py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeAdminTab === 'bugs' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bug className="h-3.5 w-3.5" /> Bugs
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeAdminTab === 'announcements' && (
          <motion.div
            key="announcements"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-5"
          >
            {/* Dashboard Stats */}
            {!showForm && (
              <div className="grid grid-cols-4 gap-3 px-5">
                <div className="glass-card p-4 text-center">
                  <Megaphone className="h-4 w-4 text-primary mx-auto mb-1" />
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total Posts</span>
                  <p className="text-lg font-bold text-white mt-0.5">{myAnnouncements.length}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <Briefcase className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Placements</span>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {myAnnouncements.filter(a => a.category === 'placement').length}
                  </p>
                </div>
                <div className="glass-card p-4 text-center">
                  <Shield className="h-4 w-4 text-red-500 mx-auto mb-1 animate-pulse" />
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Emergencies</span>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {myAnnouncements.filter(a => a.category === 'emergency').length}
                  </p>
                </div>
                <div className="glass-card p-4 text-center">
                  <Pin className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Pinned Notices</span>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {myAnnouncements.filter(a => a.isPinned).length}
                  </p>
                </div>
              </div>
            )}

            {/* Create Button & Trash Toggle */}
            <div className="px-5 flex gap-3">
              <Button
                onClick={() => {
                  if (showForm) {
                    resetForm();
                    setShowForm(false);
                  } else {
                    resetForm();
                    setCategory('announcement');
                    setWizardStep(1);
                    setShowForm(true);
                  }
                }}
                className="flex-1 gradient-primary rounded-2xl h-12 font-semibold text-sm glow-primary"
              >
                {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {showForm ? 'Cancel Creation' : 'New Broadcast'}
              </Button>
              {!showForm && (
                <Button
                  onClick={async () => {
                    if (!showTrashView) {
                      const trash = await useAnnouncementStore.getState().fetchTrash();
                      setTrashList(trash);
                    }
                    setShowTrashView(!showTrashView);
                  }}
                  variant="outline"
                  className="rounded-2xl border-white/5 bg-secondary/30 h-12 px-4 hover:bg-secondary text-xs font-semibold text-slate-300"
                >
                  <Trash2 className="h-4 w-4 mr-2 text-red-400" />
                  {showTrashView ? 'Active Posts' : 'Trash Can'}
                </Button>
              )}
            </div>

            {/* Dynamic Creation / Edit Wizard Form */}
            {showForm && (
              <div className="px-5">
                <div className="glass-card p-5 space-y-6 border border-primary/20 bg-gradient-to-b from-primary/5 to-secondary/30">
                  
                  {/* Step Indicators */}
                  <div className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-xl border border-white/5 overflow-x-auto whitespace-nowrap gap-4">
                    {[
                      { step: 1, label: 'Select Broadcast Type' },
                      { step: 2, label: 'Fill Details Form' },
                      { step: 3, label: 'Eligibility & Audience' },
                      { step: 4, label: 'Live Student Preview' },
                      { step: 5, label: 'Publish Settings' }
                    ].map((s) => (
                      <div
                        key={s.step}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          wizardStep === s.step 
                            ? 'bg-primary/20 text-primary border border-primary/30' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] ${
                          wizardStep === s.step ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                        }`}>{s.step}</span>
                        {s.label}
                      </div>
                    ))}
                  </div>

                  <hr className="border-white/5" />

                  {/* STEP 1: TYPE SELECTION */}
                  {wizardStep === 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Choose Broadcast Category</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CATEGORIES.map(cat => {
                          const Icon = cat.icon;
                          const desc = cat.key === 'announcement' ? 'General administrative notifications' :
                                       cat.key === 'placement' ? 'Official student placement drives' :
                                       cat.key === 'internship' ? 'Student internship opportunities' :
                                       cat.key === 'event' ? 'Technical, cultural, sports events' :
                                       cat.key === 'notice' ? 'Circulars, memos, and notice sheets' :
                                       'Urgent safety / system alert notices';
                          return (
                            <button
                              key={cat.key}
                              type="button"
                              onClick={() => {
                                setCategory(cat.key);
                                setWizardStep(2);
                              }}
                              className={`flex flex-col items-start p-4 rounded-xl text-left border transition-all ${
                                category === cat.key
                                  ? 'bg-primary/10 border-primary shadow-lg'
                                  : 'bg-zinc-950/20 border-white/5 hover:border-white/20'
                              }`}
                            >
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center border mb-3 ${
                                category === cat.key ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary border-white/5 text-muted-foreground'
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <span className="text-xs font-bold text-white">{cat.label}</span>
                              <p className="text-[9px] text-muted-foreground mt-1 leading-snug">{desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: DETAILS FORM */}
                  {wizardStep === 2 && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary uppercase text-[9px]">{category}</span>
                          Fill Broadcast Details
                        </span>
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="text-[10px] text-muted-foreground hover:text-white font-semibold"
                        >
                          Change Type
                        </button>
                      </div>

                      {/* Announcement Specific Form */}
                      {category === 'announcement' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-muted-foreground font-semibold">Announcement Title *</label>
                              <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. End Semester Exam Schedule Released"
                                className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-muted-foreground font-semibold">Sub-Category *</label>
                              <select
                                value={subCategory}
                                onChange={e => setSubCategory(e.target.value)}
                                className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                              >
                                {['Academic', 'Administrative', 'Examination', 'Placement', 'Student Activity', 'General'].map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-muted-foreground font-semibold">Notification Summary *</label>
                              <input
                                type="text"
                                value={summary}
                                onChange={e => setSummary(e.target.value)}
                                placeholder="1-line summary to display in notifications feed"
                                className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-muted-foreground font-semibold">Priority Level *</label>
                              <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                                className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                              >
                                {['Low', 'Medium', 'High'].map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-muted-foreground font-semibold">Full Notice details *</label>
                            <textarea
                              value={description}
                              onChange={e => setDescription(e.target.value)}
                              placeholder="Provide the complete announcement text details..."
                              rows={4}
                              className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none focus:border-primary"
                            />
                          </div>
                        </div>
                      )}

                      {/* Placement Form */}
                      {category === 'placement' && (
                        <div className="space-y-4">
                          <div className="border border-white/5 rounded-2xl p-4 bg-zinc-950/20 space-y-3">
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Company & Role Info</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Company Name *</label>
                                <input
                                  type="text"
                                  id="compName"
                                  placeholder="e.g. Google"
                                  value={compName}
                                  onChange={e => setCompName(e.target.value)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('compName') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Job Role Title *</label>
                                <input
                                  type="text"
                                  id="jobRoleTitle"
                                  placeholder="e.g. Software Engineer"
                                  value={jobRoleTitle}
                                  onChange={e => setJobRoleTitle(e.target.value)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('jobRoleTitle') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Salary CTC *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 18 LPA"
                                  value={salaryCTC}
                                  onChange={e => setSalaryCTC(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Work Mode</label>
                                <select
                                  id="workMode"
                                  value={workMode}
                                  onChange={e => setWorkMode(e.target.value as any)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('workMode') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                >
                                  <option value="On-Site">On-Site</option>
                                  <option value="Hybrid">Hybrid</option>
                                  <option value="Remote">Remote</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Reg Deadline *</label>
                                <input
                                  type="date"
                                  id="dateRegDeadline"
                                  value={dateRegDeadline}
                                  onChange={e => setDateRegDeadline(e.target.value)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('dateRegDeadline') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Apply Link / registration channel *</label>
                                <input
                                  type="text"
                                  id="appLink"
                                  placeholder="https://careers.google.com"
                                  value={appLink}
                                  onChange={e => setAppLink(e.target.value)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('appLink') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Logo URL</label>
                                <input
                                  type="text"
                                  placeholder="https://example.com/logo.png"
                                  value={compLogo}
                                  onChange={e => setCompLogo(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium font-semibold">Min CGPA requirement *</label>
                                <input
                                  type="number"
                                  id="minCGPA"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  value={minCGPA || ''}
                                  onChange={e => setMinCGPA(parseFloat(e.target.value) || 0)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('minCGPA') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Max Backlogs Allowed</label>
                                <select
                                  value={maxBacklogs}
                                  onChange={e => setMaxBacklogs(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                >
                                  <option value="0">0 (No Active Backlogs)</option>
                                  <option value="1">1 Active Backlog</option>
                                  <option value="2">2 Active Backlogs</option>
                                  <option value="No Restriction">No Restriction</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-muted-foreground block font-medium">Skills Requirements</label>
                              <textarea
                                value={reqSkills}
                                onChange={e => setReqSkills(e.target.value)}
                                placeholder="e.g. ReactJS, NodeJS, MongoDB"
                                rows={2}
                                className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Internship Form */}
                      {category === 'internship' && (
                        <div className="space-y-4">
                          <div className="border border-white/5 rounded-2xl p-4 bg-zinc-950/20 space-y-3">
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Internship details</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Company Name *</label>
                                <input
                                  type="text"
                                  id="compName"
                                  placeholder="e.g. Google"
                                  value={compName}
                                  onChange={e => setCompName(e.target.value)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('compName') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Internship Role Title *</label>
                                <input
                                  type="text"
                                  id="jobRoleTitle"
                                  placeholder="e.g. Frontend Intern"
                                  value={jobRoleTitle}
                                  onChange={e => setJobRoleTitle(e.target.value)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('jobRoleTitle') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Monthly Stipend *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 50,000 / Month"
                                  value={stipend}
                                  onChange={e => setStipend(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Duration *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 6 Months"
                                  value={duration}
                                  onChange={e => setDuration(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Work Mode *</label>
                                <select
                                  id="internshipMode"
                                  value={internshipMode}
                                  onChange={e => setInternshipMode(e.target.value as any)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('internshipMode') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                >
                                  <option value="On-Site">On-Site</option>
                                  <option value="Hybrid">Hybrid</option>
                                  <option value="Remote">Remote</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Reg Deadline *</label>
                                <input
                                  type="date"
                                  id="dateRegDeadline"
                                  value={dateRegDeadline}
                                  onChange={e => setDateRegDeadline(e.target.value)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('dateRegDeadline') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Apply Link / Registration Channel *</label>
                                <input
                                  type="text"
                                  id="appLink"
                                  placeholder="https://careers.google.com"
                                  value={appLink}
                                  onChange={e => setAppLink(e.target.value)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('appLink') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium font-semibold">Min CGPA *</label>
                                <input
                                  type="number"
                                  id="minCGPA"
                                  step="0.1"
                                  value={minCGPA || ''}
                                  onChange={e => setMinCGPA(parseFloat(e.target.value) || 0)}
                                  className={`w-full bg-secondary/80 border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 ${invalidFields.includes('minCGPA') ? 'border-red-500/80 bg-red-500/5' : 'border-white/5'}`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Event Form */}
                      {category === 'event' && (
                        <div className="space-y-4">
                          <div className="border border-white/5 rounded-2xl p-4 bg-zinc-950/20 space-y-3">
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">College Event details</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Event Name *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Hackathon 2026"
                                  value={eventName}
                                  onChange={e => setEventName(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Event Type</label>
                                <select
                                  value={eventType}
                                  onChange={e => setEventType(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                >
                                  {['Workshop', 'Hackathon', 'Seminar', 'Cultural', 'Sports', 'Symposium'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Event Date *</label>
                                <input
                                  type="date"
                                  value={eventDate}
                                  onChange={e => setEventDate(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Event Time</label>
                                <input
                                  type="time"
                                  value={eventTime}
                                  onChange={e => setEventTime(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Venue / Room *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Seminar Hall 3"
                                  value={venue}
                                  onChange={e => setVenue(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Registration Link / apply URL *</label>
                                <input
                                  type="text"
                                  placeholder="https://events.college.edu"
                                  value={appLink}
                                  onChange={e => setAppLink(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Entry Fee / Pricing</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Free or 100 INR"
                                  value={entryFee}
                                  onChange={e => setEntryFee(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-muted-foreground block font-medium">Brief Description *</label>
                              <textarea
                                value={eventDescription}
                                onChange={e => setEventDescription(e.target.value)}
                                placeholder="Give details about the event schedule, speakers, etc."
                                rows={2}
                                className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notice Form */}
                      {category === 'notice' && (
                        <div className="space-y-4">
                          <div className="border border-white/5 rounded-2xl p-4 bg-zinc-950/20 space-y-3">
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Official Circular / Notice Details</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Circular Number *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. CC/NOTICE/2026/045"
                                  value={circularNumber}
                                  onChange={e => setCircularNumber(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Notice Title *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Independence Day holiday declaration"
                                  value={circularTitle}
                                  onChange={e => setCircularTitle(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Issued By *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Dean Academics Office"
                                  value={issuedBy}
                                  onChange={e => setIssuedBy(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Notice Date *</label>
                                <input
                                  type="date"
                                  value={effectiveDate}
                                  onChange={e => setEffectiveDate(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Notice PDF Link</label>
                                <input
                                  type="text"
                                  placeholder="e.g. https://collegestorage.com/circulars/45.pdf"
                                  value={pdfAttachment}
                                  onChange={e => setPdfAttachment(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Emergency Form */}
                      {category === 'emergency' && (
                        <div className="space-y-4">
                          <div className="border border-white/5 rounded-2xl p-4 bg-red-950/20 border-red-500/20 space-y-3">
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Emergency Alert Details</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Emergency Title *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Extreme weather advisory / Heavy Rains"
                                  value={title}
                                  onChange={e => setTitle(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Emergency Category</label>
                                <select
                                  value={alertCategory}
                                  onChange={e => setAlertCategory(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                >
                                  {['Weather', 'Security', 'Health', 'Infrastructure', 'General Alert'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-muted-foreground block font-medium">Emergency Message *</label>
                              <textarea
                                value={emergencyMessage}
                                onChange={e => setEmergencyMessage(e.target.value)}
                                placeholder="State clearly what is happening and what action students need to take immediately..."
                                rows={3}
                                className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none focus:border-red-500"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Affected Area / Buildings</label>
                                <input
                                  type="text"
                                  placeholder="e.g. All Block, Main Campus"
                                  value={affectedBuildings}
                                  onChange={e => setAffectedBuildings(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-muted-foreground block font-medium">Emergency Contacts / Helplines</label>
                                <input
                                  type="text"
                                  placeholder="e.g. +91 999999999"
                                  value={emergencyContacts}
                                  onChange={e => setEmergencyContacts(e.target.value)}
                                  className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Image Attachment (For Step 2) */}
                      {['announcement', 'placement', 'internship', 'event'].includes(category) && (
                        <div className="space-y-1.5 border border-white/5 p-4 rounded-xl bg-zinc-950/20">
                          <label className="text-[10px] text-muted-foreground block font-medium">Optional Graphic Banner / Attachment</label>
                          {imagePreview ? (
                            <div className="relative rounded-xl overflow-hidden max-h-40 border border-white/5">
                              <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-36" />
                              <button
                                type="button"
                                onClick={() => setImagePreview(null)}
                                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-red-400"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              className="w-full h-16 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors"
                            >
                              <Camera className="h-4 w-4 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground font-bold">Upload banner image</span>
                            </button>
                          )}
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                        </div>
                      )}

                      {/* Wizard Step 2 Controls */}
                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                        >
                          Back
                        </button>
                        <Button
                          type="button"
                          onClick={() => {
                            // Validation checks
                            if (category === 'announcement' && (!title.trim() || !description.trim())) {
                              toast.error('Please fill in Announcement Title and Description');
                              return;
                            }
                            if (category === 'placement' && (!compName.trim() || !jobRoleTitle.trim() || !dateRegDeadline || !appLink.trim())) {
                              toast.error('Company Name, Job Role, Deadline, and Registration Link are required');
                              return;
                            }
                            if (category === 'internship' && (!compName.trim() || !jobRoleTitle.trim() || !dateRegDeadline || !appLink.trim())) {
                              toast.error('Company Name, Job Role, Deadline, and Apply Link are required');
                              return;
                            }
                            if (category === 'event' && (!eventName.trim() || !eventDate || !appLink.trim())) {
                              toast.error('Event Name, Date, and Apply Link are required');
                              return;
                            }
                            if (category === 'notice' && (!circularTitle.trim() || !circularNumber.trim())) {
                              toast.error('Circular Title and Circular Number are required');
                              return;
                            }
                            if (category === 'emergency' && (!title.trim() || !emergencyMessage.trim())) {
                              toast.error('Emergency Title and Message are required');
                              return;
                            }
                            setWizardStep(3);
                          }}
                          className="rounded-xl gradient-primary px-5 h-10 font-bold text-xs shadow-lg glow-primary"
                        >
                          Next: Target Audience
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: ELIGIBILITY & AUDIENCE TARGETING */}
                  {wizardStep === 3 && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary uppercase text-[9px]">Step 3</span>
                          Eligibility & Audience Targeting
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Filters Column 1 */}
                        <div className="space-y-4 md:col-span-2">
                          {/* Academic Years & Graduation Batch */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-white/5 bg-zinc-950/20 p-4 rounded-xl">
                            <div className="space-y-2">
                              <label className="text-[11px] text-primary font-bold uppercase tracking-wider block">Academic Years</label>
                              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {['1st Year', '2nd Year', '3rd Year', '4th Year', 'All Years'].map((yr) => (
                                  <label key={yr} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={yr === 'All Years' ? targetYears.length === 4 : targetYears.includes(yr)}
                                      onChange={(e) => {
                                        if (yr === 'All Years') {
                                          setTargetYears(e.target.checked ? ['1st Year', '2nd Year', '3rd Year', '4th Year'] : []);
                                        } else {
                                          if (e.target.checked) {
                                            setTargetYears([...targetYears.filter(y => y !== 'All Years'), yr]);
                                          } else {
                                            setTargetYears(targetYears.filter(y => y !== yr));
                                          }
                                        }
                                      }}
                                      className="accent-primary rounded"
                                    />
                                    <span>{yr}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] text-primary font-bold uppercase tracking-wider block">Graduation Batch</label>
                              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {['2026', '2027', '2028', '2029', '2030', 'All Batches'].map((b) => (
                                  <label key={b} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={b === 'All Batches' ? passingBatches.length === 5 : passingBatches.includes(b)}
                                      onChange={(e) => {
                                        if (b === 'All Batches') {
                                          setPassingBatches(e.target.checked ? ['2026', '2027', '2028', '2029', '2030'] : []);
                                        } else {
                                          if (e.target.checked) {
                                            setPassingBatches([...passingBatches.filter(x => x !== 'All Batches'), b]);
                                          } else {
                                            setPassingBatches(passingBatches.filter(x => x !== b));
                                          }
                                        }
                                      }}
                                      className="accent-primary rounded"
                                    />
                                    <span>{b}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Departments */}
                          <div className="border border-white/5 bg-zinc-950/20 p-4 rounded-xl space-y-2">
                            <label className="text-[11px] text-primary font-bold uppercase tracking-wider block">Departments</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {['CSE', 'CSE AIML', 'CSE DS', 'IT', 'ECE', 'EEE', 'Civil', 'Mechanical', 'MBA', 'MCA', 'All Departments'].map((dept) => (
                                <label key={dept} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={dept === 'All Departments' ? targetDepts.length === 10 : targetDepts.includes(dept)}
                                    onChange={(e) => {
                                      if (dept === 'All Departments') {
                                        setTargetDepts(e.target.checked ? ['CSE', 'CSE AIML', 'CSE DS', 'IT', 'ECE', 'EEE', 'Civil', 'Mechanical', 'MBA', 'MCA'] : []);
                                      } else {
                                        if (e.target.checked) {
                                          setTargetDepts([...targetDepts.filter(x => x !== 'All Departments'), dept]);
                                        } else {
                                          setTargetDepts(targetDepts.filter(d => d !== dept));
                                        }
                                      }
                                    }}
                                    className="accent-primary rounded"
                                  />
                                  <span>{dept}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Gender, CGPA, Backlogs, Placement Type, College */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-white/5 bg-zinc-950/20 p-4 rounded-xl">
                            <div className="space-y-2">
                              <label className="text-[11px] text-primary font-bold uppercase tracking-wider block">Gender Targeting</label>
                              <div className="flex flex-wrap gap-3">
                                {['Everyone', 'Male', 'Female', 'Other'].map((g) => (
                                  <label key={g} className="flex items-center gap-1.5 text-xs text-white cursor-pointer select-none">
                                    <input
                                      type="radio"
                                      name="genderRestrict"
                                      checked={genderRestrict === g}
                                      onChange={() => setGenderRestrict(g)}
                                      className="accent-primary"
                                    />
                                    <span>{g}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] text-primary font-bold uppercase tracking-wider block">Placement Type</label>
                              <div className="flex flex-wrap gap-2">
                                {['Full Time', 'Internship', 'Internship + PPO', 'Contract'].map((pt) => (
                                  <label key={pt} className="flex items-center gap-1.5 text-xs text-white cursor-pointer select-none">
                                    <input
                                      type="radio"
                                      name="placementType"
                                      checked={placementType === pt}
                                      onChange={() => setPlacementType(pt)}
                                      className="accent-primary"
                                    />
                                    <span>{pt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-muted-foreground font-semibold">Minimum CGPA</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                value={minCGPA}
                                onChange={(e) => setMinCGPA(parseFloat(e.target.value) || 0)}
                                className="w-full bg-secondary/80 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                                placeholder="e.g. 8.0"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-muted-foreground font-semibold">Maximum Active Backlogs</label>
                              <select
                                value={maxBacklogs}
                                onChange={(e) => setMaxBacklogs(e.target.value)}
                                className="w-full bg-secondary/85 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                              >
                                <option value="0">0</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="No Restriction">No Restriction</option>
                              </select>
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                              <label className="text-[11px] text-primary font-bold uppercase tracking-wider block">College Scope</label>
                              <div className="flex flex-wrap gap-3">
                                {['Current College', 'All Connected Colleges', 'Selected Colleges'].map((col) => (
                                  <label key={col} className="flex items-center gap-1.5 text-xs text-white cursor-pointer select-none">
                                    <input
                                      type="radio"
                                      name="collegesSelection"
                                      checked={collegesSelection === col}
                                      onChange={() => setCollegesSelection(col)}
                                      className="accent-primary"
                                    />
                                    <span>{col}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Eligible Skills Chips */}
                          <div className="border border-white/5 bg-zinc-950/20 p-4 rounded-xl space-y-2">
                            <label className="text-[11px] text-primary font-bold uppercase tracking-wider block">Eligible Skills</label>
                            <div className="flex flex-wrap gap-2">
                              {['Java', 'Python', 'React', 'Node', 'AI', 'ML', 'Cloud', 'Cyber Security', 'Data Science', 'DevOps', 'Android', 'Other'].map((skill) => {
                                const selected = selectedSkills.includes(skill);
                                return (
                                  <button
                                    type="button"
                                    key={skill}
                                    onClick={() => {
                                      if (selected) {
                                        setSelectedSkills(selectedSkills.filter(s => s !== skill));
                                      } else {
                                        setSelectedSkills([...selectedSkills, skill]);
                                      }
                                    }}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                      selected 
                                        ? 'bg-primary/20 border-primary text-primary' 
                                        : 'bg-secondary/40 border-white/5 text-muted-foreground hover:text-white'
                                    }`}
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Audience Statistics Column */}
                        <div className="space-y-4">
                          <div className="border border-primary/20 bg-gradient-to-b from-primary/5 to-secondary/10 p-5 rounded-2xl space-y-4 animate-pulse-subtle">
                            <span className="text-[11px] text-primary font-bold uppercase tracking-wider block">Live Audience Preview</span>
                            
                            <div className="space-y-3">
                              <div className="bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                                <span className="text-[9px] text-muted-foreground block font-bold uppercase">Eligible Students</span>
                                <span className="text-2xl font-black text-white">{audienceStats.eligibleStudents}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-white/5">
                                  <span className="text-[8px] text-muted-foreground block font-bold uppercase">Male</span>
                                  <span className="text-sm font-bold text-sky-400">{audienceStats.eligibleMale}</span>
                                </div>
                                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-white/5">
                                  <span className="text-[8px] text-muted-foreground block font-bold uppercase">Female</span>
                                  <span className="text-sm font-bold text-pink-400">{audienceStats.eligibleFemale}</span>
                                </div>
                              </div>

                              <div className="bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                                <span className="text-[9px] text-muted-foreground block font-bold uppercase">Average CGPA</span>
                                <span className="text-lg font-black text-white">{audienceStats.averageCGPA || '0.0'}</span>
                              </div>

                              <div className="bg-zinc-950/40 p-3 rounded-xl border border-white/5 space-y-1">
                                <span className="text-[9px] text-muted-foreground block font-bold uppercase">Target Batches</span>
                                <div className="flex flex-wrap gap-1">
                                  {audienceStats.targetBatches.length > 0 ? (
                                    audienceStats.targetBatches.map(b => (
                                      <span key={b} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-slate-300 font-semibold">{b}</span>
                                    ))
                                  ) : (
                                    <span className="text-[9px] text-muted-foreground italic">None matching</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 controls */}
                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                        >
                          Back
                        </button>
                        <Button
                          type="button"
                          onClick={() => setWizardStep(4)}
                          className="rounded-xl gradient-primary px-5 h-10 font-bold text-xs shadow-lg glow-primary"
                        >
                          Next: Live Preview
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: LIVE STUDENT PREVIEW */}
                  {wizardStep === 4 && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Live Student Feed Preview</span>
                      
                      {/* Premium card design matching the Student Feed */}
                      <div className="glass-card p-5 border border-primary/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 shadow-2xl space-y-4 max-w-md mx-auto">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[9px] bg-primary/20 text-primary font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                            {category}
                          </span>
                          <span className="text-[9px] text-muted-foreground">Preview Mode</span>
                        </div>

                        {category === 'announcement' && (
                          <div className="space-y-2">
                            <span className="text-[9px] text-primary font-bold">{subCategory} Announcement</span>
                            <h3 className="text-sm font-black text-white">{title || 'Exam Notice Released'}</h3>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{description || 'All students are requested to download...'}</p>
                          </div>
                        )}

                        {category === 'placement' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              {compLogo ? (
                                <img src={compLogo} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-sm">
                                  {compName ? compName.charAt(0) : 'C'}
                                </div>
                              )}
                              <div>
                                <h3 className="text-xs font-black text-white">{jobRoleTitle || 'Software Engineer'}</h3>
                                <p className="text-[10px] text-muted-foreground">{compName || 'Google'}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[9px] text-slate-300">
                              <span className="bg-white/5 px-2 py-1 rounded">💰 {salaryCTC || '12 LPA'}</span>
                              <span className="bg-white/5 px-2 py-1 rounded">📍 {workMode || 'Remote'}</span>
                              <span className="bg-white/5 px-2 py-1 rounded">🎓 CGPA {'>='} {minCGPA || '0.0'}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2">
                              Hiring drive at {compName || 'Google'} for {jobRoleTitle || 'Software Engineer'}. Apply before registry closure.
                            </p>
                          </div>
                        )}

                        {category === 'internship' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-400 text-sm">
                                {compName ? compName.charAt(0) : 'I'}
                              </div>
                              <div>
                                <h3 className="text-xs font-black text-white">{jobRoleTitle || 'Fullstack Intern'}</h3>
                                <p className="text-[10px] text-muted-foreground">{compName || 'Microsoft'}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[9px] text-slate-300">
                              <span className="bg-white/5 px-2 py-1 rounded">💰 {stipend || '50k / Month'}</span>
                              <span className="bg-white/5 px-2 py-1 rounded">⏱️ {duration || '6 Months'}</span>
                              <span className="bg-white/5 px-2 py-1 rounded">🎓 Min CGPA {minCGPA || '0.0'}</span>
                            </div>
                          </div>
                        )}

                        {category === 'event' && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">{eventType}</span>
                                <h3 className="text-sm font-black text-white mt-0.5">{eventName || 'National Hackathon'}</h3>
                              </div>
                              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-2 py-0.5 rounded font-black">{entryFee || 'Free'}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground space-y-1">
                              <div>📅 Date: {eventDate || '2026-08-15'} | Time: {eventTime || '09:00 AM'}</div>
                              <div>📍 Venue: {venue || 'Main Seminar Hall'}</div>
                            </div>
                          </div>
                        )}

                        {category === 'notice' && (
                          <div className="space-y-2.5">
                            <span className="text-[9px] text-amber-500 font-semibold">{circularNumber || 'CC/MEMO/045'}</span>
                            <h3 className="text-sm font-black text-white">{circularTitle || 'Summer Vacation Declaration'}</h3>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                              <span>Issued By: {issuedBy || 'Dean Admin'}</span>
                              <span>Date: {effectiveDate || '2026-07-06'}</span>
                            </div>
                          </div>
                        )}

                        {category === 'emergency' && (
                          <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-red-400 font-black uppercase text-[10px]">
                              <span>🚨 EMERGENCY ALERT</span>
                              <span>{severity} Severity</span>
                            </div>
                            <h3 className="text-xs font-black text-white">{title || 'Severe Weather Warning'}</h3>
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{emergencyMessage || 'Please evacuate immediately...'}"</p>
                          </div>
                        )}

                        {/* Target Audience Summary details */}
                        <div className="border border-white/5 bg-zinc-950/40 p-3 rounded-xl text-[10px] text-slate-300 space-y-1">
                          <span className="text-primary font-bold uppercase tracking-wider block text-[8px] mb-1">Target Audience Rule Details</span>
                          <div>🎓 Years: {targetYears.length > 0 ? targetYears.join(', ') : 'All Years'}</div>
                          <div>🏢 Departments: {targetDepts.length > 0 ? targetDepts.join(', ') : 'All Departments'}</div>
                          <div>🚻 Gender Scope: {genderRestrict}</div>
                          <div>📅 Target Batches: {passingBatches.length > 0 ? passingBatches.join(', ') : 'All Batches'}</div>
                          <div>👥 Expected Audience Reach: <span className="font-bold text-primary">{audienceStats.eligibleStudents} students</span></div>
                        </div>

                        {imagePreview && (
                          <img src={imagePreview} alt="Graphic Banner" className="w-full max-h-36 object-cover rounded-xl mt-2 border border-white/5" />
                        )}

                        {appLink && (
                          <button
                            type="button"
                            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Apply / Register Now
                          </button>
                        )}
                      </div>

                      {/* Step 4 navigation */}
                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                        >
                          Back
                        </button>
                        <Button
                          type="button"
                          onClick={() => setWizardStep(5)}
                          className="rounded-xl gradient-primary px-5 h-10 font-bold text-xs shadow-lg glow-primary"
                        >
                          Next: Publish Settings
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 5: PUBLISH SETTINGS */}
                  {wizardStep === 5 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1 }} className="space-y-4">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Configure Publication Channels</span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Channels Checklist */}
                        <div className="border border-white/5 rounded-2xl p-4 bg-zinc-950/20 space-y-3">
                          <span className="text-[11px] text-primary font-bold uppercase tracking-wider block">Communication Channels</span>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={sendPush}
                                onChange={e => setSendPush(e.target.checked)}
                                className="accent-primary rounded"
                              />
                              <span>Send Push Notification to Student Portal Feed</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={sendEmail}
                                onChange={e => setSendEmail(e.target.checked)}
                                className="accent-primary rounded"
                              />
                              <span>Dispatch Broadcast to Student Email accounts</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={sendSMS}
                                onChange={e => setSendSMS(e.target.checked)}
                                className="accent-primary rounded"
                              />
                              <span>Deliver Emergency SMS alerts</span>
                            </label>
                          </div>
                        </div>

                        {/* Stacking & Policy options */}
                        <div className="border border-white/5 rounded-2xl p-4 bg-zinc-950/20 space-y-3">
                          <span className="text-[11px] text-primary font-bold uppercase tracking-wider block">Expiry & Anchors</span>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground block font-medium">Schedule Expire / Auto Archive Date</label>
                              <input
                                type="date"
                                value={scheduledExpiryDate}
                                onChange={e => setScheduledExpiryDate(e.target.value)}
                                className="w-full bg-secondary/80 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={requireAcknowledgement}
                                onChange={e => setRequireAcknowledgement(e.target.checked)}
                                className="accent-primary rounded"
                              />
                              <span>Require Acknowledgement (Students must click 'read')</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isPinned}
                                onChange={e => setIsPinned(e.target.checked)}
                                className="accent-primary rounded"
                              />
                              <span>Pin this broadcast to the top of the feed</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Step 5 action buttons */}
                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setWizardStep(4)}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                        >
                          Back
                        </button>
                        <Button
                          onClick={() => handleSubmit(false)}
                          disabled={isCreating}
                          className="rounded-xl gradient-primary px-6 h-10 font-bold text-xs shadow-lg glow-primary"
                        >
                          {isCreating ? 'Publishing...' : 'Publish Broadcast'}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                  </div>
                </div>
              )}
            {/* Broadcasts List */}
            <div className="px-5">
              <h2 className="text-[10px] font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                {showTrashView ? (
                  <>
                    <Trash2 className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                    Deleted Broadcasts (Trash Can)
                  </>
                ) : (
                  <>
                    <Megaphone className="h-3.5 w-3.5 text-primary" />
                    Active Announcements
                  </>
                )}
              </h2>
              
              {showTrashView ? (
                trashList.length === 0 ? (
                  <EmptyState title="Trash is empty" description="No deleted broadcasts found." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trashList.map((ann) => (
                      <div key={ann.id} className="glass-card p-4 flex flex-col justify-between border border-red-500/10">
                        <div>
                          <div className="flex items-start justify-between">
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-red-500/10 text-red-400">
                              {ann.category}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  const { restoreAnnouncement } = useAnnouncementStore.getState();
                                  await restoreAnnouncement(ann.id);
                                  const trash = await useAnnouncementStore.getState().fetchTrash();
                                  setTrashList(trash);
                                  fetchAnnouncements(college);
                                }}
                                className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center hover:bg-emerald-500/20 transition-colors text-emerald-400"
                                title="Restore"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm("Are you sure you want to permanently delete this broadcast? This action cannot be undone.")) {
                                    const { permanentDeleteAnnouncement } = useAnnouncementStore.getState();
                                    await permanentDeleteAnnouncement(ann.id);
                                    const trash = await useAnnouncementStore.getState().fetchTrash();
                                    setTrashList(trash);
                                  }
                                }}
                                className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors text-red-400"
                                title="Delete Permanently"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <h3 className="text-xs font-bold text-foreground mt-2">{ann.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ann.description}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground/60 mt-3">
                            Deleted {ann.deletedAt ? formatDistanceToNow(new Date(ann.deletedAt), { addSuffix: true }) : 'recently'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                myAnnouncements.length === 0 ? (
                  <EmptyState title="No announcements yet" description="Create your first campus announcement!" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myAnnouncements.map((ann) => (
                      <div key={ann.id} className="glass-card p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-primary/10 text-primary">
                                {ann.category}
                              </span>
                              {ann.isPinned && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-500/10 text-amber-400 flex items-center gap-1">
                                  <Pin className="h-2 w-2 fill-amber-400" /> Pinned
                                </span>
                              )}
                              {ann.status === 'archived' && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-500/10 text-slate-400">
                                  Archived
                                </span>
                              )}
                            </div>
                            
                            <div>
                              <button
                                onClick={(e) => handleTriggerClick(e, ann.id)}
                                className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {activeMenuId === ann.id && menuCoords && createPortal(
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => { setActiveMenuId(null); setMenuCoords(null); }} />
                                  <div 
                                    style={{ 
                                      position: 'absolute',
                                      top: menuCoords.top, 
                                      left: menuCoords.left,
                                      width: '176px',
                                      zIndex: 9999
                                    }}
                                    className="rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-2xl py-1.5 overflow-hidden"
                                  >
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        handleEditClick(ann);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <Edit3 className="h-3.5 w-3.5 text-blue-400" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      onClick={async () => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        const { togglePinAnnouncement } = useAnnouncementStore.getState();
                                        await togglePinAnnouncement(ann.id);
                                        fetchAnnouncements(college);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <Pin className={`h-3.5 w-3.5 ${ann.isPinned ? 'text-amber-400 fill-amber-400/50' : 'text-slate-400'}`} />
                                      <span>{ann.isPinned ? 'Unpin' : 'Pin'}</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        setPreviewBroadcast(ann);
                                        setShowPreviewModal(true);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-cyan-400" />
                                      <span>Preview</span>
                                    </button>

                                    <button
                                      onClick={async () => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        const { duplicateAnnouncement } = useAnnouncementStore.getState();
                                        await duplicateAnnouncement(ann.id);
                                        fetchAnnouncements(college);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <Copy className="h-3.5 w-3.5 text-indigo-400" />
                                      <span>Duplicate</span>
                                    </button>

                                    <button
                                      onClick={async () => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        const { archiveAnnouncement } = useAnnouncementStore.getState();
                                        await archiveAnnouncement(ann.id);
                                        fetchAnnouncements(college);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <Archive className="h-3.5 w-3.5 text-amber-500" />
                                      <span>Archive</span>
                                    </button>

                                    <div className="border-t border-white/5 my-1" />

                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        setAnalyticsBroadcast(ann);
                                        setShowAnalyticsModal(true);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                                      <span>Analytics</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        handleShare(ann);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <Share2 className="h-3.5 w-3.5 text-teal-400" />
                                      <span>Share</span>
                                    </button>

                                    <div className="border-t border-white/5 my-1" />

                                    <button
                                      onClick={async () => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        if (confirm('Move this broadcast to Trash?')) {
                                          const { deleteAnnouncement } = useAnnouncementStore.getState();
                                          await deleteAnnouncement(ann.id);
                                          fetchAnnouncements(college);
                                        }
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Move to Trash</span>
                                    </button>
                                  </div>
                                </>,
                                document.body
                              )}
                            </div>
                          </div>
                          <h3 className="text-xs font-bold text-foreground mt-2">{ann.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ann.description}</p>
                        </div>
                        
                        <div>
                          {ann.imageURL && (
                            <img src={ann.imageURL} alt={ann.title} className="w-full max-h-32 object-cover rounded-xl mt-3" />
                          )}
                          <p className="text-[9px] text-muted-foreground/60 mt-3">
                            {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}

        {/* Alumni approvals tab */}
        {activeAdminTab === 'alumni' && (
          <motion.div
            key="alumni"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="px-5 space-y-4"
          >
            <h2 className="text-[10px] font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Users className="h-3.5 w-3.5 text-primary" /> Pending Alumni Verifications ({alumniVerifications.filter(v => v.status === 'pending').length})
            </h2>

            {alumniLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : alumniVerifications.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground text-xs italic">
                No alumni verification records found.
              </div>
            ) : (
              <div className="space-y-3">
                {alumniVerifications.map((verification) => (
                  <div key={verification._id} className="glass-card p-5 space-y-4 border border-white/5 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            verification.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                            verification.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {verification.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Class of {verification.batch} • Roll: {verification.rollNumber}</span>
                        </div>
                        <h3 className="text-xs font-bold mt-2 text-foreground">{verification.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{verification.email}</p>
                      </div>

                      {verification.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleRejectAlumni(verification._id)}
                            variant="outline"
                            className="border-red-500/20 hover:bg-red-500/10 text-red-400 h-8 px-3 rounded-lg text-[10px] font-bold"
                          >
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleApproveAlumni(verification._id)}
                            className="bg-green-600 hover:bg-green-500 text-white h-8 px-3 rounded-lg text-[10px] font-bold"
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* College registry domains tab */}
        {activeAdminTab === 'colleges' && (
          <motion.div
            key="colleges"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="px-5 space-y-5"
          >
            {/* Add college domain form */}
            <form onSubmit={handleAddCollege} className="glass-card p-5 space-y-4">
              <h3 className="text-xs font-semibold text-foreground">Register New College Domain</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={newCollegeName}
                  onChange={e => setNewCollegeName(e.target.value)}
                  placeholder="College Name (e.g. Stanford University)"
                  required
                  className="bg-secondary border border-white/10 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  value={newCollegeDomain}
                  onChange={e => setNewCollegeDomain(e.target.value)}
                  placeholder="Domain (e.g. stanford.edu)"
                  required
                  className="bg-secondary border border-white/10 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <Button
                type="submit"
                disabled={isAddingCollege || !newCollegeName.trim() || !newCollegeDomain.trim()}
                className="w-full gradient-primary rounded-xl h-10 text-xs font-semibold glow-primary"
              >
                {isAddingCollege ? 'Adding Domain...' : 'Register Domain'}
              </Button>
            </form>

            {/* Allowed colleges list */}
            <div>
              <h2 className="text-[10px] font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                <Globe className="h-3.5 w-3.5 text-primary" /> Allowed Domains ({colleges.length})
              </h2>

              {collegesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : colleges.length === 0 ? (
                <div className="glass-card p-10 text-center text-muted-foreground text-xs italic">
                  No colleges registered yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {colleges.map((collegeItem) => (
                    <div key={collegeItem._id} className="glass-card p-4 flex items-center justify-between border border-white/5">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{collegeItem.name}</h4>
                        <span className="text-[10px] text-primary font-semibold">{collegeItem.domain}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleCollegeStatus(collegeItem._id, collegeItem.status || 'active')}
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition-all ${
                            (collegeItem.status || 'active') === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                          title="Click to toggle Status"
                        >
                          {collegeItem.status || 'active'}
                        </button>
                        <button
                          onClick={() => handleDeleteCollege(collegeItem._id)}
                          className="h-7 w-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                          title="Delete Domain"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Security Logs tab */}
        {activeAdminTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="px-5 space-y-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-[10px] font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                <Shield className="h-3.5 w-3.5 text-primary" /> System Security & Audit Log
              </h2>
              {securityLogs.length > 0 && (
                <button
                  onClick={() => {
                    const headers = ['Time', 'User/Email', 'Event', 'Status', 'IP Address'];
                    const rows = securityLogs.map(log => [
                      new Date(log.createdAt).toISOString(),
                      log.email || log.userId || 'system',
                      log.event,
                      log.status,
                      log.ipAddress || 'unknown'
                    ]);
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `security_logs_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success('CSV Export started!');
                  }}
                  className="rounded-xl border border-white/5 bg-secondary/30 hover:bg-secondary text-[10px] font-bold px-3 py-1.5 flex items-center gap-1.5 text-slate-300"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" /> Export CSV
                </button>
              )}
            </div>

            {logsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : securityLogs.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground text-xs italic">
                No security events logged.
              </div>
            ) : (
              <div className="glass-card overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-white/5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider font-semibold">
                        <th className="p-3">Time</th>
                        <th className="p-3">User/Email</th>
                        <th className="p-3">Event</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {securityLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-secondary/20 transition-colors">
                          <td className="p-3 text-[10px] whitespace-nowrap text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-foreground">{log.email || log.userId || 'system'}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-medium text-foreground/80">{log.event}</span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[9px] font-bold uppercase ${log.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-muted-foreground">
                            {log.ipAddress || 'unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* User Reports Tab */}
        {activeAdminTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="px-5 space-y-4"
          >
            <h2 className="text-[10px] font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5 text-primary" /> Pending Moderation Reports ({reports.length})
            </h2>

            {reportsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : reports.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground text-xs italic">
                No active reports pending review. Clear dashboard! 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report._id} className="glass-card p-5 space-y-4 border border-white/5 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {report.type}
                        </span>
                        <h3 className="text-xs font-bold mt-1 text-foreground">
                          Reported User: {report.reported ? report.reported.name : 'Unknown User'}
                        </h3>
                        <p className="text-[10px] text-muted-foreground">{report.reported ? report.reported.email : report.reportedNameOrEmail}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleResolveReport(report._id, 'dismiss')}
                          variant="outline"
                          className="border-white/10 hover:bg-secondary h-8 px-3 rounded-lg text-[10px] font-bold"
                        >
                          Dismiss
                        </Button>
                        <Button
                          onClick={() => handleResolveReport(report._id, 'suspend')}
                          disabled={report.reported?.isSuspended}
                          className="bg-red-600 hover:bg-red-500 text-white h-8 px-3 rounded-lg text-[10px] font-bold"
                        >
                          {report.reported?.isSuspended ? 'Suspended' : 'Suspend User'}
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1 text-xs">
                      <p className="font-semibold text-foreground/90">Reason details:</p>
                      <p className="text-muted-foreground leading-relaxed italic">"{report.reason}"</p>
                    </div>

                    <div className="text-[9px] text-muted-foreground/60 flex items-center justify-between">
                      <span>Reporter: {report.reporter ? `${report.reporter.name} (${report.reporter.email})` : 'Anonymous'}</span>
                      <span>{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Support Help Desk Tab */}
        {activeAdminTab === 'tickets' && (
          <motion.div
            key="tickets"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="px-5 space-y-4"
          >
            <h2 className="text-[10px] font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <LifeBuoy className="h-3.5 w-3.5 text-primary" /> Support Tickets ({tickets.length})
            </h2>

            {ticketsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground text-xs italic">
                No support tickets filed yet. Great support history!
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket._id} className="glass-card p-5 space-y-4 border border-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            ticket.status === 'Open' ? 'bg-green-500/10 text-green-400' :
                            ticket.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' :
                            ticket.status === 'Resolved' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {ticket.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">User: {ticket.name} ({ticket.email})</span>
                        </div>
                        <h3 className="text-xs font-bold text-foreground mt-2">{ticket.subject}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ticket.description}</p>
                      </div>

                      <Button
                        onClick={() => {
                          setReplyTicketId(replyTicketId === ticket._id ? null : ticket._id);
                          setReplyText('');
                        }}
                        className="bg-primary hover:bg-primary/90 text-white rounded-lg h-8 px-3 text-[10px] font-bold shrink-0"
                      >
                        Reply / Edit
                      </Button>
                    </div>

                    {/* Replies count */}
                    {ticket.replies && ticket.replies.length > 0 && (
                      <div className="pl-4 border-l border-white/10 space-y-2.5">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">Thread Replies ({ticket.replies.length})</p>
                        {ticket.replies.map((rep: any, idx: number) => (
                          <div key={idx} className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                              <span className="font-semibold text-foreground">{rep.senderName}</span>
                              <span>• {new Date(rep.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-muted-foreground bg-secondary/35 p-2 rounded-lg border border-white/5">{rep.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline reply form */}
                    {replyTicketId === ticket._id && (
                      <form onSubmit={handleSendAdminReply} className="p-4 bg-secondary/30 border border-white/5 rounded-xl space-y-3">
                        <h4 className="text-[10px] text-foreground font-bold uppercase">Submit Support Response</h4>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write response message to the user..."
                            rows={3}
                            className="flex-1 bg-secondary border border-white/10 rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          
                          <div className="flex flex-row sm:flex-col justify-between sm:justify-start gap-2">
                            <div className="flex flex-col">
                              <label className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Status</label>
                              <select
                                value={replyStatus}
                                onChange={(e) => setReplyStatus(e.target.value)}
                                className="bg-secondary border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                              >
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </div>
                            
                            <Button
                              type="submit"
                              disabled={!replyText.trim()}
                              className="bg-primary hover:bg-primary/95 text-white rounded-lg h-9 px-4 text-xs font-bold mt-auto sm:mt-1.5"
                            >
                              Submit
                            </Button>
                          </div>
                        </div>
                      </form>
                    )}

                    <div className="text-[9px] text-muted-foreground/60 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Submitted {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Bugs management tab */}
        {activeAdminTab === 'bugs' && (
          <motion.div
            key="bugs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="px-5 space-y-4"
          >
            <h2 className="text-[10px] font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Bug className="h-3.5 w-3.5 text-primary" /> Submitted Bug Reports ({bugs.length})
            </h2>

            {bugsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : bugs.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground text-xs italic">
                No bugs reported. Clear system! 🐛
              </div>
            ) : (
              <div className="space-y-4">
                {bugs.map((bug) => (
                  <div key={bug._id} className="glass-card p-5 space-y-4 border border-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            bug.status === 'Pending' ? 'bg-amber-500/10 text-amber-400' :
                            bug.status === 'Open' ? 'bg-green-500/10 text-green-400' :
                            bug.status === 'In Progress' ? 'bg-purple-500/10 text-purple-400' :
                            bug.status === 'Resolved' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {bug.status}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            bug.priority === 'Critical' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                            bug.priority === 'High' ? 'bg-orange-500/10 text-orange-400' :
                            bug.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-slate-500/10 text-slate-400'
                          }`}>
                            {bug.priority} Priority
                          </span>
                          <span className="text-[10px] text-muted-foreground">Reporter: {bug.username || 'Unknown'} ({bug.email || 'N/A'})</span>
                        </div>
                        <h3 className="text-xs font-bold text-foreground mt-2">{bug.title || 'Untitled Bug'}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{bug.description}</p>
                      </div>

                      <div className="flex gap-1.5">
                        <Button
                          onClick={() => {
                            setReplyBugId(replyBugId === bug._id ? null : bug._id);
                            setBugInternalNotes(bug.internalNotes || '');
                            setBugStatus(bug.status);
                            setBugPriority(bug.priority);
                          }}
                          className="bg-primary hover:bg-primary/90 text-white rounded-lg h-8 px-3 text-[10px] font-bold shrink-0"
                        >
                          Manage
                        </Button>
                        <Button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this bug report permanently?')) {
                              try {
                                const res = await fetch(`http://localhost:5000/api/bugs/${bug._id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                  }
                                });
                                const json = await res.json();
                                if (json.success) {
                                  toast.success('Bug report deleted');
                                  loadBugs();
                                } else {
                                  toast.error(json.error || 'Failed to delete');
                                }
                              } catch (err) {
                                toast.error('Error deleting bug report');
                              }
                            }
                          }}
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg h-8 w-8 p-0 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Screenshot Preview */}
                    {bug.screenshotUrl && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase block">Screenshot Attachment:</span>
                        <div className="relative group max-w-sm rounded-xl overflow-hidden border border-white/10 bg-black/40">
                          <img src={bug.screenshotUrl} alt="Bug Screenshot" className="max-h-48 object-contain rounded-xl" />
                          <a
                            href={bug.screenshotUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> View Fullscreen
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Device & Browser environment info */}
                    {(bug.browser || bug.operatingSystem || bug.applicationVersion) && (
                      <div className="grid grid-cols-3 gap-3 p-3 bg-black/25 rounded-xl border border-white/5 text-[10px] text-muted-foreground font-mono">
                        <div>
                          <span className="font-bold text-foreground/80 block uppercase text-[8px] tracking-wider mb-0.5">OS / Platform</span>
                          {bug.operatingSystem || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-bold text-foreground/80 block uppercase text-[8px] tracking-wider mb-0.5">Browser</span>
                          {bug.browser || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-bold text-foreground/80 block uppercase text-[8px] tracking-wider mb-0.5">App Version</span>
                          v{bug.applicationVersion || '1.0.0'}
                        </div>
                      </div>
                    )}

                    {/* Internal Notes / Assignment display */}
                    {(bug.internalNotes || bug.assignedTo) && (
                      <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 space-y-1 text-xs">
                        {bug.assignedTo && <p className="text-white font-medium text-[10px]">👤 Assigned to: <span className="text-primary font-bold">{bug.assignedTo}</span></p>}
                        {bug.internalNotes && (
                          <>
                            <p className="font-semibold text-foreground/90 text-[10px] uppercase tracking-wider">Internal Developer Notes:</p>
                            <p className="text-muted-foreground leading-relaxed italic">"{bug.internalNotes}"</p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Inline management form */}
                    {replyBugId === bug._id && (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          try {
                            const res = await fetch(`http://localhost:5000/api/bugs/${bug._id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                              },
                              body: JSON.stringify({
                                status: bugStatus,
                                priority: bugPriority,
                                internalNotes: bugInternalNotes
                              })
                            });
                            const json = await res.json();
                            if (json.success) {
                              toast.success('Bug report updated successfully');
                              setReplyBugId(null);
                              loadBugs();
                            } else {
                              toast.error(json.error || 'Failed to update bug');
                            }
                          } catch (err) {
                            toast.error('Error updating bug report');
                          }
                        }}
                        className="p-4 bg-secondary/30 border border-white/5 rounded-xl space-y-3"
                      >
                        <h4 className="text-[10px] text-foreground font-bold uppercase">Update Bug Status & Notes</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] text-muted-foreground font-bold uppercase mb-1 block">Status</label>
                            <select
                              value={bugStatus}
                              onChange={(e) => setBugStatus(e.target.value)}
                              className="w-full bg-secondary border border-white/10 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground font-bold uppercase mb-1 block">Priority</label>
                            <select
                              value={bugPriority}
                              onChange={(e) => setBugPriority(e.target.value)}
                              className="w-full bg-secondary border border-white/10 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                              <option value="Critical">Critical</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-muted-foreground font-bold uppercase block">Internal Notes</label>
                          <textarea
                            value={bugInternalNotes}
                            onChange={(e) => setBugInternalNotes(e.target.value)}
                            placeholder="Add developer notes or debugging findings..."
                            rows={3}
                            className="w-full bg-secondary border border-white/10 rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            onClick={() => setReplyBugId(null)}
                            variant="ghost"
                            className="text-xs h-9"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="bg-primary hover:bg-primary/95 text-white rounded-lg h-9 px-4 text-xs font-bold"
                          >
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    )}

                    <div className="text-[9px] text-muted-foreground/60 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Submitted {formatDistanceToNow(new Date(bug.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {/* PREVIEW MODAL */}
        {showPreviewModal && previewBroadcast && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-2xl w-full border border-white/10 max-h-[85vh] overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-primary/20 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                      {previewBroadcast.category}
                    </span>
                    {previewBroadcast.isPinned && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        <Pin className="h-3 w-3 fill-amber-400" /> Pinned
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => { setShowPreviewModal(false); setPreviewBroadcast(null); }}
                    className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <h1 className="text-lg font-bold text-foreground leading-snug">{previewBroadcast.title}</h1>
                  <p className="text-[10px] text-muted-foreground">
                    Issued {formatDistanceToNow(new Date(previewBroadcast.createdAt), { addSuffix: true })} • Verified by Campus Admin
                  </p>
                </div>

                {previewBroadcast.imageURL && (
                  <img src={previewBroadcast.imageURL} alt={previewBroadcast.title} className="w-full max-h-64 object-cover rounded-2xl border border-white/5 shadow-lg" />
                )}

                <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-zinc-950/40 p-4 rounded-2xl border border-white/5 font-mono">
                  {previewBroadcast.description}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <Button
                    onClick={() => { setShowPreviewModal(false); setPreviewBroadcast(null); }}
                    className="rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-4 h-9"
                  >
                    Close Preview
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ANALYTICS MODAL */}
        {showAnalyticsModal && analyticsBroadcast && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="glass-card max-w-md w-full border border-white/10 shadow-2xl bg-[#0F131E]/95"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-400 animate-pulse" /> Broadcast Performance Analytics
                  </h3>
                  <button 
                    onClick={() => { setShowAnalyticsModal(false); setAnalyticsBroadcast(null); }}
                    className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-5">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Broadcast Title</p>
                    <p className="text-xs font-bold text-white mt-1 line-clamp-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">{analyticsBroadcast.title}</p>
                  </div>

                  {loadingAnalytics && (
                    <div className="space-y-4 py-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 h-20 animate-pulse flex flex-col justify-between">
                          <div className="h-2.5 bg-white/10 rounded w-1/2"></div>
                          <div className="h-5 bg-white/10 rounded w-3/4 mt-2"></div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 h-20 animate-pulse flex flex-col justify-between">
                          <div className="h-2.5 bg-white/10 rounded w-1/2"></div>
                          <div className="h-5 bg-white/10 rounded w-3/4 mt-2"></div>
                        </div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 h-20 animate-pulse space-y-2">
                        <div className="h-2.5 bg-white/10 rounded w-1/3"></div>
                        <div className="h-2 bg-white/10 rounded w-full"></div>
                      </div>
                    </div>
                  )}

                  {analyticsError && (
                    <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl text-center space-y-3">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
                      <p className="text-xs font-bold text-red-400">Unable to load analytics</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{analyticsError}</p>
                      <button
                        onClick={async () => {
                          const targetId = analyticsBroadcast.id || analyticsBroadcast._id || analyticsBroadcast.relatedId;
                          if (targetId) {
                            setLoadingAnalytics(true);
                            setAnalyticsError(null);
                            try {
                              const data = await fetchAnalyticsData(targetId);
                              setAnalyticsData(data);
                            } catch (err: any) {
                              setAnalyticsError(err.message || 'Failed to fetch analytics.');
                            } finally {
                              setLoadingAnalytics(false);
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center gap-1.5 mx-auto border border-white/5"
                      >
                        <RotateCcw className="h-3 w-3" /> Retry
                      </button>
                    </div>
                  )}

                  {!loadingAnalytics && !analyticsError && analyticsData && (
                    <>
                      {analyticsData.views === 0 ? (
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center space-y-2 py-8">
                          <Megaphone className="h-8 w-8 text-zinc-500 mx-auto animate-bounce" />
                          <p className="text-xs font-bold text-white">No engagement yet</p>
                          <p className="text-[10px] text-muted-foreground">Your broadcast hasn't been viewed yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <motion.div 
                              initial={{ scale: 0.95, opacity: 0 }} 
                              animate={{ scale: 1, opacity: 1 }} 
                              className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center flex flex-col justify-center"
                            >
                              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Views</p>
                              <p className="text-2xl font-black text-emerald-400 mt-1">{analyticsData.views || 0}</p>
                              <p className="text-[8px] text-muted-foreground mt-1">Times card entered viewport</p>
                            </motion.div>

                            <motion.div 
                              initial={{ scale: 0.95, opacity: 0 }} 
                              animate={{ scale: 1, opacity: 1 }} 
                              transition={{ delay: 0.05 }}
                              className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center flex flex-col justify-center"
                            >
                              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Unique Viewers</p>
                              <p className="text-2xl font-black text-violet-400 mt-1">{analyticsData.uniqueViewers || 0}</p>
                              <p className="text-[8px] text-muted-foreground mt-1">Unique student accounts</p>
                            </motion.div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <motion.div 
                              initial={{ scale: 0.95, opacity: 0 }} 
                              animate={{ scale: 1, opacity: 1 }} 
                              transition={{ delay: 0.1 }}
                              className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center flex flex-col justify-center"
                            >
                              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Clicks / Applications</p>
                              <p className="text-2xl font-black text-blue-400 mt-1">{analyticsData.clicks || 0}</p>
                              <p className="text-[8px] text-muted-foreground mt-1">Times links were clicked</p>
                            </motion.div>

                            <motion.div 
                              initial={{ scale: 0.95, opacity: 0 }} 
                              animate={{ scale: 1, opacity: 1 }} 
                              transition={{ delay: 0.15 }}
                              className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center flex flex-col justify-center"
                            >
                              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Click Through Rate (CTR)</p>
                              <p className="text-2xl font-black text-amber-400 mt-1">{(analyticsData.CTR !== undefined ? analyticsData.CTR : analyticsData.ctr || 0).toFixed(1)}%</p>
                              <p className="text-[8px] text-muted-foreground mt-1">Clicks relative to views</p>
                            </motion.div>
                          </div>

                          {/* CTR Progress Bar */}
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: 0.2 }}
                            className="bg-white/5 p-4 rounded-2xl border border-white/5"
                          >
                            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider mb-2">CTR Performance</p>
                            <div className="flex items-center justify-between">
                              <div className="w-full bg-zinc-800 rounded-full h-2 mr-3 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${Math.min(100, (analyticsData.CTR !== undefined ? analyticsData.CTR : analyticsData.ctr || 0))}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                  className="bg-gradient-to-r from-[#6D5EF5] to-emerald-400 h-2 rounded-full" 
                                />
                              </div>
                              <span className="text-xs font-bold text-white">
                                {(analyticsData.CTR !== undefined ? analyticsData.CTR : analyticsData.ctr || 0).toFixed(1)}%
                              </span>
                            </div>
                          </motion.div>

                          {/* Historical Times */}
                          <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            transition={{ delay: 0.25 }}
                            className="bg-white/5 p-4 rounded-2xl border border-white/5 text-[10px] space-y-2 text-muted-foreground"
                          >
                            <div className="flex justify-between">
                              <span>Published:</span>
                              <span className="font-bold text-white">{new Date(analyticsData.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Last Viewed:</span>
                              <span className="font-bold text-white">{analyticsData.lastViewed ? new Date(analyticsData.lastViewed).toLocaleString() : 'Never'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Last Clicked:</span>
                              <span className="font-bold text-white">{analyticsData.lastClicked ? new Date(analyticsData.lastClicked).toLocaleString() : 'Never'}</span>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <Button
                    onClick={() => { setShowAnalyticsModal(false); setAnalyticsBroadcast(null); }}
                    className="rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-4 h-9"
                  >
                    Close Analytics
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
