import express from 'express';
import type { Request, Response } from 'express';
import {
  explainAllocationRecommendation,
  generateDailyOperatorBrief,
  askTheGrid,
  extractWaterDataFromPdf
} from './geminiService.ts';

export const apiRouter = express.Router();
apiRouter.use(express.json({ limit: '25mb' }));
apiRouter.use(express.urlencoded({ limit: '25mb', extended: true }));

apiRouter.post('/gemini/extract-pdf', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, filename, cityName } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'pdfBase64 is required' });
    }
    const extractedData = await extractWaterDataFromPdf(pdfBase64, filename || 'document.pdf', cityName);
    res.json({ success: true, data: extractedData, isAI: true });
  } catch (err: any) {
    console.error('API /gemini/extract-pdf error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/gemini/explain', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const explanation = await explainAllocationRecommendation(data);
    res.json({ success: true, explanation, isAI: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/gemini/brief', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const brief = await generateDailyOperatorBrief(data);
    res.json({ success: true, brief, isAI: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/gemini/ask', async (req: Request, res: Response) => {
  try {
    const { query, gridContext } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    const answer = await askTheGrid(query, gridContext || {});
    res.json({ success: true, answer, isAI: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
