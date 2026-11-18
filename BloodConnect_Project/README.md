# BloodConnect

BloodConnect is a Node.js and MongoDB blood-donor network. It supports persistent accounts, donor profiles, blood requests, owner-only updates, and SMTP email alerts to available donors with compatible blood types in the same city.

## Run locally

1. Install Node.js 20 or newer and have MongoDB running locally, or use a MongoDB Atlas database.
2. In `backend`, copy `.env.example` to `.env` and set `MONGO_URI`. Keep `.env` private; it is ignored by Git.
3. Configure the SMTP values in `.env` if you want to test email delivery. Use an email provider's SMTP credentials, not your personal email password.
4. Install and start the server:

   ```powershell
   cd backend
   npm install
   npm start
   ```

5. Open `http://localhost:5000`. Create an account to view donors and requests, register a donor profile, or post a request.

Passwords are stored as salted scrypt hashes. Login sessions are stored in MongoDB and sent to the browser in an HttpOnly cookie. Donor email addresses are not included in directory responses. Users can update only their own donor profile or blood requests.

## Deploy for public use

Deploy the `backend` Node.js application to a host that supports a persistent web process (for example Render or Railway), and use MongoDB Atlas for the shared database. Set these environment variables in the hosting dashboard—do not commit credentials:

- `NODE_ENV=production`
- `MONGO_URI` — the Atlas connection string; allow the application host to connect in the Atlas network settings.
- `MONGO_DNS_SERVERS` — optional comma-separated DNS servers if the host's default resolver refuses Atlas SRV queries.
- `PORT` — supplied automatically by most application hosts.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — credentials for an SMTP email provider. The server verifies SMTP connectivity before it starts.

The Express server serves both the frontend and API from one origin. Configure a custom domain and HTTPS at the hosting provider. Production startup intentionally fails if the hosted database or SMTP settings are missing or unavailable.

If startup reports that it could not connect to the Atlas cluster, add the app host's outbound IP under Atlas **Network Access** and confirm the database user and connection string are valid. Avoid opening database access to every IP address for a public deployment.

The `/api/health` endpoint reports whether MongoDB is connected and whether SMTP is configured. A blood request is saved even if alert delivery fails; the API and website report that email failure separately so it is not shown as a delivered email. Alerts go only to available donors in the request's city whose blood group can donate to the requested blood group.

## Important

This project does not create hosting, database, or email-provider accounts for you. Add your own provider credentials to local `.env` or the hosting dashboard before expecting the site to be reachable by other people or to send real email. Browser push notifications require separate browser permission and are not a replacement for email.
