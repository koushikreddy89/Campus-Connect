import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import PassoutYearSelector from './PassoutYearSelector';
import CourseAndBranchSelector from './CourseAndBranchSelector';

const EXPERIENCE_OPTIONS = ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'];

interface AlumniOnboardingStepProps {
  course: string;
  passoutYear: string;
  batch: string;
  company: string;
  jobRole: string;
  experience: string;
  bio: string;
  onUpdateCourse: (course: string) => void;
  onUpdatePassoutYear: (year: string) => void;
  onUpdateBatch: (batch: string) => void;
  onUpdateCompany: (company: string) => void;
  onUpdateJobRole: (role: string) => void;
  onUpdateExperience: (exp: string) => void;
  onUpdateBio: (bio: string) => void;
}

/**
 * Alumni Onboarding Step Component
 * 
 * Renders the professional information step for alumni onboarding.
 * Includes:
 * - Course/Branch selector (what they studied)
 * - Passout year selector (when they graduated)
 * - Batch (e.g., 2015-2019)
 * - Company name
 * - Current job role
 * - Years of experience
 * - Bio
 * 
 * This component replaces the "Academic Year" selector from student onboarding
 * with alumni-specific professional fields.
 * 
 * @param course - Course/branch
 * @param passoutYear - Graduation year
 * @param batch - Batch (e.g., 2015-2019)
 * @param company - Current company
 * @param jobRole - Current job role
 * @param experience - Years of experience
 * @param bio - User bio
 * @param onUpdateCourse - Callback when course changes
 * @param onUpdatePassoutYear - Callback when passout year changes
 * @param onUpdateBatch - Callback when batch changes
 * @param onUpdateCompany - Callback when company changes
 * @param onUpdateJobRole - Callback when job role changes
 * @param onUpdateExperience - Callback when experience changes
 * @param onUpdateBio - Callback when bio changes
 */
export default function AlumniOnboardingStep({
  course,
  passoutYear,
  batch,
  company,
  jobRole,
  experience,
  bio,
  onUpdateCourse,
  onUpdatePassoutYear,
  onUpdateBatch,
  onUpdateCompany,
  onUpdateJobRole,
  onUpdateExperience,
  onUpdateBio,
}: AlumniOnboardingStepProps) {
  return (
    <motion.div
      key="alumni-professional"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-primary" />
        <p className="text-foreground font-semibold">Professional Info</p>
      </div>

      <CourseAndBranchSelector
        selectedCourse={course}
        onSelectCourse={onUpdateCourse}
      />

      <PassoutYearSelector
        passoutYear={passoutYear}
        onSelectPassoutYear={onUpdatePassoutYear}
      />

      {/* Batch */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Batch (e.g., 2015-2019)</label>
        <input
          type="text"
          value={batch}
          onChange={(e) => onUpdateBatch(e.target.value)}
          placeholder="e.g., 2018-2022"
          maxLength={50}
          className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Company */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Current Company</label>
        <input
          type="text"
          value={company}
          onChange={(e) => onUpdateCompany(e.target.value)}
          placeholder="Where do you work?"
          maxLength={100}
          className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Job Role */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Current Role</label>
        <input
          type="text"
          value={jobRole}
          onChange={(e) => onUpdateJobRole(e.target.value)}
          placeholder="e.g., Senior Software Engineer"
          maxLength={100}
          className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Experience */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Years of Experience</label>
        <div className="grid grid-cols-2 gap-2">
          {EXPERIENCE_OPTIONS.map((exp) => (
            <motion.button
              key={exp}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onUpdateExperience(exp)}
              className={`rounded-xl py-2.5 px-3 text-xs font-medium transition-all ${
                experience === exp
                  ? 'gradient-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {exp}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Bio (optional)</label>
        <textarea
          value={bio}
          onChange={(e) => onUpdateBio(e.target.value)}
          placeholder="Share your experience, achievements, and what you're passionate about..."
          rows={3}
          maxLength={200}
          className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <p className="text-[11px] text-muted-foreground text-right mt-1">{bio.length}/200</p>
      </div>
    </motion.div>
  );
}
