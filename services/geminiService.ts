import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = 'AIzaSyCqH7TNA0abedsFLNkFUQsQSVxtX4r5gZs';

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-pro" });
} else {
    console.warn("Gemini API Key is missing. AI features will not work.");
}

export const generateContent = async (prompt: string) => {
    if (!model) {
        console.error("Gemini AI model is not initialized. Check your API key.");
        throw new Error("Gemini AI not initialized (Invalid API Key)");
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating content with Gemini:", error);
        throw error;
    }
};
