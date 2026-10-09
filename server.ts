/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '5mb' }));

// Initialize Google GenAI client if GEMINI_API_KEY is available
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ExpenseItem {
  id: string;
  amount: number;
  desc: string;
  category: string;
  date: string;
  payment: string;
  demo?: boolean;
}

interface AnalyzeRequest {
  expenses: ExpenseItem[];
  settings: {
    budget: number;
    household?: {
      on: boolean;
      income: number;
      savePct: number;
    };
    lang?: 'en' | 'te';
  };
  lang?: 'en' | 'te';
  question?: string;
}

// Fallback rule-based analysis generator in case Gemini API key is missing or offline
function generateRuleBasedAIAnalysis(
  expenses: ExpenseItem[],
  budget: number,
  lang: 'en' | 'te',
  question?: string
) {
  const isTe = lang === 'te';
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category
  const categoryTotals: Record<string, number> = {};
  for (const e of expenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  }

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const highestCategory = sortedCategories[0] || ['Other', 0];
  const highestPct = totalSpent > 0 ? Math.round((highestCategory[1] / totalSpent) * 100) : 0;

  // Detect high transaction anomalies (> ₹1500 or > 25% of total)
  const anomalies = [];
  const highExpenses = expenses.filter((e) => e.amount >= 1500 || (totalSpent > 0 && e.amount > totalSpent * 0.25));

  for (const exp of highExpenses.slice(0, 3)) {
    anomalies.push({
      title: isTe
        ? `గమనించదగిన అధిక ఖర్చు: ₹${exp.amount.toLocaleString('en-IN')}`
        : `Notable High Expense: ₹${exp.amount.toLocaleString('en-IN')}`,
      desc: isTe
        ? `${exp.desc} (${exp.category}) - ${exp.date} న నమోదు చేయబడింది.`
        : `${exp.desc} (${exp.category}) recorded on ${exp.date}.`,
      severity: exp.amount > 3000 ? 'high' : 'medium',
      amount: exp.amount,
    });
  }

  if (anomalies.length === 0 && expenses.length > 0) {
    anomalies.push({
      title: isTe ? 'అసాధారణ ఖర్చులు ఏవీ లేవు' : 'No Unusual Spending Spikes Detected',
      desc: isTe
        ? 'మీ రోజువారీ ఖర్చులు సాధారణ పరిమితిలోనే సాగుతున్నాయి.'
        : 'Your daily expenditures are consistent without sudden out-of-band spikes.',
      severity: 'low',
    });
  }

  // Realistic Indian savings tips
  const savingsTips = [];
  if (categoryTotals['Food'] && categoryTotals['Food'] > 1000) {
    const pot = Math.round(categoryTotals['Food'] * 0.2);
    savingsTips.push({
      title: isTe ? 'ఆహారం & ఫుడ్ డెలివరీ పొదుపు' : 'Food & Snacking Optimization',
      tip: isTe
        ? 'క్యాబ్టీన్, రెస్టారెంట్ లేదా ఫుడ్ ఆర్డర్ల స్థానంలో హోమ్‌మేడ్ టిఫిన్ లేదా ప్యాక్డ్ లంచ్ ఎంచుకుంటే నెలవారీ సులభంగా ఆదా చేయవచ్చు.'
        : 'Opt for homemade tiffin, college mess or pre-packing snacks instead of frequent online delivery or tea-stall stops.',
      potentialMonthlySavingINR: pot,
    });
  }

  if (categoryTotals['Transport'] && categoryTotals['Transport'] > 500) {
    const pot = Math.round(categoryTotals['Transport'] * 0.25);
    savingsTips.push({
      title: isTe ? 'రవాణా & ప్రయాణ ఖర్చులు' : 'Commute & Travel Passes',
      tip: isTe
        ? 'ప్రతిరోజూ ఆటో లేదా క్యాబ్స్ వాడటానికి బదులుగా నెలవారీ మెట్రో/RTC బస్ పాస్ తీసుకోవడం ద్వారా అధిక మొత్తం ఆదా అవుతుంది.'
        : 'Switch from daily autos/cabs to a monthly student or metro smartcard pass to cut travel bills significantly.',
      potentialMonthlySavingINR: pot,
    });
  }

  if (categoryTotals['Shopping'] && categoryTotals['Shopping'] > 1000) {
    const pot = Math.round(categoryTotals['Shopping'] * 0.3);
    savingsTips.push({
      title: isTe ? '48 గంటల షాపింగ్ నియమం' : '48-Hour Discretionary Spending Rule',
      tip: isTe
        ? 'ఆన్‌లైన్ షాపింగ్‌లో వెంటనే కొనుగోలు చేయకుండా 48 గంటలు వేచి చూడటం ద్వారా అనవసర కొనుగోళ్లను నివారించవచ్చు.'
        : 'Pause for 48 hours before purchasing non-essential items online to eliminate impulse buying.',
      potentialMonthlySavingINR: pot,
    });
  }

  if (savingsTips.length === 0) {
    savingsTips.push({
      title: isTe ? 'చిన్న ఖర్చుల సమీక్ష' : 'Micro-Expense Daily Tracking',
      tip: isTe
        ? 'రోజువారీ టీ, స్నాక్స్ మరియు రీఛార్జ్‌లపై నియంత్రణ ఉంచడం ద్వారా ప్రతి నెలా ₹500 - ₹1,000 వరకు సులభంగా ఆదా చేయవచ్చు.'
        : 'Track recurring micro-expenses like daily chai and snacks; capping them saves ₹500 - ₹1,500 every month.',
      potentialMonthlySavingINR: 750,
    });
  }

  let summary = isTe
    ? `మీరు ఇప్పటివరకు మొత్తం ₹${totalSpent.toLocaleString('en-IN')} ఖర్చు చేశారు. ఇందులో అత్యధికంగా ${highestPct}% ${highestCategory[0]} పై ఖర్చయింది.`
    : `Total recorded spending is ₹${totalSpent.toLocaleString('en-IN')}, with ${highestCategory[0]} taking the lion's share at ${highestPct}%.`;

  if (budget > 0) {
    if (totalSpent > budget) {
      summary += isTe
        ? ` మీరు నిర్ణయించిన ₹${budget.toLocaleString('en-IN')} బడ్జెట్‌ను దాటేశారు.`
        : ` You have exceeded your ₹${budget.toLocaleString('en-IN')} monthly target.`;
    } else {
      const left = budget - totalSpent;
      summary += isTe
        ? ` బడ్జెట్‌లో ఇంకా ₹${left.toLocaleString('en-IN')} మిగిలి ఉంది.`
        : ` You still have ₹${left.toLocaleString('en-IN')} safe to spend this month.`;
    }
  }

  let answer: string | undefined;
  if (question) {
    answer = isTe
      ? `మీ ప్రశ్న: "${question}". సలహా: మీ అత్యధిక ఖర్చు విభాగం (${highestCategory[0]}) పై శ్రద్ధ వహించండి మరియు అనవసర ఖర్చులను తగ్గించండి.`
      : `Answering your question "${question}": Based on your ${expenses.length} records, prioritizing reductions in ${highestCategory[0]} will yield the fastest financial relief.`;
  }

  return {
    success: true,
    isOfflineFallback: true,
    summary,
    anomalies,
    savingsTips,
    answer,
  };
}

