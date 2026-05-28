import prisma from "../../config/db";
import { GenerateRecapInput } from "./recap.schema";

// helper funciton to get the time period for the recap
const getRecapTimePeriod = (
  type: 'MONTHLY' | 'YEARLY',
  year: number,
  month?: number,
)=>{
  if(type === 'MONTHLY') {
    const start = new Date(year, month!-1, 1);
    const end = new Date(year, month!, 0, 23, 59, 59);
    const label = start.toLocaleString('default', {
      month: 'long',  // June
      year: 'numeric' // 2026
    });

    return { start, end, label };
  }
  
  else{
    // jan 1
    const start = new Date(year, 0, 1);  
    // dec 31       
    const end = new Date(year, 11, 31, 23, 59, 59);
    const label = year.toString();

    return { start, end, label };
  }
}

const getPersonalityLabel = (transactions: any[])=>{
  return "test string"
}

const getMoodCorrelation = async (userId: string, start: Date, end: Date) =>{
  return "test string"
}

const generateRecapService = async (
  userId: string,
  payload: GenerateRecapInput,
) => {
    const { type, year, month } = payload;
    const { start, end, label } = getRecapTimePeriod(type, year, month);

    // checking if recap already exists for this period
    const exists = await prisma.recap.findFirst({
      where: {userId, type, periodLabel: label}
    });

    if(exists)
      throw new Error(`Recap for ${label} already exists!`);

    // fetching all transaction in that time period
    const allTransactions = await prisma.transaction.findMany({
      where: {
        accountId: userId,
        date: {gte: start, lte: end}
      },
      include: {
        account: {select: {name: true}},
        category: {select: {name: true}}
      }
    })

    if(allTransactions.length===0)
      throw new Error('No transactions found in given time period');

    // filtering expense and income
    const expenses = allTransactions.filter((t)=>{
      return t.type === 'EXPENSE';
    })
    const incomes = allTransactions.filter((t)=>{
      return t.type === 'INCOME';
    })

    // calculating total spend and income
    const totalExpense = expenses.reduce((sum, t)=>{
      return sum+ t.amount.toNumber();
    },0);

    const totalIncome = incomes.reduce((sum, t)=>{
      return sum+ t.amount.toNumber();
    },0)

    const netChange = totalIncome - totalExpense;

    
    // highest and lowest spendings
    const amountArr = expenses.map((t)=>{
      return t.amount.toNumber();
    })
    const highestSpend = amountArr.length>0? Math.max(...amountArr) : 0;
    const lowestSpend = amountArr.length>0? Math.min(...amountArr) : 0;

    // category breakdown
    // {'Food': 200, 'Education': 300, ...}
    const categoryExpenseBreakdown: Record<string, number> = {};

    expenses.forEach(t=>{
      const name = t.category.name;
      const catAmount = t.amount.toNumber();
      categoryExpenseBreakdown[name] = (categoryExpenseBreakdown[name] || 0) + catAmount;
    });

    // # Top spend category

    //object.entries converts objects into array of [key, val]
    // b[1] - a[1] keep bigger numbers first
    // a and b represent two categories being compared (like ["Food", 35] and ["Gas", 90])
    const topExpenseCategory = Object.entries(categoryExpenseBreakdown).sort((a,b)=>b[1] - a[1])[0]?.[0] ?? 'OTHER';


    // account breakdown
    // {'SBI': 200, 'UPI': 300, ...}
    const accountExpenseBreakdown: Record<string, number> = {};

    expenses.forEach(t=>{
      const name = t.account.name;
      const accountAmount = t.amount.toNumber();
      accountExpenseBreakdown[name] = (accountExpenseBreakdown[name] || 0) + accountAmount;
    });


    // personality 
    const personalitylabel = getPersonalityLabel(allTransactions);
    // mood correlation
    const moodCorrelation = await getMoodCorrelation(userId, start, end);

    const recap = await prisma.recap.create({
      data: {
        type,
        periodLabel: label,
        startDate: start,
        endDate: end,
        totalSpent: totalExpense,
        totalIncome: totalIncome,
        netChange: netChange,
        topCategory: topExpenseCategory,
        highestSpend,
        lowestSpend,
        transactionCount: allTransactions.length,
        categoryBreakdown: categoryExpenseBreakdown,
        accountBreakdown: accountExpenseBreakdown,
        personalityLabel: personalitylabel,
        moodCorrelation: moodCorrelation,
        userId
      }
    });

    return recap;

}