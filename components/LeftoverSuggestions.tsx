import React, { useEffect, useState } from 'react';
import { generateLeftoverSuggestions } from '../services/geminiService';
import { LeftoverSuggestion } from '../types';

interface LeftoverSuggestionsProps {
  ingredients: string[];
  recipeTitle: string;
}

export const LeftoverSuggestions: React.FC<LeftoverSuggestionsProps> = ({ ingredients, recipeTitle }) => {
  const [suggestions, setSuggestions] = useState<LeftoverSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const results = await generateLeftoverSuggestions(ingredients, recipeTitle);
        if (isMounted) setSuggestions(results);
      } catch (e) {
        console.error("Failed to fetch leftovers", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (ingredients.length > 0) {
        fetchSuggestions();
    }

    return () => { isMounted = false; };
  }, [ingredients, recipeTitle]);

  if (loading) {
    return (
        <div className="mt-12 p-6 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse text-center">
            <span className="text-slate-500 font-medium">Thinking of ways to use your leftovers...</span>
        </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-12">
      <h3 className="text-xl font-serif font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="text-2xl">♻️</span> Got Leftovers?
      </h3>
      
      <div className="grid md:grid-cols-3 gap-6">
        {suggestions.map((suggestion, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
            <h4 className="font-bold text-slate-800 mb-2">{suggestion.title}</h4>
            <p className="text-sm text-slate-500 mb-4">{suggestion.description}</p>
            
            <div className="flex flex-wrap gap-1">
                {suggestion.matchingIngredients.map((ing, i) => (
                    <span key={i} className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                        {ing}
                    </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};