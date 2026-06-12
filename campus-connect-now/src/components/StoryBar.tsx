import { useStoryStore } from '@/store/storyStore';
import { Plus, Type, Eye } from 'lucide-react';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TEXT_BG_COLORS = [
  'linear-gradient(135deg, hsl(249 76% 60%), hsl(270 90% 72%))',
  'linear-gradient(135deg, hsl(1 100% 63%), hsl(20 100% 65%))',
  'linear-gradient(135deg, hsl(142 72% 40%), hsl(180 70% 45%))',
  'linear-gradient(135deg, hsl(200 90% 50%), hsl(220 80% 60%))',
  'linear-gradient(135deg, hsl(40 100% 55%), hsl(20 100% 60%))',
];

export const StoryBar = () => {
  const stories = useStoryStore(s => s.stories);
  const viewStory = useStoryStore(s => s.viewStory);
  const addStory = useStoryStore(s => s.addStory);
  const addTextStory = useStoryStore(s => s.addTextStory);
  const closeStory = useStoryStore(s => s.closeStory);
  const nextStory = useStoryStore(s => s.nextStory);
  const prevStory = useStoryStore(s => s.prevStory);
  const activeStoryIndex = useStoryStore(s => s.activeStoryIndex);
  const currentUserEmail = useStoryStore(s => s.currentUserEmail);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showTextCreator, setShowTextCreator] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(0);

  const handleAddStory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addStory(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateTextStory = () => {
    if (!textContent.trim()) return;
    addTextStory(textContent.trim(), TEXT_BG_COLORS[selectedBg]);
    setTextContent('');
    setShowTextCreator(false);
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar px-5 py-3">
        {/* Add story buttons */}
        <div className="flex flex-col items-center gap-1 min-w-[64px]">
          <div className="flex gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="h-16 w-8 rounded-l-full bg-secondary border border-r-0 border-dashed border-muted-foreground/30 flex items-center justify-center"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowTextCreator(true)}
              className="h-16 w-8 rounded-r-full bg-secondary border border-l-0 border-dashed border-muted-foreground/30 flex items-center justify-center"
            >
              <Type className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground">Add Story</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAddStory} />
        </div>

        {/* Stories */}
        {stories.map((story, i) => (
          <button
            key={story.id}
            onClick={() => viewStory(i)}
            className="flex flex-col items-center gap-1 min-w-[64px]"
          >
            <div className={`h-16 w-16 rounded-full p-[2px] ${story.viewed ? 'bg-muted-foreground/30' : 'gradient-primary'}`}>
              {story.type === 'text' ? (
                <div
                  className="h-full w-full rounded-full flex items-center justify-center border-2 border-background"
                  style={{ background: story.bgColor }}
                >
                  <span className="text-[8px] text-white font-bold leading-none text-center px-1 line-clamp-2">
                    {story.textContent?.slice(0, 20)}
                  </span>
                </div>
              ) : (
                <img
                  src={story.userAvatar}
                  alt={story.userName}
                  className="h-full w-full rounded-full border-2 border-background object-cover"
                />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-14 text-center">{story.userName}</span>
          </button>
        ))}
      </div>

      {/* Text Story Creator Modal */}
      <AnimatePresence>
        {showTextCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setShowTextCreator(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm space-y-4"
            >
              <div
                className="rounded-3xl p-8 min-h-[300px] flex items-center justify-center"
                style={{ background: TEXT_BG_COLORS[selectedBg] }}
              >
                <textarea
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Type your story..."
                  maxLength={200}
                  className="bg-transparent text-white text-center text-lg font-bold placeholder:text-white/50 outline-none resize-none w-full"
                  rows={4}
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {TEXT_BG_COLORS.map((bg, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedBg(i)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${i === selectedBg ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: bg }}
                    />
                  ))}
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCreateTextStory}
                  disabled={!textContent.trim()}
                  className="px-5 py-2.5 rounded-full gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
                >
                  Share
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const StoryViewer = () => {
  const stories = useStoryStore(s => s.stories);
  const activeStoryIndex = useStoryStore(s => s.activeStoryIndex);
  const closeStory = useStoryStore(s => s.closeStory);
  const nextStory = useStoryStore(s => s.nextStory);
  const prevStory = useStoryStore(s => s.prevStory);
  const currentUserEmail = useStoryStore(s => s.currentUserEmail);
  const [showViewers, setShowViewers] = useState(false);

  const story = activeStoryIndex !== null ? stories[activeStoryIndex] : null;
  const isOwnStory = story?.userId === currentUserEmail;

  return (
    <AnimatePresence>
      {story && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black flex flex-col"
        >
          {/* Progress bars */}
          <div className="flex gap-1 px-3 pt-3">
            {stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-foreground/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    i < (activeStoryIndex ?? 0) ? 'w-full bg-foreground' :
                    i === activeStoryIndex ? 'w-full bg-foreground animate-pulse' :
                    'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3">
            <img src={story.userAvatar} alt="" className="h-9 w-9 rounded-full border border-foreground/20" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{story.userName}</p>
              <p className="text-[10px] text-foreground/60">
                {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {isOwnStory && (
              <button
                onClick={() => setShowViewers(!showViewers)}
                className="flex items-center gap-1 text-foreground/70 text-xs px-2 py-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                {story.viewers?.length || 0}
              </button>
            )}
            <button onClick={closeStory} className="text-foreground/80 text-lg font-bold px-2">✕</button>
          </div>

          {/* Content */}
          <div className="flex-1 relative">
            {story.type === 'text' ? (
              <div
                className="w-full h-full flex items-center justify-center p-8"
                style={{ background: story.bgColor }}
              >
                <p className="text-white text-xl font-bold text-center leading-relaxed">
                  {story.textContent}
                </p>
              </div>
            ) : (
              <>
                <img src={story.image} alt="" className="w-full h-full object-cover" />
                {story.caption && (
                  <div className="absolute bottom-8 left-4 right-4 text-center">
                    <p className="text-foreground text-sm font-medium bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 inline-block">
                      {story.caption}
                    </p>
                  </div>
                )}
              </>
            )}
            {/* Tap zones */}
            <button onClick={prevStory} className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous" />
            <button onClick={nextStory} className="absolute inset-y-0 right-0 w-2/3" aria-label="Next" />
          </div>

          {/* Viewers Panel */}
          <AnimatePresence>
            {showViewers && isOwnStory && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute bottom-0 left-0 right-0 glass-strong rounded-t-3xl p-5 max-h-[40vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">
                    <Eye className="h-4 w-4 inline mr-1.5" />
                    Viewed by {story.viewers?.length || 0}
                  </p>
                  <button onClick={() => setShowViewers(false)} className="text-muted-foreground text-xs">Close</button>
                </div>
                {(story.viewers || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No views yet</p>
                ) : (
                  <div className="space-y-2">
                    {(story.viewers || []).map(viewer => (
                      <div key={viewer} className="flex items-center gap-3 py-1.5">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${viewer}`}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                        <span className="text-sm text-foreground">{viewer === currentUserEmail ? 'You' : viewer}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
