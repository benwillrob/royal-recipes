import React, { useEffect, useState } from 'react';
import { generateRecipeVisual } from '../services/geminiService';

interface DishVisualizerProps {
  title: string;
  description: string;
}

export const DishVisualizer: React.FC<DishVisualizerProps> = ({ title, description }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      setLoading(true);
      // Reset image when title changes
      setImageUrl(null);
      
      const url = await generateRecipeVisual(title, description);
      
      if (isMounted && url) {
        setImageUrl(url);
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    if (title) {
      fetchImage();
    }

    return () => {
      isMounted = false;
    };
  }, [title, description]);

  return (
    <div className="w-full aspect-video md:aspect-[2/1] rounded-xl overflow-hidden bg-slate-200 relative mb-6 shadow-inner">
      {loading && !imageUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 animate-pulse bg-slate-100">
            <svg className="w-12 h-12 mb-2 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">Dreaming up a visual...</span>
        </div>
      )}
      
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-cover animate-fade-in transition-opacity duration-700"
        />
      )}

      {!loading && !imageUrl && (
         <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 text-indigo-300">
             <span className="text-4xl font-serif font-bold opacity-20">{title.charAt(0)}</span>
         </div>
      )}
    </div>
  );
};
