import React, { useState, useEffect } from 'react';
import { RecipeStep, StepType } from '../types';
import { generateStepVisual } from '../services/geminiService';
import { RichInstruction } from './RichInstruction';

interface CookModeProps {
  steps: RecipeStep[];
  onClose: () => void;
  recipeTitle: string;
  preloadedImages: Record<number, string>;
}

export const CookMode: React.FC<CookModeProps> = ({ steps, onClose, recipeTitle, preloadedImages }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localImages, setLocalImages] = useState<Record<number, string>>({});
  const [loadingImage, setLoadingImage] = useState(false);

  // Combine preloaded images with any locally fetched ones (local fallback)
  const images = { ...preloadedImages, ...localImages };

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;
  const isFirstStep = currentIndex === 0;

  // Fallback loading if not preloaded
  useEffect(() => {
    let isMounted = true;

    const loadImages = async () => {
      // Only fetch if NOT in preloadedImages and NOT in localImages
      if (!images[currentIndex]) {
        setLoadingImage(true);
        
        // Context for better visuals
        const previousInstructions = steps.slice(0, currentIndex).map(s => s.instruction);
        
        const url = await generateStepVisual(currentStep.instruction, previousInstructions);
        if (isMounted && url) {
            setLocalImages(prev => ({ ...prev, [currentIndex]: url }));
        }
        if (isMounted) setLoadingImage(false);
      }
    };

    loadImages();

    return () => { isMounted = false; };
  }, [currentIndex, currentStep, images, steps]);

  const handleNext = () => {
    if (!isLastStep) setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (!isFirstStep) setCurrentIndex(prev => prev - 1);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 text-white flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div>
            <h2 className="text-sm uppercase tracking-widest text-slate-400 font-bold">Cook Mode</h2>
            <p className="font-serif text-lg">{recipeTitle}</p>
        </div>
        <button 
          onClick={onClose}
          className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 md:p-8 gap-8 overflow-y-auto">
        
        {/* Visual Area */}
        <div className="w-full md:w-1/2 max-w-lg aspect-square bg-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex items-center justify-center border border-slate-700">
             {loadingImage && !images[currentIndex] ? (
                 <div className="flex flex-col items-center text-slate-500 animate-pulse">
                     <span className="text-4xl mb-2">🎨</span>
                     <span className="text-sm font-medium">Visualizing step...</span>
                 </div>
             ) : images[currentIndex] ? (
                 <img 
                    src={images[currentIndex]} 
                    alt={`Step ${currentIndex + 1}`} 
                    className="w-full h-full object-cover animate-fade-in"
                 />
             ) : (
                 <div className="text-slate-600 flex flex-col items-center">
                     <span className="text-6xl opacity-20 mb-4">{currentIndex + 1}</span>
                     {!loadingImage && <span className="text-sm opacity-50">Waiting for image...</span>}
                 </div>
             )}

             {/* Step Type Badge Overlay */}
             <div className="absolute top-4 left-4">
                 {currentStep.type === StepType.PREP && <span className="px-3 py-1 bg-emerald-500/90 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg">Prep</span>}
                 {currentStep.type === StepType.COOK && <span className="px-3 py-1 bg-rose-500/90 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg">Cook</span>}
                 {currentStep.type === StepType.TIMING && <span className="px-3 py-1 bg-amber-500/90 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg">Timing</span>}
             </div>
        </div>

        {/* Text Area */}
        <div className="w-full md:w-1/2 max-w-lg space-y-6">
            <div className="flex items-center gap-4">
                <span className="text-6xl font-serif font-bold text-indigo-400 opacity-50">
                    {String(currentIndex + 1).padStart(2, '0')}
                </span>
                <div className="h-px bg-slate-700 flex-1"></div>
                <span className="text-slate-500 text-sm font-mono">
                    {currentIndex + 1} / {steps.length}
                </span>
            </div>

            <p className="text-2xl md:text-3xl font-medium leading-relaxed">
                {/* Use RichInstruction here, passing custom class for dark mode text styling */}
                <RichInstruction 
                  text={currentStep.instruction} 
                  className="[&>span>span]:text-indigo-400 [&>span>span]:border-indigo-500/50" 
                />
            </p>

            {currentStep.insight && (
                <div className="bg-indigo-900/30 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm mb-1">
                        <span>💡 Insight</span>
                    </div>
                    <p className="text-indigo-100 text-sm opacity-90">{currentStep.insight}</p>
                </div>
            )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-6 bg-slate-900/50 backdrop-blur-sm border-t border-slate-700 flex justify-between items-center max-w-6xl mx-auto w-full">
         <button 
            onClick={handlePrev} 
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${isFirstStep ? 'text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
         >
            ← Previous
         </button>

         <div className="hidden md:flex gap-1">
             {steps.map((_, idx) => (
                 <div 
                    key={idx} 
                    className={`h-1.5 w-8 rounded-full transition-colors ${idx === currentIndex ? 'bg-indigo-500' : idx < currentIndex ? 'bg-slate-600' : 'bg-slate-800'}`}
                 />
             ))}
         </div>

         <button 
            onClick={isLastStep ? onClose : handleNext} 
            className="flex items-center gap-2 px-8 py-3 rounded-full font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-900/20"
         >
            {isLastStep ? 'Finish' : 'Next'} →
         </button>
      </div>
    </div>
  );
};