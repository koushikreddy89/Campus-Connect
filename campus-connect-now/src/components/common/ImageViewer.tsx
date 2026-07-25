import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Copy,
  ExternalLink,
  Share2,
  Calendar,
  User,
  AlertTriangle,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export interface ImageViewerItem {
  _id?: string;
  id?: string;
  url: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  type?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  caption?: string;
  postId?: string;
}

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageViewerItem[];
  currentIndex: number;
  onIndexChange?: (index: number) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  isOpen,
  onClose,
  images,
  currentIndex: initialIndex,
  onIndexChange
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal index when initialIndex changes
  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const currentItem = images[index] || null;
  const currentUrl = currentItem?.url || currentItem?.imageUrl || '';

  // Reset zoom & loading when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setIsLoading(true);
    setHasError(false);
  }, [index, currentUrl]);

  // Lock body scroll when viewer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (images.length === 0) return;
    const nextIdx = (index + 1) % images.length;
    setIndex(nextIdx);
    if (onIndexChange) onIndexChange(nextIdx);
  }, [index, images.length, onIndexChange]);

  const handlePrev = useCallback(() => {
    if (images.length === 0) return;
    const prevIdx = (index - 1 + images.length) % images.length;
    setIndex(prevIdx);
    if (onIndexChange) onIndexChange(prevIdx);
  }, [index, images.length, onIndexChange]);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.5, 3.5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const nextZoom = Math.max(prev - 0.5, 1);
      if (nextZoom === 1) setPosition({ x: 0, y: 0 });
      return nextZoom;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const toggleDoubleTapZoom = useCallback(() => {
    if (zoom > 1) {
      resetZoom();
    } else {
      setZoom(2);
    }
  }, [zoom, resetZoom]);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, zoomIn, zoomOut, resetZoom]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      zoomIn();
    } else if (e.deltaY > 0) {
      zoomOut();
    }
  };

  // Pan / Drag handling when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Actions
  const handleDownload = async () => {
    if (!currentUrl) return;
    try {
      toast.loading('Downloading image...', { id: 'img-dl' });
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campus-connect-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded successfully!', { id: 'img-dl' });
    } catch (err) {
      // Fallback direct open
      window.open(currentUrl, '_blank');
      toast.success('Opening image in new tab', { id: 'img-dl' });
    }
  };

  const handleCopyLink = () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl);
    toast.success('Direct image link copied to clipboard!');
  };

  const handleShare = async () => {
    if (!currentUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Campus Connect Media',
          text: currentItem?.caption || 'Check out this image on Campus Connect',
          url: currentUrl
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen || !currentItem) return null;

  const formattedDate = currentItem.uploadedAt
    ? new Date(currentItem.uploadedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-2xl text-white select-none overflow-hidden"
          onClick={(e) => {
            // Close if clicked directly on overlay backdrop
            if (e.target === containerRef.current) {
              onClose();
            }
          }}
        >
          {/* TOP BAR / HEADER */}
          <div className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-black/40 backdrop-blur-md">
            {/* Left: Counter & Author Info */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-black tracking-wider uppercase">
                {index + 1} / {images.length}
              </span>

              {currentItem.uploadedBy && (
                <div className="hidden sm:flex items-center gap-2 truncate text-xs text-zinc-300 font-medium">
                  <div className="h-6 w-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-semibold text-white">{currentItem.uploadedBy}</span>
                </div>
              )}
            </div>

            {/* Center / Right: Toolbar Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={zoomIn}
                disabled={zoom >= 3.5}
                title="Zoom In (+)"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all disabled:opacity-40"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={zoomOut}
                disabled={zoom <= 1}
                title="Zoom Out (-)"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all disabled:opacity-40"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {zoom > 1 && (
                <button
                  onClick={resetZoom}
                  title="Reset Zoom (R)"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <div className="h-4 w-[1px] bg-white/10 mx-1" />

              <button
                onClick={handleDownload}
                title="Download Image"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={handleCopyLink}
                title="Copy Link"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={handleShare}
                title="Share Image"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => window.open(currentUrl, '_blank')}
                title="Open Original"
                className="hidden sm:flex p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowMetadata(prev => !prev)}
                title="Toggle Details"
                className={`p-2 rounded-xl border transition-all ${
                  showMetadata
                    ? 'bg-violet-600/30 border-violet-500/40 text-violet-300'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <Info className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-white/10 mx-1" />

              <button
                onClick={onClose}
                title="Close Viewer (Esc)"
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CENTER DISPLAY AREA */}
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative flex-1 flex items-center justify-center p-4 overflow-hidden cursor-grab active:cursor-grabbing"
          >
            {/* Loading Indicator */}
            {isLoading && !hasError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/40">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <span className="text-xs text-zinc-400 font-medium">Loading high-resolution image...</span>
              </div>
            )}

            {/* Error Fallback */}
            {hasError && (
              <div className="z-10 p-6 rounded-3xl bg-zinc-950/90 border border-red-500/20 text-center max-w-md shadow-2xl flex flex-col items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Unable to load image</h3>
                <p className="text-xs text-zinc-400">
                  The requested image file could not be retrieved. The link may be broken or restricted.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      setHasError(false);
                      setIsLoading(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                  >
                    Retry Loading
                  </button>
                  <button
                    onClick={() => window.open(currentUrl, '_blank')}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all"
                  >
                    Open Original Link
                  </button>
                </div>
              </div>
            )}

            {/* Main Image with Smooth Motion & Zoom */}
            {!hasError && (
              <motion.img
                key={currentUrl}
                src={currentUrl}
                alt={currentItem.caption || 'Profile photo'}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                onDoubleClick={toggleDoubleTapZoom}
                style={{
                  transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="max-h-[82vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-opacity duration-300"
                draggable={false}
              />
            )}

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  title="Previous Image (Left Arrow)"
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/60 hover:bg-black/90 border border-white/15 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 z-20"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  title="Next Image (Right Arrow)"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/60 hover:bg-black/90 border border-white/15 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 z-20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* BOTTOM METADATA & THUMBNAIL STRIP */}
          {showMetadata && (
            <div className="relative z-30 border-t border-white/10 bg-black/60 backdrop-blur-xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Caption & Date */}
              <div className="min-w-0 max-w-xl text-left">
                {currentItem.caption && (
                  <p className="text-xs text-white font-medium line-clamp-2">
                    {currentItem.caption}
                  </p>
                )}
                {formattedDate && (
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-1 font-semibold">
                    <Calendar className="w-3 h-3 text-violet-400" />
                    <span>Uploaded on {formattedDate}</span>
                  </div>
                )}
              </div>

              {/* Thumbnail Quick Navigation Bar */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 max-w-md overflow-x-auto py-1 px-2 no-scrollbar">
                  {images.map((img, idx) => (
                    <button
                      key={img._id || img.id || idx}
                      onClick={() => {
                        setIndex(idx);
                        if (onIndexChange) onIndexChange(idx);
                      }}
                      className={`relative h-11 w-11 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                        idx === index
                          ? 'border-violet-500 scale-105 shadow-glow'
                          : 'border-white/10 opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.thumbnailUrl || img.url || img.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
