declare module '@google/generative-ai' {
  export interface GenerationConfig {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
  }

  export interface GenerativeModelParams {
    model: string;
    generationConfig?: GenerationConfig;
  }

  export interface GenerateContentResponse {
    response: {
      text: () => string;
    };
  }

  export class GenerativeModel {
    constructor(params: GenerativeModelParams);
    generateContent(prompt: string): Promise<GenerateContentResponse>;
  }

  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(params: GenerativeModelParams): GenerativeModel;
  }
} 