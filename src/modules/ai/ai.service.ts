import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import prisma from '../../config/db';
import { SmartEntryInput } from './ai.schema';
import { getPrimaryAccount } from '../accounts/accounts.service';
import { TransactionType } from '@prisma/client';

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const buildSystemPrompt = (
  formattedCategories: string,
  formattedAccounts: string,
  defaultAccountId: string
) => `
You are a financial data extraction utility. Extract transaction details from natural language.

RULES:
1. Amount: Extract the numeric value. If no amount mentioned, set to 0.
2. Merchant: Clean name of store/vendor/app. Use "Unknown" if unclear.
3. CategoryId: Pick the EXACT ID from the list below that best fits.
   If genuinely NOTHING fits, return an empty string "" rather than forcing a wrong category.
4. AccountId + accountMentioned: Set accountMentioned to true ONLY when the text names an
   account or a clear payment method (e.g. "from HDFC", "paid by cash", "on GPay"). In that
   case pick the EXACT matching ID. If the text says nothing about how it was paid, set
   accountMentioned to false and use the primary account ID: "${defaultAccountId}".
5. Type: If category type is INCOME → set "INCOME". Otherwise → "EXPENSE".
6. Note: Short, friendly description (e.g. "Midnight snack craving", "Monthly salary").
7. isImpulse: true only if clearly unplanned/spontaneous (late night snacks, random shopping).

AVAILABLE CATEGORIES:
${formattedCategories}

AVAILABLE ACCOUNTS:
${formattedAccounts}

Respond ONLY with valid JSON matching the schema. No extra text.
`;

const getResponseSchema = () => ({
    type: Type.OBJECT,
    properties: {
        amount: { 
            type: Type.NUMBER, 
            description: "The total amount spent or earned. If the user did not mention any price or number, strictly set this to 0." 
        },
        merchant: { 
            type: Type.STRING, 
            description: "The clean name of the store, vendor, or app (e.g., 'Zomato', 'Amazon', 'Starbucks'). Use 'Unknown' if not clear." 
        },
        categoryId: {
            type: Type.STRING,
            description: "The exact ID of the category that best fits this transaction, chosen from the provided list."
        },
        accountId: {
            type: Type.STRING,
            description: "The exact ID of the matched payment account from the provided list."
        },
        accountMentioned: {
            type: Type.BOOLEAN,
            description: "True only if the text explicitly names an account or payment method. False when the user said nothing about how it was paid."
        },
        type: {
            type: Type.STRING,
            enum: ["EXPENSE", "INCOME"],
        },
        note: { 
            type: Type.STRING, 
            description: "A friendly, capitalized short note describing what this was (e.g., 'Pocket money', 'Midnight snack cravings', 'Electricity bill payment')." 
        },
        isImpulse: { 
            type: Type.BOOLEAN, 
            description: "Set to true if the context strongly implies a sudden, non-essential splurge or unplanned shopping (e.g., junk food, gaming, impulse buying). Otherwise set to false." 
        }
    },
    required: ["amount", "merchant", "categoryId", "accountId", "accountMentioned", "type", "note", "isImpulse"],
});

