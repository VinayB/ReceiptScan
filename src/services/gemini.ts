import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ExtractedReceipt {
  merchant: string;
  date: string;
  amount: number;
  tax?: number;
  currency: string;
  category: string;
}

export async function extractReceiptData(base64Image: string): Promise<ExtractedReceipt | null> {
  try {
    const model = "gemini-3-flash-preview";
    
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image,
              },
            },
            {
              text: "Extract the following details from this receipt: merchant name, date, total amount, tax amount (if explicitly listed), currency code (e.g., USD, EUR, GBP, JPY, CAD, AUD, INR, AED), and a likely category (e.g., Food & Drinks, Travel, Supplies, Entertainment, Other). If the currency is not explicitly stated, infer it from the symbols or merchant location. Return the data in JSON format.",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING, description: "ISO date or human readable date from receipt" },
            amount: { type: Type.NUMBER },
            tax: { type: Type.NUMBER, description: "The tax amount if listed on the receipt" },
            currency: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["merchant", "date", "amount", "currency", "category"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as ExtractedReceipt;
  } catch (error) {
    console.error("Error extracting receipt data:", error);
    return null;
  }
}
