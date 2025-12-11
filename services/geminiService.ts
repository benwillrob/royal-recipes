import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Recipe, StepType, LeftoverSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const recipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "The name of the dish.",
    },
    description: {
      type: Type.STRING,
      description: "A short, appetizing description of the dish (max 20 words).",
    },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of ingredients with quantities.",
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          instruction: {
            type: Type.STRING,
            description: "The action to perform. IMPORTANT: Wrap mentioned ingredients in <<Name|Quantity>> tags. Calculate specific amount for this step. Example: 'Add <<butter|50g>> to pan'.",
          },
          type: {
            type: Type.STRING,
            enum: ["PREP", "COOK", "TIMING"],
            description: "Category of the step. PREP for cutting/mixing, COOK for heating/frying, TIMING for specific wait times.",
          },
          insight: {
            type: Type.STRING,
            description: "Optional helpful tip, technique explanation, or safety reminder.",
            nullable: true,
          },
        },
        required: ["instruction", "type"],
      },
    },
  },
  required: ["title", "description", "ingredients", "steps"],
};

const leftoverSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      matchingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["title", "description", "matchingIngredients"]
  }
};

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to handle API calls with retry for rate limits
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || 
                          error?.code === 429 || 
                          (error?.message && error.message.includes('429')) ||
                          (error?.message && error.message.includes('quota'));
      
      if (isRateLimit && i < retries - 1) {
        const waitTime = baseDelay * Math.pow(2, i); // Exponential backoff
        console.warn(`Rate limit hit. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export const generateRecipe = async (query: string): Promise<Recipe> => {
  const model = "gemini-2.5-flash";
  const prompt = `Create a detailed cooking recipe based on this request: "${query}". 
  Classify each step accurately as PREP, COOK, or TIMING. 
  Include helpful, short insights for complex steps.
  
  CRITICAL INSTRUCTION FORMATTING:
  When an ingredient is mentioned in a step, you MUST wrap it in double angle brackets like this: <<Ingredient Name|Specific Quantity For This Step>>.
  If the recipe calls for "1 cup sugar" but this step only uses half, write: "Add <<sugar|1/2 cup>>...".
  Example: "Whisk the <<eggs|2>> and <<vanilla|1 tsp>> together."
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No content generated");
    }

    return JSON.parse(text) as Recipe;
  });
};

export const generateLeftoverSuggestions = async (ingredients: string[], currentTitle: string): Promise<LeftoverSuggestion[]> => {
  const model = "gemini-2.5-flash";
  const prompt = `I just made "${currentTitle}" using these ingredients: ${ingredients.join(', ')}.
  Suggest 3 distinct, creative, and simple recipes I could make with the potential leftovers or remaining ingredients from this list.
  Focus on minimizing food waste.`;

  try {
    return await withRetry(async () => {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
            responseMimeType: "application/json",
            responseSchema: leftoverSchema,
            temperature: 0.5,
            },
        });

        const text = response.text;
        if (!text) return [];

        return JSON.parse(text) as LeftoverSuggestion[];
    });
  } catch (error) {
    console.error("Failed to generate leftovers:", error);
    return [];
  }
};

export const generateRecipeVisual = async (title: string, description: string): Promise<string | null> => {
  const model = "gemini-2.5-flash-image";
  const prompt = `A minimalistic, artistic, shape-based vector style illustration of ${title}. 
  Description: ${description}. 
  Style: Flat design, abstract food art, appetizing colors, creamy background. 
  Not photorealistic. No text in image.`;

  try {
    return await withRetry(async () => {
        const response = await ai.models.generateContent({
        model,
        contents: prompt,
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64EncodeString}`;
        }
        }
        return null;
    });
  } catch (error) {
    console.error("Failed to generate image:", error);
    return null; // Fail gracefully for image
  }
};

export const generateStepVisual = async (instruction: string, previousInstructions: string[] = []): Promise<string | null> => {
    const model = "gemini-2.5-flash-image";
    
    // Clean the instruction by removing the <<ingredient|quantity>> markup for the image prompt
    const cleanText = (text: string) => text.replace(/<<([^|]+)\|[^>]+>>/g, '$1');

    const cleanInstruction = cleanText(instruction);
    
    // Build context string from previous instructions
    const cleanPrevious = previousInstructions.map(cleanText);
    const contextStr = cleanPrevious.length > 0 
        ? `PREVIOUS STEPS CONTEXT (The dish state so far): ${cleanPrevious.join('; ')}.`
        : "Start of recipe.";
    
    const shortInstruction = cleanInstruction.length > 150 ? cleanInstruction.substring(0, 150) + "..." : cleanInstruction;
    
    const prompt = `Create a simple, flat vector art illustration for this cooking step.
    
    CURRENT ACTION: "${shortInstruction}"
    
    ${contextStr}
    
    IMPORTANT VISUAL RULES:
    1. Depict the CURRENT ACTION.
    2. VISUAL CONTINUITY: You MUST include the state of the dish from the PREVIOUS STEPS CONTEXT. For example, if beef was added to a pan in a previous step, show the pan WITH beef in it for this step.
    3. Style: Minimalist, clean lines, pastel colors, instructional diagram style. 
    4. NO TEXT in the image.`;
  
    try {
      return await withRetry(async () => {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
    
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64EncodeString}`;
            }
        }
        return null;
      });
    } catch (error) {
      console.error("Failed to generate step image:", error);
      return null;
    }
  };

// --- TTS HELPER FUNCTIONS ---

// Helper to convert raw PCM to WAV so it can be played by standard HTML Audio elements
function pcmToWav(pcmData: Uint8Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
  
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
  
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
  
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
  
    // Write PCM data
    const pcmBytes = new Uint8Array(buffer, 44);
    pcmBytes.set(pcmData);
  
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  export const generateStepAudio = async (text: string): Promise<string | null> => {
    // 1. Clean text for speech: "<<butter|50g>>" becomes "50g of butter" for natural reading
    const spokenText = text.replace(/<<([^|]+)\|([^>]+)>>/g, '$2 of $1');
    
    try {
        return await withRetry(async () => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: {
                    parts: [{ text: spokenText }]
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });
    
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
                // Decode base64 to raw binary string
                const binaryString = atob(base64Audio);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                // Convert Raw PCM to WAV Blob
                const wavBlob = pcmToWav(bytes, 24000);
                return URL.createObjectURL(wavBlob);
            }
            return null;
        });
    } catch (error) {
        console.error("Failed to generate audio:", error);
        return null;
    }
  };