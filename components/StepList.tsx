import React from 'react';
import { RecipeStep, StepType } from '../types';
import { RichInstruction } from './RichInstruction';

interface StepListProps {
  steps: RecipeStep[];
}

export const StepList: React.FC<StepListProps> = ({ steps }) => {
  const getStepStyles = (type: StepType) => {
    switch (type) {
      case StepType.PREP:
        return {
          container: 'border-emerald-400 bg-emerald-50',
          badge: 'bg-emerald-100 text-emerald-800',
          icon: '🔪',
          label: 'Prep',
        };
      case StepType.COOK:
        return {
          container: 'border-rose-400 bg-rose-50',
          badge: 'bg-rose-100 text-rose-800',
          icon: '🔥',
          label: 'Cook',
        };
      case StepType.TIMING:
        return {
          container: 'border-amber-400 bg-amber-50',
          badge: 'bg-amber-100 text-amber-800',
          icon: '⏱️',
          label: 'Timing',
        };
      default:
        return {
          container: 'border-slate-300 bg-slate-50',
          badge: 'bg-slate-200 text-slate-700',
          icon: '•',
          label: 'Step',
        };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-serif font-bold text-slate-800 mb-4 border-b pb-2">Instructions</h3>
      {steps.map((step, index) => {
        const style = getStepStyles(step.type);
        return (
          <div
            key={index}
            className={`relative p-4 rounded-r-lg border-l-4 shadow-sm transition-transform duration-300 hover:translate-x-1 ${style.container}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${style.badge}`}>
                {style.icon} {style.label}
              </span>
              <span className="text-slate-400 font-mono text-sm">#{index + 1}</span>
            </div>
            
            <p className="text-slate-800 leading-relaxed font-medium">
              <RichInstruction text={step.instruction} />
            </p>

            {step.insight && (
              <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 italic bg-white/60 p-2 rounded">
                <span className="text-indigo-500 text-lg">💡</span>
                <span>{step.insight}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};