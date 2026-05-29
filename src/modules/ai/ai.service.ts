import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import prisma from '../../config/db';

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const smartEntryService = async (
    userId: string,
    userInput: string,
)=>{

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

    const formattedCats = categories.map((cat)=>{
        return `- ID: "${cat.id}" | NAME: "${cat.name} | TYPE: "${cat.type}"`
    }).join("\n");

    // fetching all the accounts
    const accounts = await prisma.account.findMany({
        where: {userId},
        select: {id:true, name: true}
    });

    if(accounts.length===0) throw new Error('User has no accounts set up.');

    const defaultAcc = accounts.find(acc=> acc.name.toLowerCase().includes('cash')) || accounts[0];
    const formattedAcc = accounts.map((acc)=>{
        return `- ACCOUNT_ID: "${acc.id}" | ACCOUNT_NAME: "${acc.name}"`;
    }).join("\n");

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Parse this transaction text: "${userInput}"`,
        config: {
            systemInstruction: `
                You are a backend utility that extracts financial data from text. 
                Analyze the user's input and perform the following tasks:
                1. Extract the numeric amount. If the user does not specify a price or amount anywhere in the text (e.g., "ate momos", "filled petrol"), strictly set the amount to 0
                2. Identify the merchant or item name (e.g., 'Starbucks', 'Netflix', 'Zomato') for the description.
                3. Map the transaction to the most appropriate Category ID from this list: \n
                ${formattedCats}
                4. Map to the most appropriate Account ID from this list based on contextual payment clues (e.g., 'gpay', 'online', 'bank' might map to a bank account; 'cash' maps to cash):
                ${formattedAcc}
                If the user does not specify HOW they paid (e.g., "spent 200 on momos"), you MUST strictly return this default Account ID: "${defaultAcc.id}"
                Strictly choose an IDs from the list provided above. If the matched category has a Type of 'INCOME', set the transaction type to 'INCOME'. If it has a Type of 'EXPENSE', set it to 'EXPENSE'.
            `,
            responseMimeType: "application/json",
            responseSchema: {
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
                required: ["amount", "merchant", "categoryId", "accountId", "type", "note", "isImpulse"],
            }
        }
    });

    if (!response.text) {
        throw new Error("Empty response text from AI model");
    }
    
    const parsedData = JSON.parse(response.text);

    if (parsedData.amount === 0) {
        throw new Error('Could not extract amount. Please specify a price.');
    }

    // validate AI returned valid IDs
    const validCategory = categories.find(c => c.id === parsedData.categoryId);
    if (!validCategory) throw new Error('AI returned invalid category');

    const validAccount = accounts.find(a => a.id === parsedData.accountId);
    if (!validAccount) throw new Error('AI returned invalid account');

    const date = new Date();
    const [transaction] = await prisma.$transaction([
        prisma.transaction.create({
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
        }),
        prisma.account.update({
            where: { id: parsedData.accountId },
            data: {
            balance: parsedData.type === 'EXPENSE'
                ? { decrement: parsedData.amount }
                : { increment: parsedData.amount }
            }
        })
    ]);

    return {
        transaction,
        aiExtracted: parsedData
    };
}

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

// async function runTest() {
//     try {
//         const response = await smartEntryService("d9dabfc9-97f5-412e-a662-b7d076d330f1", "ate momos at some local vendor and paid 60 rupees for that");
//         console.log(response); // Use .text to get the clear string response
//     } catch (error) {
//         console.error("Error executing Gemini service:", error);
//     }
// }

// runTest();