export const smartEntryService = async (
    userId: string,
    payload: SmartEntryInput,
)=>{

    const {prompt: userInput} = payload;

    //fetching available categories
    const categories = await prisma.transactionCategory.findMany({
      where: {
        OR: [
          { userId: null },   
          { userId: userId }
        ]
      },
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    const formattedCats = categories.map((cat:any)=>{
        return `- ID: "${cat.id}" | NAME: "${cat.name}" | TYPE: "${cat.type}"`
    }).join("\n");

    // fetching all the accounts
    const accounts = await prisma.account.findMany({
        where: {userId},
        select: {id:true, name: true}
    });

    if(accounts.length===0) throw new Error('User has no accounts set up.');

    // the user's chosen primary is the default when the text names no account
    const primaryAccount = await getPrimaryAccount(userId);
    const defaultAcc =
        accounts.find(acc => acc.id === primaryAccount?.id)
        || accounts.find(acc => acc.name.toLowerCase() === 'wallet')
        || accounts[0];
    const formattedAcc = accounts.map((acc:any)=>{
        return `- ACCOUNT_ID: "${acc.id}" | ACCOUNT_NAME: "${acc.name}"`;
    }).join("\n");

    const prompt = `Parse this transaction text: "${userInput}"`;
    const config = {
            systemInstruction: buildSystemPrompt(formattedCats, formattedAcc, defaultAcc.id),
            responseMimeType: "application/json",
            responseSchema: getResponseSchema(),
        }
    const response = await generateWithRetry(prompt, config);

    // const response = await ai.models.generateContent({
    //     model: "gemini-2.5-flash",
    //     contents: `Parse this transaction text: "${userInput}"`,
    //     config: {
    //         systemInstruction: buildSystemPrompt(formattedCats, formattedAcc, defaultAcc.id),
    //         responseMimeType: "application/json",
    //         responseSchema: getResponseSchema,
    //     }
    // });


    if (!response || !response.text) {
        throw new Error("Gemini engine failed to return parseable text.");
    }
    
    const parsedData = JSON.parse(response.text);

    if (parsedData.amount === 0) {
        throw new Error('Could not extract amount. Please specify a price.');
    }

    // The model can return an unusable category (empty, hallucinated, or the wrong
    // direction). Rather than failing the whole entry, fall back to Miscellaneous.
    const matchedCategory = categories.find((c: any) => c.id === parsedData.categoryId);
    const txType: TransactionType =
        parsedData.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;

    const category =
        matchedCategory && matchedCategory.type === txType
            ? matchedCategory
            : await ensureMiscellaneousCategory(userId, txType);

    parsedData.categoryId = category.id;
    parsedData.category = category.name;

    // The model happily picks an arbitrary account even when the text names none, so
    // trust its own accountMentioned flag rather than the id it chose. Anything not
    // explicitly mentioned — or not a real account — lands on the primary.
    const validAccount = accounts.find((a: any) => a.id === parsedData.accountId);

    if (!validAccount || parsedData.accountMentioned !== true) {
        parsedData.accountId = defaultAcc.id;
    }

    parsedData.account = accounts.find((a: any) => a.id === parsedData.accountId)?.name;

    const date = new Date();
    const transaction = await prisma.transaction.create({
            data: {
            amount: parsedData.amount,
            type: parsedData.type,
            categoryId: parsedData.categoryId,
            accountId: parsedData.accountId,
            merchant: parsedData.merchant,
            note: parsedData.note,
            isImpulse: parsedData.isImpulse,
            date,
            hourOfDay: date.getHours(),
            dayOfWeek: date.getDay(),
            }
        });

    await prisma.account.update({
            where: { id: parsedData.accountId },
            data: {
            balance: parsedData.type === 'EXPENSE'
                ? { decrement: parsedData.amount }
                : { increment: parsedData.amount }
            }
        });

    return {
        transaction,
        aiExtracted: parsedData
    };
}

/**
 * Categories are unique on (name, userId), so a user can hold only one row called
 * "Miscellaneous". When both directions need a fallback the income one is suffixed
 * rather than colliding.
 */
const ensureMiscellaneousCategory = async (userId: string, type: TransactionType) => {
    const name = type === TransactionType.INCOME ? 'Miscellaneous Income' : 'Miscellaneous';

    const existing = await prisma.transactionCategory.findFirst({
        where: {
            type,
            name,
            OR: [{ userId: null }, { userId }],
        },
    });

    if (existing) return existing;

    return prisma.transactionCategory.create({
        data: {
            name,
            type,
            icon: 'tag',
            isDefault: false,
            userId,
        },
    });
};

const generateWithRetry = async (contents: string, config: any, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config
      });
    } catch (error: any) {
      if (error?.status === 503 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
};