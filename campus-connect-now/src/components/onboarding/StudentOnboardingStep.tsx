import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import AcademicYearSelector from './AcademicYearSelector';
import CourseAndBranchSelector from './CourseAndBranchSelector';

interface StudentOnboardingStepProps {
  course: string;
  admissionYear?: number;
  graduationYear?: number;
  bio: string;
  personalEmail: string;
  onUpdateCourse: (course: string) => void;
  onUpdateAdmissionYear: (year: number) => void;
  onUpdateGraduationYear: (year: number) => void;
  onUpdateBio: (bio: string) => void;
  onUpdatePersonalEmail: (email: string) => void;
}

/**
 * Student Onboarding Step Component
 * 
 * Renders the academic information step for student onboarding.
 * Includes:
 * - Course/Branch selector
 * - Academic year selector (1st-5th year only)
 * - Personal Email (Mandatory)
 * - Bio textarea
 */
export default function StudentOnboardingStep({
  course,
  year,
  bio,
  personalEmail,
  onUpdateCourse,
  onUpdateYear,
  onUpdateBio,
  onUpdatePersonalEmail,
}: StudentOnboardingStepProps) {
  return (
    <motion.div
      key="student-academics"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <CourseAndBranchSelector
        selectedCourse={course}
        onSelectCourse={onUpdateCourse}
      />

      <AcademicYearSelector
        admissionYear={admissionYear}
        graduationYear={graduationYear}
        onSelectAdmissionYear={onUpdateAdmissionYear}
        onSelectGraduationYear={onUpdateGraduationYear}
      />

      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Personal Email (Mandatory)</label>
        <input
          type="email"
          value={personalEmail}
          onChange={(e) => onUpdatePersonalEmail(e.target.value)}
          placeholder="your.personal@gmail.com"
          className="w-full h-12 bg-secondary rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Required for verifying your alumni record after graduation.
        </p>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Bio (optional)</label>
        <textarea
          value={bio}
          onChange={(e) => onUpdateBio(e.target.value)}
          placeholder="Tell people about yourself, your interests, and your goals..."
          rows={3}
          maxLength={200}
          className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <p className="text-[11px] text-muted-foreground text-right mt-1">{bio.length}/200</p>
      </div>
    </motion.div>
  );
}
