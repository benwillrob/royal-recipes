
export enum StepType {
  PREP = 'PREP',
  COOK = 'COOK',
  TIMING = 'TIMING',
}

export interface RecipeStep {
  instruction: string;
  type: StepType;
  insight?: string;
}

export interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  steps: RecipeStep[];
}

export interface GeneratedImage {
  url: string;
  mimeType: string;
}

export interface LeftoverSuggestion {
  title: string;
  description: string;
  matchingIngredients: string[];
}
