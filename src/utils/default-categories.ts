import { TransactionType } from "@prisma/client";

export const DEFAULT_CATEGORIES: { name: string; icon: string; type: TransactionType }[] = [
  { name: "Salary", icon: "salary", type: "INCOME" },
  { name: "Freelance", icon: "laptop", type: "INCOME" },
  { name: "Investments", icon: "investments", type: "INCOME" },
  { name: "Food & Dining", icon: "chicken", type: "EXPENSE" },
  { name: "Groceries", icon: "grocery", type: "EXPENSE" },
  { name: "Transportation", icon: "car", type: "EXPENSE" },
  { name: "Shopping", icon: "shoppingbag", type: "EXPENSE" },
  { name: "Entertainment", icon: "entertainment", type: "EXPENSE" },
  { name: "Health & Medical", icon: "medical", type: "EXPENSE" },
  { name: "Housing & Bills", icon: "bills", type: "EXPENSE" },
];