# Transaction Ledger API

## Overview

A RESTful transaction ledger API built using Node.js, Express.js, and MySQL.

The application supports account creation, credit and debit transactions, balance retrieval, and paginated transaction history.

## Technologies

- Node.js
- Express.js
- MySQL
- mysql2
- dotenv

## Prerequisites

- Node.js and npm
- MySQL or XAMPP
- Postman (for API testing)

## Setup Instructions

1. Clone or download this repository.
2. Install dependencies:

   `npm install`

3. Create the database and tables by running `sql/schema.sql` in MySQL or phpMyAdmin.
4. Create a `.env` file using `.env.example` as a template.
5. Configure your local MySQL credentials.
6. Start the server:

   `npm run dev`

The API runs at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/accounts` | Create an account |
| POST | `/api/accounts/:id/transactions` | Create a credit or debit |
| GET | `/api/accounts/:id/balance` | Retrieve account balance |
| GET | `/api/accounts/:id/transactions` | Retrieve transaction history |

## Transaction History

Supported query parameters:

- `type=credit` or `type=debit`
- `page=1`
- `limit=10`

Transactions are returned in descending creation-time order.

## Data Integrity

- Account balances are initialized to zero by the server.
- Transaction amounts must be positive.
- Debit operations reject insufficient funds.
- Duplicate references are prevented per account.
- Balance updates and transaction inserts use database transactions.
- Account row locking protects concurrent balance updates.
- No API endpoints are provided to edit or delete transactions.

## Error Handling

The API returns appropriate HTTP status codes for invalid input, missing accounts, duplicate transactions, insufficient balances, and unexpected server errors.

## Testing

Use Postman to test account creation, credits, debits, balance retrieval, history filtering, pagination, duplicate references, and insufficient funds.

## Author

Full Stack Developer Assessment Submission