import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function analyzeIssueImage(imageBase64, mimeType = 'image/jpeg') {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Analyze this image of a civic issue. Return ONLY a JSON object with no markdown, no backticks, just raw JSON:
  {
    "severity": "Low | Medium | High",
    "description": "one sentence describing the issue clearly",
    "suggested_action": "what authorities should do to fix this",
    "estimated_repair_time": "e.g. 1-2 days"
  }`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageBase64, mimeType } }
  ]);

  const text = result.response.text();
  return JSON.parse(text);
}