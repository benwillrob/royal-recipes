import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { StepList } from './StepList';
import { DishVisualizer } from './DishVisualizer';
import { CookMode } from './CookMode';
import { TutorialPlayer } from './TutorialPlayer';
import { LeftoverSuggestions } from './LeftoverSuggestions';
import { generateStepVisual } from '../services/geminiService';

interface RecipeCardProps {
  recipe: Recipe;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const [isCookMode, setIsCookMode] = useState(false);
  const [isTutorialMode, setIsTutorialMode] = useState(false);
  const [stepImages, setStepImages] = useState<Record<number, string>>({});

  // Background Image Generation Effect
  useEffect(() => {
    let isMounted = true;

    const generateAllStepImages = async () => {
        // We generate images one by one to preserve order and context logic
        // THROTTLING: Added a significant delay between steps to avoid 429 Rate Limit errors
        for (let i = 0; i < recipe.steps.length; i++) {
            if (!isMounted) break;
            
            // Check if we already have it
            if (stepImages[i]) continue;

            // Gather context from previous steps
            const previousInstructions = recipe.steps.slice(0, i).map(s => s.instruction);

            try {
                const url = await generateStepVisual(recipe.steps[i].instruction, previousInstructions);
                if (isMounted && url) {
                    setStepImages(prev => ({ ...prev, [i]: url }));
                }
            } catch (e) {
                console.error(`Failed to generate background visual for step ${i}`, e);
            }

            // Wait 4 seconds between requests to be nice to the API quota
            if (isMounted && i < recipe.steps.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 4000));
            }
        }
    };

    // Reset images when recipe changes
    setStepImages({});
    
    // Start background generation
    if (recipe) {
        generateAllStepImages();
    }

    return () => { isMounted = false; };
  }, [recipe]); // Intentionally not including stepImages to avoid loop

  return (
    <>
      {isCookMode && (
        <CookMode 
            steps={recipe.steps} 
            recipeTitle={recipe.title} 
            onClose={() => setIsCookMode(false)}
            preloadedImages={stepImages}
        />
      )}

      {isTutorialMode && (
        <TutorialPlayer
            steps={recipe.steps}
            recipeTitle={recipe.title}
            onClose={() => setIsTutorialMode(false)}
            preloadedImages={stepImages}
        />
      )}
      
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden max-w-3xl mx-auto border border-white/50 relative z-10 animate-fade-in-up">
        <div className="p-6 md:p-8">
          <header className="mb-6 text-center relative">
              <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mb-3">{recipe.title}</h1>
              <p className="text-slate-500 italic text-lg">{recipe.description}</p>
          </header>

          <DishVisualizer title={recipe.title} description={recipe.description} />

          {/* Action Bar */}
          <div className="flex justify-center -mt-10 mb-8 relative z-10 gap-3">
              <button 
                onClick={() => setIsCookMode(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-indigo-200 transform hover:-translate-y-1 transition-all flex items-center gap-2 group"
              >
                <span className="group-hover:animate-bounce">👨‍🍳</span> Cook Mode
              </button>

              <button 
                onClick={() => setIsTutorialMode(true)}
                className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-100 px-6 py-3 rounded-full font-bold shadow-lg shadow-indigo-100 transform hover:-translate-y-1 transition-all flex items-center gap-2 group"
              >
                <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">▶</span>
                Watch Tutorial
              </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-8">
            {/* Ingredients Column */}
            <div className="md:col-span-1">
              <div className="bg-orange-50/80 p-6 rounded-2xl border border-orange-100 sticky top-24 shadow-sm">
                <h3 className="text-lg font-serif font-bold text-orange-900 mb-4 flex items-center gap-2 border-b border-orange-200 pb-2">
                  <span>🥕</span> Ingredients
                </h3>
                <ul className="space-y-3">
                  {recipe.ingredients.map((item, idx) => (
                    <li key={idx} className="text-slate-700 text-sm flex items-start gap-3">
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 shadow-sm"></span>
                      <span className="leading-snug font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Steps Column */}
            <div className="md:col-span-2">
              <StepList steps={recipe.steps} />
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200">
             <LeftoverSuggestions ingredients={recipe.ingredients} recipeTitle={recipe.title} />
          </div>
        </div>
      </div>
    </>
  );
};