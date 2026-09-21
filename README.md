# Push Notification Socket Service

A Socket.IO based realtime service for chat/call presence and cross-platform push notification delivery (FCM for Android, APNs for iOS), with encrypted token storage.

> **Note:** This is a portfolio/demo copy of a production project. Company-identifying
> details, credentials, and secrets have been removed or replaced with placeholders.
> It is shared to demonstrate code structure and engineering approach, not as a
> ready-to-deploy service.

## Tech Stack

- Node.js + TypeScript
- Express.js
- MongoDB (Mongoose)
- Swagger (OpenAPI) docs
- Firebase Cloud Messaging & Apple Push Notification service (push notifications)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the example environment file and fill in your own values:
   ```bash
   cp .env.example .env
   ```
3. Run in development:
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm start
   ```

## Environment Variables

See `.env.example` for the full list of required environment variables. None of the
values shipped in this repo are real credentials — you must supply your own.

## Project Structure

```
src/
  config.ts        # environment-driven app configuration
  controller/       # request handlers
  models/           # data models
  routes/           # API route definitions
  helper/           # utility & integration helpers (push notifications, etc.)
  utils/            # swagger docs and misc utilities
```

## License

This code is shared for portfolio/demonstration purposes.
