import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const NotFound = () => {
  const _location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center page-transition">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="h-20 w-20 rounded-3xl glass flex items-center justify-center mb-6"
      >
        <MapPin className="h-10 w-10 text-muted-foreground" />
      </motion.div>
      <h1 className="font-display text-5xl font-bold text-gradient mb-3">404</h1>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">
        Looks like this page doesn't exist. Let's get you back on track.
      </p>
      <Button
        onClick={() => navigate('/')}
        className="gradient-primary rounded-2xl h-12 px-8 font-semibold"
      >
        Go Home
      </Button>
    </div>
  );
};

export default NotFound;
