import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MODELS_TO_TRY = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"];

export const analyzePrescription = async (imageBuffer: Buffer) => {
    for (const modelName of MODELS_TO_TRY) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const imagePart = {
                inlineData: { data: imageBuffer.toString("base64"), mimeType: "image/jpeg" },
            };
            const result = await model.generateContent(["Extract drug names as JSON array.", imagePart]);
            const text = result.response.text();
            return JSON.parse(text.replace(/```json|```/g, "").trim());
        } catch {
            continue;
        }
    }
    return []; // فشل الكل
};