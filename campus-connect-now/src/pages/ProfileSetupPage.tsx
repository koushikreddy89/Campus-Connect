import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useProfileStore } from '@/store/profileStore';
import { useAuthStore } from '@/store/authStore';
import { INTERESTS } from '@/data/constants';
import { Camera, Check, Upload, ChevronRight, Sparkles } from 'lucide-react';
import StudentOnboardingStep from '@/components/onboarding/StudentOnboardingStep';
import AlumniOnboardingStep from '@/components/onboarding/AlumniOnboardingStep';
import { toast } from 'sonner';
import { uploadMediaFile } from '@/services/uploadService';

const STUDENT_STEPS = ['Photo', 'Interests', 'Academic Info'];
const ALUMNI_STEPS = ['Photo', 'Interests', 'Professional Info'];

/**
 * Profile Setup Page
 * 
 * Role-based onboarding flow that renders different steps for students vs alumni.
 * 
 * Student flow: Photo → Interests → Academic Info (course + year)
 * Alumni flow: Photo → Interests → Professional Info (company, role, experience)
 * 
 * Uses role from authStore to determine which flow to show.
 */
export default function ProfileSetupPage() {
  const [step, setStep] = useState(0);
  const { profile, updateProfile, saveProfile, isLoading, isSaving } = useProfileStore();
  const role = useAuthStore(s => s.role);
  const setProfileComplete = useAuthStore(s => s.setProfileComplete);
  const fileRef = useRef<HTMLInputElement>(null);

  // Determine steps and validation based on role
  const steps = role === 'alumni' ? ALUMNI_STEPS : STUDENT_STEPS;
  const isAlumni = role === 'alumni';

  // Load saved onboarding step on mount
  useEffect(() => {
    if (profile && profile.onboardingStep) {
      const targetStep = Math.max(0, Math.min(profile.onboardingStep - 1, steps.length - 1));
      setStep(targetStep);
      console.log('🔄 [ProfileSetup] Resuming onboarding from step:', targetStep);
    }
  }, [profile?.onboardingStep, steps.length]);

  const handleStepChange = async (nextStepIndex: number) => {
    const updatedStepNumber = nextStepIndex + 1; // 1-indexed for database
    setStep(nextStepIndex);
    updateProfile({ onboardingStep: updatedStepNumber });
    try {
      await saveProfile({ onboardingStep: updatedStepNumber });
      console.log('💾 [ProfileSetup] Saved step progress in DB:', updatedStepNumber);
    } catch (e: any) {
      console.error('❌ [ProfileSetup] Failed to save step progress:', e);
      toast.error(e.message || 'Failed to save setup progress. Please try again.');
    }
  };

  const handleFinish = async () => {
    updateProfile({ onboardingCompleted: true });
    try {
      await saveProfile({ onboardingCompleted: true });
      setProfileComplete(true);
      console.log('🎉 [ProfileSetup] Onboarding complete persisted');
      toast.success('Profile setup completed successfully!');
    } catch (e: any) {
      console.error('❌ [ProfileSetup] Failed to save complete onboarding:', e);
      toast.error(e.message || 'Failed to complete profile onboarding. Please check your inputs.');
    }
  };

  const handleSkip = async () => {
    if (step < steps.length - 1) {
      await handleStepChange(step + 1);
    } else {
      await handleFinish();
    }
  };

  const toggleInterest = (interest: string) => {
    const interests = profile.interests.includes(interest)
      ? profile.interests.filter(i => i !== interest)
      : [...profile.interests, interest];
    updateProfile({ interests });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading('Uploading profile picture...', { id: 'setup-photo' });
      const res = await uploadMediaFile(file, '/api/profile/avatar');
      if (res.success && res.url) {
        const photos = profile.photos.length > 0 ? [res.url, ...profile.photos.slice(1)] : [res.url];
        updateProfile({ photos, profileImageUrl: res.url });
        toast.success('Photo uploaded successfully!', { id: 'setup-photo' });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const photos = profile.photos.length > 0 ? [result, ...profile.photos.slice(1)] : [result];
          updateProfile({ photos });
          toast.success('Photo selected!', { id: 'setup-photo' });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      toast.error('Failed to upload photo.', { id: 'setup-photo' });
    }
  };

  // Validation logic based on role
  const canProceed = () => {
    if (step === 0) return profile.photos.length > 0;
    if (step === 1) return profile.interests.length >= 1;
    
    // Step 2 validation (role-specific)
    if (isAlumni) {
      // Alumni must have: passout year, company, and job role
      return !!(profile.passoutYear && profile.company && profile.jobRole);
    } else {
      // Students must have: course, year, and a valid personal email
      const emailValid = profile.personalEmail && /\S+@\S+\.\S+/.test(profile.personalEmail);
      return !!(profile.course && profile.year && emailValid);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8 flex flex-col">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Set Up Profile</h1>
          <button 
            onClick={handleSkip} 
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Step {step + 1} of {steps.length} — <span className="text-foreground font-medium">{steps[step]}</span>
        </p>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-secondary">
              <motion.div
                className="h-full gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: i <= step ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
          {/* Step 1: Photo Upload */}
          {step === 0 && (
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="h-40 w-40 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors bg-secondary"
                >
                  {profile.photos[0] ? (
                    <img src={profile.photos[0]} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-8 w-8" />
                      <span className="text-xs">Upload Photo</span>
                    </div>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                {profile.photos[0] && (
                  <div className="absolute bottom-1 right-1 h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-foreground font-semibold">Add a profile photo</p>
                <p className="text-xs text-muted-foreground mt-1">{isAlumni ? 'Help your network recognize you' : 'This helps others recognize you on campus'}</p>
              </div>

              {/* Additional photos grid */}
              <div className="w-full">
                <p className="text-xs text-muted-foreground mb-2">Add more photos (optional)</p>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <button
                      key={i}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e: any) => {
                          const file = e.target?.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const photos = [...profile.photos];
                            photos[i] = reader.result as string;
                            updateProfile({ photos });
                          };
                          reader.readAsDataURL(file);
                        };
                        input.click();
                      }}
                      className="aspect-square rounded-xl bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors"
                    >
                      {profile.photos[i] ? (
                        <img src={profile.photos[i]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Interests */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="text-foreground font-semibold">What are you into?</p>
              </div>
              <p className="text-xs text-muted-foreground">Pick up to 5 interests — they help us find your people</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    disabled={!profile.interests.includes(interest) && profile.interests.length >= 5}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      profile.interests.includes(interest)
                        ? 'gradient-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : 'bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{profile.interests.length}/5 selected</p>
            </div>
          )}

          {/* Step 3: Role-based content */}
          {step === 2 && (
            <>
              {isAlumni ? (
                <AlumniOnboardingStep
                  course={profile.course || ''}
                  passoutYear={profile.passoutYear || ''}
                  batch={profile.batch || ''}
                  company={profile.company || ''}
                  jobRole={profile.jobRole || ''}
                  experience={profile.experience || ''}
                  bio={profile.bio}
                  onUpdateCourse={(course) => updateProfile({ course })}
                  onUpdatePassoutYear={(passoutYear) => updateProfile({ passoutYear })}
                  onUpdateBatch={(batch) => updateProfile({ batch })}
                  onUpdateCompany={(company) => updateProfile({ company })}
                  onUpdateJobRole={(jobRole) => updateProfile({ jobRole })}
                  onUpdateExperience={(experience) => updateProfile({ experience })}
                  onUpdateBio={(bio) => updateProfile({ bio })}
                />
              ) : (
                <StudentOnboardingStep
                  course={profile.course || ''}
                  year={profile.year || ''}
                  bio={profile.bio}
                  personalEmail={profile.personalEmail || ''}
                  onUpdateCourse={(course) => updateProfile({ course })}
                  onUpdateYear={(year) => updateProfile({ year })}
                  onUpdateBio={(bio) => updateProfile({ bio })}
                  onUpdatePersonalEmail={(personalEmail) => updateProfile({ personalEmail })}
                />
              )}
            </>
          )}
        </motion.div>

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="outline" onClick={() => handleStepChange(step - 1)} className="flex-1 rounded-2xl h-12 border-border">
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => handleStepChange(step + 1)}
              disabled={!canProceed()}
              className="flex-1 gradient-primary rounded-2xl h-12 font-semibold disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={isSaving || isLoading} className="flex-1 gradient-primary rounded-2xl h-12 font-semibold">
              {isSaving || isLoading ? 'Saving...' : 'Complete'} <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
