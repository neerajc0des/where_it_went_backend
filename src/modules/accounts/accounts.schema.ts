import z from "zod";

//schema for creating an account
export const createAccountSchema = z.object({
    body: z.object({
        name: z.string()
        .min(2, "Account name must be at least 2 characters")
        .max(100, "Account name must be at most 100 characters"),
        icon: z.string(),
        balance: z.number().min(0, "Balance cannot be negative"),
        monthlyBudget: z.number().min(0, "Budget cannot be negative").optional(),
    })
})


export const updateAccountSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    icon: z.string(),
    balance: z.number().min(0).optional(),
    monthlyBudget: z.number().min(0).optional(),
    }).refine(
        data => Object.keys(data).length > 0,
        { message: "At least one field is required to update" }
    )
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>['body'];
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>['body'];