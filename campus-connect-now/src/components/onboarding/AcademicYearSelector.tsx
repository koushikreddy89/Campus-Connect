import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

interface AcademicYearSelectorProps {
  selectedYear: string;
  onSelectYear: (year: string) => void;
}

/**
 * Academic Year Selector Component
 * 
 * Renders a grid of academic year options (1st-5th year) for student onboarding.
 * This component is specifically designed for student role and should NOT be shown to alumni.
 * 
 * @param selectedYear - Currently selected academic year
 * @param onSelectYear - Callback when a year is selected
 */
export default function AcademicYearSelector({
  selectedYear,
  onSelectYear,
}: AcademicYearSelectorProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="h-5 w-5 text-primary" />
        <p className="text-foreground font-semibold">Academic Info</p>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Academic Year</label>
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-2"
        >
          {ACADEMIC_YEARS.map((year) => (
            <motion.button
              key={year}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectYear(year)}
              className={`rounded-xl py-2.5 text-xs font-medium transition-all ${
                selectedYear === year
                  ? 'gradient-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {year}
            </motion.button>
          ))}
        </motion.div>
        <p className="text-xs text-muted-foreground mt-2">
          Select your current year of study
        </p>
      </div>
    </div>
  );
}
