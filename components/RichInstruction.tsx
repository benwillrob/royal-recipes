import React, { useState } from 'react';

interface RichInstructionProps {
  text: string;
  className?: string;
}

const IngredientTooltip: React.FC<{ name: string; quantity: string }> = ({ name, quantity }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span 
      className="relative inline-block cursor-help group"
      onClick={() => setIsOpen(!isOpen)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* The highlighted ingredient name */}
      <span className="text-indigo-600 font-semibold border-b border-indigo-300 border-dashed hover:border-solid hover:border-indigo-600 transition-all">
        {name}
      </span>

      {/* The Tooltip */}
      <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl whitespace-nowrap z-50 transition-all duration-200 ${isOpen ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2 pointer-events-none'}`}>
        {quantity}
        {/* Little arrow pointing down */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></span>
      </span>
    </span>
  );
};

export const RichInstruction: React.FC<RichInstructionProps> = ({ text, className = "" }) => {
  // Split the text based on the pattern <<Name|Quantity>>
  // Capturing parentheses in split includes the separator in the result array
  const parts = text.split(/(<<[^>]+>>)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('<<') && part.endsWith('>>')) {
          // Extract content between << and >>
          const content = part.slice(2, -2);
          const [name, quantity] = content.split('|');
          
          if (name && quantity) {
            return <IngredientTooltip key={index} name={name} quantity={quantity} />;
          }
        }
        // Return normal text
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};