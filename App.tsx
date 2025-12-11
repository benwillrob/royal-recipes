import React, { useState } from 'react';
import { generateRecipe } from './services/geminiService';
import { Recipe } from './types';
import { RecipeCard } from './components/RecipeCard';
import { LoadingSpinner } from './components/LoadingSpinner';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setRecipe(null);
    setHasSearched(true);

    try {
      const result = await generateRecipe(query);
      setRecipe(result);
    } catch (err) {
      console.error(err);
      setError("Sorry, we couldn't cook up a recipe for that. Please try a different request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      
      {/* Dynamic Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sticky Header */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.reload()}>
                <span className="text-2xl group-hover:scale-110 transition-transform">👑</span>
                <span className="font-serif font-bold text-xl text-slate-900 tracking-tight">Royal Recipes</span>
            </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12 relative z-10">
        {/* Search Hero Section - Collapses when recipe is found */}
        <div className={`transition-all duration-700 ease-in-out flex flex-col items-center justify-center ${recipe || loading ? 'mb-8' : 'min-h-[60vh] mb-0'}`}>
            
            {!recipe && !loading && (
                <div className="text-center mb-8 max-w-xl animate-fade-in-up">
                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-6 leading-tight">
                        What are you <br/> <span className="text-indigo-600">craving?</span>
                    </h1>
                    <p className="text-slate-500 text-lg md:text-xl font-light">
                        Describe a dish, list ingredients, or just say a mood. <br className="hidden md:block"/> We'll handle the rest.
                    </p>
                </div>
            )}

            <form onSubmit={handleSearch} className="w-full max-w-2xl relative group z-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. 'Creamy pasta with mushrooms' or 'Spicy chicken'"
                    className="w-full pl-14 pr-36 py-5 text-lg rounded-full bg-slate-800 text-white placeholder-slate-400 border-2 border-slate-700 shadow-xl shadow-slate-200/50 
                    focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:scale-[1.02] 
                    outline-none transition-all duration-300 ease-out"
                    disabled={loading}
                />
                <button 
                    type="submit" 
                    className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white px-8 rounded-full font-bold text-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20"
                    disabled={loading || !query.trim()}
                >
                    {loading ? 'Cooking...' : 'Go'}
                </button>
            </form>
            
            {/* Quick Suggestions */}
            {!recipe && !loading && !hasSearched && (
                <div className="mt-10 flex flex-wrap gap-3 justify-center text-sm text-slate-600 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <span className="text-slate-400 w-full text-center mb-1 uppercase tracking-widest text-xs font-semibold">Try something like</span>
                    {['15-minute healthy lunch', 'Chocolate dessert with 3 ingredients', 'Vegan curry'].map((suggestion) => (
                        <button 
                            key={suggestion}
                            onClick={() => { setQuery(suggestion); }}
                            className="bg-white/80 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-full hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Content Area */}
        <div className="transition-opacity duration-500">
            {loading && <LoadingSpinner />}
            
            {error && (
                <div className="max-w-xl mx-auto bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 text-center shadow-lg animate-fade-in">
                    <p className="font-bold text-lg mb-1">Oops!</p>
                    <p>{error}</p>
                </div>
            )}

            {recipe && !loading && (
                <div className="animate-fade-in-up">
                    <RecipeCard recipe={recipe} />
                    
                    <div className="text-center mt-16 mb-12">
                        <button 
                            onClick={() => {
                                setRecipe(null);
                                setQuery('');
                                setHasSearched(false);
                            }}
                            className="text-slate-400 hover:text-indigo-600 hover:underline text-sm transition-colors uppercase tracking-widest font-semibold"
                        >
                            Start Over
                        </button>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;