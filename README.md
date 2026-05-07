# Paste-to-Invoice

Turn messy work notes into clean invoices. Powered by Claude.

## Project structure

```
paste-to-invoice/
├── index.html        ← Frontend (deploy to GitHub Pages)
├── vercel.json       ← Vercel config
├── api/
│   └── invoice.js    ← Serverless backend (deploy to Vercel)
└── README.md
```

---

## Deploy the backend (Vercel) — do this first

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. In **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from [console.anthropic.com](https://console.anthropic.com)
4. Click Deploy
5. Copy your deployment URL — it will look like `https://paste-to-invoice.vercel.app`

---

## Connect the frontend

1. Open `index.html`
2. Find this line near the top of the `<script>`:
   ```js
   const BACKEND_URL = 'https://your-project.vercel.app/api/invoice';
   ```
3. Replace it with your actual Vercel URL:
   ```js
   const BACKEND_URL = 'https://paste-to-invoice.vercel.app/api/invoice';
   ```
4. Commit and push

---

## Deploy the frontend (GitHub Pages)

1. Go to your repo on GitHub → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `(root)`
4. Save — your site will be live at `https://yourusername.github.io/paste-to-invoice`

---

## Lock down CORS (optional but recommended)

In `api/invoice.js`, change:
```js
res.setHeader('Access-Control-Allow-Origin', '*');
```
to your GitHub Pages URL:
```js
res.setHeader('Access-Control-Allow-Origin', 'https://yourusername.github.io');
```

This prevents other sites from using your backend.