// POST /api/ai/spending-insights - Server-side Gemini AI Spending Assistant
app.post('/api/ai/spending-insights', async (req: Request, res: Response) => {
  try {
    const { expenses = [], settings = { budget: 0 }, lang = 'en', question } = req.body as AnalyzeRequest;

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return res.json({
        success: true,
        summary: lang === 'te'
          ? 'విశ్లేషణ కోసం దయచేసి మొదట కొన్ని ఖర్చులను నమోదు చేయండి.'
          : 'Please add a few expenses first so the AI assistant can analyze your spending patterns.',
        anomalies: [],
        savingsTips: [
          {
            title: lang === 'te' ? 'మొదటి అడుగు' : 'First Step',
            tip: lang === 'te'
              ? 'రోజువారీ టీ, కిరాణా లేదా ప్రయాణ ఖర్చులను నమోదు చేయడం ప్రారంభించండి.'
              : 'Start logging your daily chai, groceries, or auto fares to unlock tailored insights.',
            potentialMonthlySavingINR: 500,
          },
        ],
        answer: question
          ? (lang === 'te' ? 'సమాచారం అందుబాటులో లేదు.' : 'No expense data yet to evaluate.')
          : undefined,
      });
    }

    // If Gemini client is not initialized, use rule-based fallback
    if (!aiClient) {
      const fallback = generateRuleBasedAIAnalysis(expenses, settings.budget, lang, question);
      return res.json(fallback);
    }

    // Calculate aggregated context for Gemini prompt
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryTotals: Record<string, number> = {};
    for (const e of expenses) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }

    const expensesSummaryText = expenses
      .slice(0, 40)
      .map((e) => `- ${e.date}: ₹${e.amount} on "${e.desc}" (${e.category}, via ${e.payment})`)
      .join('\n');

    const systemPrompt = `You are "PaisaPilot AI Spending Assistant", a practical, encouraging financial advisor built by Team Zenvex for Indian students, young professionals, and households with low or irregular income.
Your job is to analyze real spending data in INR (₹), explain spending patterns, identify unusual or anomalous transactions, and suggest 3-4 realistic savings strategies grounded in everyday Indian life (e.g. tiffin meals, shared autos, student passes, electricity conservation, grocery bulk buys, 48-hour online shopping pauses).

IMPORTANT RULES:
- Always use INR (₹) with Indian numbering (e.g. ₹1,200).
- If lang is 'te', provide all responses, titles, descriptions and tips in natural, grammatically correct Telugu script (తెలుగు).
- If lang is 'en', reply in clear, professional English.
- Return ONLY valid JSON matching this schema:
{
  "summary": "Short 2-3 sentence overview of financial posture, total spent, and largest expense category",
  "anomalies": [
    { "title": "Anomaly title", "desc": "Explanation of why this transaction or pattern is unusual", "severity": "high" | "medium" | "low", "amount": number }
  ],
  "savingsTips": [
    { "title": "Tip title", "tip": "Concrete, actionable tip with Indian context", "potentialMonthlySavingINR": number }
  ],
  "answer": "Contextual, empathetic answer to the user's specific question if one was asked, else null"
}`;

    const userPrompt = `Language: ${lang}
User's Monthly Budget: ₹${settings.budget || 0}
Household Mode Active: ${Boolean(settings.household?.on)} (Income: ₹${settings.household?.income || 0}, Target Savings: ${settings.household?.savePct || 10}%)
Total Spent Recorded: ₹${totalAmount}
Category Breakdown: ${JSON.stringify(categoryTotals)}
Recent Transactions:
${expensesSummaryText}

${question ? `User Question to AI: "${question}"` : 'Please perform a full spending pattern analysis and anomaly check.'}`;

    const geminiResponse = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const responseText = geminiResponse.text?.trim() || '';
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    try {
      const parsedAI = JSON.parse(responseText);
      return res.json({
        success: true,
        summary: parsedAI.summary || '',
        anomalies: Array.isArray(parsedAI.anomalies) ? parsedAI.anomalies : [],
        savingsTips: Array.isArray(parsedAI.savingsTips) ? parsedAI.savingsTips : [],
        answer: parsedAI.answer || undefined,
        isGeminiLive: true,
      });
    } catch {
      // Fallback if model output wasn't strictly JSON
      const fallback = generateRuleBasedAIAnalysis(expenses, settings.budget, lang, question);
      return res.json(fallback);
    }
  } catch (error) {
    console.error('Gemini spending analysis error:', error);
    // Graceful fallback so user experience never breaks
    const fallback = generateRuleBasedAIAnalysis(
      req.body.expenses || [],
      req.body.settings?.budget || 0,
      req.body.lang || 'en',
      req.body.question
    );
    return res.json(fallback);
  }
});

// Setup Vite in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PaisaPilot India server running on port ${port}`);
  });
}

startServer();
