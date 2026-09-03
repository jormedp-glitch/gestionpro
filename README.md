This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create your environment file from the template:

   ```bash
   cp .env.example .env.local
   ```

   Then fill in the Supabase credentials in `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Login

Access is protected: routes redirect to `/login?next=...` when there is no session.

To enable login on your Supabase project:

1. In the Supabase dashboard, enable the **Email** provider under
   Authentication → Providers (email + password sign-in).
2. Create the first user under Authentication → Users (Add user).
3. Add the app origin to Authentication → URL Configuration (e.g.
   `http://localhost:3000` for local development).

Then log in with that email and password at `/login`. After a successful login you
land back on the page you tried to open (`next`); logout is wired through the auth
actions and destroys the session.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
