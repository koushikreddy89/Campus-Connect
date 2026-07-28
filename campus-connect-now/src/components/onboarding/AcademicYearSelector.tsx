import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

interface AcademicYearSelectorProps {
  admissionYear?: number;
  graduationYear?: number;
  onSelectAdmissionYear: (year: number) => void;
  onSelectGraduationYear: (year: number) => void;
}

export default function AcademicYearSelector({
  admissionYear,
  graduationYear,
  onSelectAdmissionYear,
  onSelectGraduationYear,
}: AcademicYearSelectorProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <p className="text-foreground font-semibold">Academic Info</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Admission Year</label>
          <select
            value={admissionYear || ''}
            onChange={(e) => onSelectAdmissionYear(e.target.value ? parseInt(e.target.value) : 0)}
            className="w-full h-11 bg-secondary rounded-xl px-4 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
          >
            <option value="">Select Admission Year</option>
            {Array.from({ length: 15 }, (_, i) => currentYear - 8 + i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Graduation Year</label>
          <select
            value={graduationYear || ''}
            onChange={(e) => onSelectGraduationYear(e.target.value ? parseInt(e.target.value) : 0)}
            className="w-full h-11 bg-secondary rounded-xl px-4 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
          >
            <option value="">Select Graduation Year</option>
            {Array.from({ length: 15 }, (_, i) => currentYear - 4 + i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {admissionYear && graduationYear && (
        <div className="bg-secondary/40 border border-white/[0.04] rounded-xl p-3.5 space-y-2 mt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Academic Duration</span>
            <span className="text-foreground font-bold">{admissionYear} – {graduationYear}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Current Academic Year</span>
            <span className="text-primary font-bold">
              {(() => {
                const currentYear = new Date().getFullYear();
                const currentMonth = new Date().getMonth();
                let diff = currentYear - admissionYear;
                if (currentMonth >= 6) diff += 1;
                if (diff <= 0) diff = 1;
                if (diff > 4) return 'Graduated';
                const yearNames = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
                return yearNames[diff - 1] || 'Graduated';
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
