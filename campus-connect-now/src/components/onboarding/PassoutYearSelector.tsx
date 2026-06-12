import { motion } from 'framer-motion';
import { Briefcase, Calendar } from 'lucide-react';

const PASSOUT_YEARS = Array.from({ length: 35 }, (_, i) => 
  (new Date().getFullYear() - i).toString()
).reverse();

const EXPERIENCE_YEARS = ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'];

interface PassoutYearSelectorProps {
  passoutYear: string;
  onSelectPassoutYear: (year: string) => void;
}

/**
 * Passout Year Selector Component
 * 
 * Renders passout year selection for alumni onboarding.
 * This component is specifically designed for alumni role and should NOT be shown to students.
 * Displays years from 1991 to current year in a scrollable format.
 * 
 * @param passoutYear - Currently selected passout year
 * @param onSelectPassoutYear - Callback when a year is selected
 */
export default function PassoutYearSelector({
  passoutYear,
  onSelectPassoutYear,
}: PassoutYearSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Passout Year
        </label>
        <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-secondary p-3 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-secondary">
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.02,
                },
              },
            }}
            initial="hidden"
            animate="show"
            className="grid grid-cols-4 gap-2"
          >
            {PASSOUT_YEARS.map((year) => (
              <motion.button
                key={year}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectPassoutYear(year)}
                className={`rounded-lg py-2 text-xs font-medium transition-all ${
                  passoutYear === year
                    ? 'gradient-primary text-primary-foreground shadow-md'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {year}
              </motion.button>
            ))}
          </motion.div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          When did you graduate?
        </p>
      </div>
    </div>
  );
}
