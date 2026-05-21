# Where It Went - Backend API

A comprehensive expense tracking and financial wellness backend API built with Node.js, Express, TypeScript, and PostgreSQL.

## Overview

**Where It Went** is a full-featured financial tracking platform that helps users monitor their spending, correlate it with their mood, and receive intelligent nudges for better financial habits. The backend provides REST APIs for expense management, mood logging, and AI-driven financial insights.

## Features

- **User Authentication** - JWT-based authentication with refresh tokens and bcrypt password hashing
- **Account Management** - Multiple account support (savings, cash, wallets) with budget tracking
- **Transaction Tracking** - Categorized expense tracking with merchant and note encryption
- **Mood Logging** - Log mood states and correlate them with spending patterns
- **Financial Recaps** - Auto-generated summaries with spending trends and personality insights
- **Smart Nudges** - Behavioral nudges to encourage better financial decisions
- **AI Integration** - AI-powered analysis and insights on spending patterns

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Security**: bcryptjs, CORS
- **Dev Tools**: nodemon, tsx, ts-node

## Project Structure

```
src/
├── config/
│   ├── db.ts           # Prisma database client configuration
│   └── env.ts          # Environment variables configuration
├── modules/
│   ├── ai/             # AI-powered insights and analysis
│   ├── auth/           # Authentication & authorization
│   ├── mood/           # Mood logging endpoints
│   ├── recap/          # Financial recap generation
│   └── transactions/   # Transaction management
├── middlewares/        # Express middleware
├── jobs/               # Background jobs
├── utils/              # Utility functions
├── app.ts              # Express app configuration
└── server.ts           # Server entry point

prisma/
└── schema.prisma       # Database schema definition
```

## Database Models

- **User** - User accounts with authentication
- **Account** - Bank accounts/wallets with balance tracking
- **Transaction** - Expense records with categorization
- **Mood** - Mood log entries
- **Recap** - Generated financial summaries
- **Nudge** - Notification messages

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn


## License

ISC

## Contact

For questions or support, please reach out to the development team.
