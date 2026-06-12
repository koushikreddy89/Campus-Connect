import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

const COURSES = [
  'Computer Science',
  'Mechanical',
  'Electrical',
  'Civil',
  'Electronics',
  'MBA',
  'BBA',
  'Arts',
  'Commerce',
  'Science',
  'Medicine',
  'Law',
];

interface CourseAndBranchSelectorProps {
  selectedCourse: string;
  onSelectCourse: (course: string) => void;
}

/**
 * Course and Branch Selector Component
 * 
 * Reusable component for selecting course/branch.
 * Used by both student and alumni onboarding flows.
 * 
 * @param selectedCourse - Currently selected course
 * @param onSelectCourse - Callback when a course is selected
 */
export default function CourseAndBranchSelector({
  selectedCourse,
  onSelectCourse,
}: CourseAndBranchSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <label className="text-sm text-muted-foreground block">Course / Branch</label>
      </div>
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
        className="grid grid-cols-2 gap-2"
      >
        {COURSES.map((course) => (
          <motion.button
            key={course}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectCourse(course)}
            className={`rounded-xl py-2.5 px-3 text-xs font-medium transition-all text-left ${
              selectedCourse === course
                ? 'gradient-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {course}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
