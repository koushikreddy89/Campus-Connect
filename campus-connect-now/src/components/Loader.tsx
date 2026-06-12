import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

export const Loader = ({ text, size = 'md' }: LoaderProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center gap-3 py-12"
  >
    <Loader2 className={`${sizeMap[size]} animate-spin text-primary`} />
    {text && <p className="text-sm text-muted-foreground">{text}</p>}
  </motion.div>
);
