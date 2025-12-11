import React, { useState, useEffect, useRef } from 'react';
import { RecipeStep } from '../types';
import { generateStepVisual, generateStepAudio } from '../services/geminiService';
import { RichInstruction } from './RichInstruction';

interface TutorialPlayerProps {
  steps: RecipeStep[];
  onClose: () => void;
  recipeTitle: string;
  preloadedImages: Record<number, string>;
}

export const TutorialPlayer: React.FC<TutorialPlayerProps> = ({ steps, onClose, recipeTitle, preloadedImages }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local cache for images generated within the player (not yet in parent props)
  const [localImageCache, setLocalImageCache] = useState<Record<number, string>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // --- PRELOAD LOGIC ---
  useEffect(() => {
    const preloadNext = async () => {
       const nextIndex = currentIndex + 1;
       if (nextIndex < steps.length) {
          // Check if we already have it in props or local cache
          if (preloadedImages[nextIndex] || localImageCache[nextIndex]) return;
          
          // Generate context
          const prevContext = steps.slice(0, nextIndex).map(s => s.instruction);
          // Generate in background
          try {
            const url = await generateStepVisual(steps[nextIndex].instruction, prevContext);
            if (url && isMountedRef.current) {
                setLocalImageCache(prev => ({...prev, [nextIndex]: url}));
            }
          } catch (e) {
            console.warn("Failed to preload next image", e);
          }
       }
    };
    preloadNext();
  }, [currentIndex, steps, preloadedImages, localImageCache]);


  // --- LOAD CURRENT CONTENT ---
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setAudioUrl(null);
    setImageUrl(null);
    if(audioRef.current) {
        audioRef.current.pause();
    }

    const loadContent = async () => {
      // 1. Image Strategy: Check preloaded (prop), then local cache, then fetch
      let url = preloadedImages[currentIndex] || localImageCache[currentIndex];
      
      if (!url) {
        // Build context for image generator
        const previousInstructions = steps.slice(0, currentIndex).map(s => s.instruction);
        url = await generateStepVisual(currentStep.instruction, previousInstructions) || '';
      }
      
      if (active) setImageUrl(url);

      // 2. Audio Strategy: Generate TTS
      // (Optional: Could add caching for audio too, but focusing on images for now)
      const audio = await generateStepAudio(currentStep.instruction);
      
      if (active) {
        setAudioUrl(audio);
        setIsLoading(false);
      }
    };

    loadContent();

    return () => { active = false; };
  }, [currentIndex, steps, preloadedImages, currentStep, localImageCache]); // Added localImageCache dependency

  // Auto-play when content is ready
  useEffect(() => {
    if (!isLoading && audioUrl && isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Autoplay blocked", e));
    }
  }, [isLoading, audioUrl, isPlaying]);

  const handleAudioEnded = () => {
    if (!isLastStep && isPlaying) {
       // Small delay before next step for pacing
       setTimeout(() => {
         if (isMountedRef.current) {
            setCurrentIndex(prev => prev + 1);
         }
       }, 1500);
    } else {
        setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
        audioRef.current?.pause();
    } else {
        audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center text-white animate-fade-in">
        
        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
            <div>
                <span className="text-red-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Tutorial Video
                </span>
                <h2 className="text-lg font-serif font-bold mt-1">{recipeTitle}</h2>
            </div>
            <button 
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors"
            >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        {/* Video Stage */}
        <div className="relative w-full max-w-5xl aspect-video bg-neutral-900 shadow-2xl overflow-hidden flex items-center justify-center">
            
            {/* Background / Content */}
            {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <p className="text-sm font-medium tracking-wide animate-pulse">GENERATING SCENE...</p>
                </div>
            ) : (
                <>
                    {/* Visual */}
                    {imageUrl && (
                        <img 
                            src={imageUrl} 
                            className="w-full h-full object-cover animate-fade-in"
                            alt="Step visual"
                        />
                    )}
                    
                    {/* Subtitles Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-32 text-center">
                         <div className="inline-block bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 shadow-xl max-w-3xl">
                            <p className="text-xl md:text-2xl font-medium leading-relaxed text-white">
                                <RichInstruction text={currentStep.instruction} className="[&>span>span]:text-amber-400 [&>span>span]:border-amber-400/50" />
                            </p>
                         </div>
                    </div>
                </>
            )}

            {/* Audio Element */}
            {audioUrl && (
                <audio 
                    ref={audioRef} 
                    src={audioUrl} 
                    onEnded={handleAudioEnded}
                    className="hidden"
                />
            )}
        </div>

        {/* Bottom Progress Bar & Controls */}
        <div className="w-full max-w-5xl mt-6 px-6 flex items-center gap-4">
            <button 
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform"
            >
                {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                    <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
            </button>

            <div className="flex-1 flex gap-1 h-2">
                {steps.map((_, idx) => (
                    <div 
                        key={idx}
                        className={`flex-1 rounded-full transition-colors duration-300 ${
                            idx < currentIndex ? 'bg-indigo-500' : 
                            idx === currentIndex ? 'bg-white animate-pulse' : 
                            'bg-neutral-700'
                        }`}
                        onClick={() => setCurrentIndex(idx)}
                    ></div>
                ))}
            </div>
            
            <span className="text-xs font-mono text-neutral-400">
                {currentIndex + 1} / {steps.length}
            </span>
        </div>
    </div>
  );
};