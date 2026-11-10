# Auth0 Login Flow

Minimal Auth0 login app for the MLH Global Hack Week: Builders Week challenge **Set up your first Auth0 log-in flow**.

It follows the official [Auth0 React SPA quickstart](https://auth0.com/docs/quickstart/spa/react): a Vite + React app wrapped in `Auth0Provider`, with `LoginButton`, `LogoutButton`, and a `Profile` component that shows the signed-in user's name, email, and picture.

## Setup

1. In the [Auth0 Dashboard](https://manage.auth0.com/), go to **Applications > Applications > Create Application**.
2. Name the app (for example, `mlh-ghw-auth0-login-flow`), choose **Single Page Web Applications**, and click **Create**.
3. Open the **Settings** tab and copy the **Domain** and **Client ID**.
4. On that same Settings tab, set these URLs, then save:

   - Allowed Callback URLs: `http://localhost:5173`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`

5. In this folder, copy the example env file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_AUTH0_DOMAIN=YOUR_AUTH0_APP_DOMAIN
   VITE_AUTH0_CLIENT_ID=YOUR_AUTH0_APP_CLIENT_ID
   ```

6. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

7. Open [http://localhost:5173](http://localhost:5173), click **Log in**, and complete the Auth0 sign-in. After you return, the profile should show your name, email, and picture. **Log out** sends you back to this app.

If port 5173 is already in use, run `npm run dev -- --port 5174` and update the Auth0 callback, logout, and web origin URLs to `http://localhost:5174`.

Do not commit `.env`. Only `.env.example` belongs in the repo.

## Build

```bash
npm install
npm run build
```
