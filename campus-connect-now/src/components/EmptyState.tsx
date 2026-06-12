import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
  >
    <div className="rounded-full bg-secondary p-4">
      {icon || <Inbox className="h-8 w-8 text-muted-foreground" />}
    </div>
    <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
    {description && <p className="text-sm text-muted-foreground max-w-xs">{description}</p>}
    {action}
  </motion.div>
);
