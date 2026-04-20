# Foody Backend

Production-style Node.js backend using MVC architecture.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Zod validation

## Project Structure

backend/
|- src/
| |- app.js
| |- server.js
| |- config/
| | |- db.js
| | |- env.js
| |- routes/
| | |- user.routes.js
| |- controllers/
| | |- user.controller.js
| |- services/
| | |- user.service.js
| |- models/
| | |- user.model.js
| | |- branch.model.js
| | |- surplus-meal.model.js
| | |- donation.model.js
| | |- customer-order.model.js
| | |- audit-log.model.js
| |- middlewares/
| | |- auth.middleware.js
| | |- error.middleware.js
| |- utils/
| | |- apiResponse.js
| |- validators/
| | |- user.validator.js
| |- scripts/
| |- seedUsers.js
|- index.js
|- .env
|- package.json

## Setup

1. Install MongoDB locally or use MongoDB Atlas.
2. Copy .env.example to .env and update values if needed.

cp .env.example .env

3. If using local MongoDB, start mongod and make sure it listens on port 27017.
4. Install dependencies.

npm install

5. Run development server.

npm run dev

If MONGO_URI is missing in development, backend now falls back to:

mongodb://127.0.0.1:27017/foody

This helps avoid common localhost/IPv6 issues on Windows.

## Health Check

GET http://localhost:5000/health

## API Base

http://localhost:5000/api/v1

## SaaS Tenancy Rules

- Each manager owns only their branches.
- Staff users are owned by one manager and assigned to one branch.
- Staff can only create/update meals and donations in their assigned branch.
- Public meal listing remains global and available without authentication.
- Inactive accounts are blocked from login and API access.

## List Query Options

List endpoints support:

- page (default 1)
- limit (default 10, max 100)
- sortBy (e.g. createdAt, status)
- sortDirection (asc or desc)

Domain filters:

- /meals: branchId, status, category
- /donations: status
- /orders: status, paymentStatus

## Endpoints

- POST /users/register
- POST /users/login
- GET /users/me (Bearer token required)
- GET /users (Bearer token required, manager only)
- GET /users/charities (manager/staff)
- POST /users/staff (manager only, requires branchId owned by manager)
- POST /branches (manager)
- GET /branches (authenticated users; manager sees own branches, staff sees assigned branch, customer/charity see active branches)
- PATCH /branches/:branchId (manager)
- POST /meals (manager/staff)
- GET /meals (public endpoint; returns available public meals for non-manager/staff roles)
- PATCH /meals/:mealId (manager/staff)
- PATCH /meals/:mealId/status (manager/staff)
- POST /donations (manager/staff)
- GET /donations (manager/staff/charity)
- PATCH /donations/:donationId/status (manager/staff/charity)
- POST /orders (customer)
- GET /orders (customer/manager)
- PATCH /orders/:orderId/status (customer/manager)
- GET /audit-logs (manager/staff)

## Seed Demo Users

npm run seed

Default demo credentials (password: Password1):

- manager@foody.com
- staff@foody.com
- customer@foody.com
- charity@foody.org

## Seed Domain Data

After users are seeded, populate branches, meals, donations, and orders:

npm run seed:domain

Or run all seed steps:

npm run seed:all

To wipe old data and reseed fresh SaaS demo data:

npm run seed:fresh

## Connect Frontend to Backend

Use the API URL in your frontend environment:

NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
