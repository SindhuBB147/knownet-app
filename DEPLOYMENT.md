# Deployment Guide for KnowNet

This guide will walk you through deploying your full-stack application to the cloud for free.

**Architecture:**
- **Database**: Aiven (Free managed MySQL)
- **Backend**: Render (Python FastAPI)
- **Frontend**: Vercel (React/Vite)

---

## Prerequisites
1. **GitHub Account**: You need a GitHub account to push your code. [Sign up here](https://github.com/join).
2. **Git Installed**: Ensure Git is installed on your computer.

---

## Step 1: Push Code to GitHub
First, we need to upload your local code to GitHub.

1.  Log in to GitHub and click **New Repository**.
2.  Name it `knownet-app` and keep it Public or Private.
3.  **Do not** initialize with README, .gitignore, or license (you already have files).
4.  Click **Create repository**.
5.  Open your terminal in `c:\xampp\htdocs\exp\Mini Project` and run these commands:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
# Replace URL with your actual new repo URL
git remote add origin https://github.com/YOUR_USERNAME/knownet-app.git
git push -u origin main
```

---

## Step 2: Set up Database (Aiven)
We need a cloud MySQL database.

1.  Go to [Aiven.io](https://aiven.io/) and sign up (free trial/tier).
2.  Click **Create Service**.
3.  Select **MySQL**.
4.  Choose the **Free Plan** (usually under "Hobbyist" or "Free").
5.  Select a region (e.g., Google Cloud).
6.  Click **Create Service**.
7.  Once running, copy the **Service URI** (it looks like `mysql://user:password@host:port/defaultdb?ssl-mode=REQUIRED`).
8.  **Important**: Keep this URL safe. You will need it for the backend.

---

## Step 3: Deploy Backend (Render)
Now we host the Python API.

1.  Go to [Render.com](https://render.com/) and sign up.
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub account and select the `knownet-app` repo.
4.  **Configure the service:**
    - **Name**: `knownet-backend`
    - **Root Directory**: `backend` (Important!)
    - **Runtime**: Python 3
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `uvicorn run:app --host 0.0.0.0 --port $PORT`
5.  **Environment Variables** (Scroll down to "Advanced" or "Environment"):
    - Key: `DATABASE_URL`
    - Value: Paste your Aiven MySQL URL from Step 2.
    - **Note**: If your Aiven URL starts with `mysql://`, change it to `mysql+pymysql://` so Python understands it.
    - Key: `ALLOWED_ORIGINS`
    - Value: `*` (Or paste your Vercel URL once you have it, e.g. `https://knownet-app.vercel.app`)
6.  Click **Create Web Service**.
7.  Wait for the deployment to finish. Render will give you a URL like `https://knownet-backend.onrender.com`. **Copy this URL.**

---

## Step 4: Deploy Frontend (Vercel)
Finally, host the user interface.

1.  Go to [Vercel.com](https://vercel.com/) and sign up.
2.  Click **Add New...** -> **Project**.
3.  Import the `knownet-app` repo.
4.  **Configure Project:**
    - **Framework Preset**: Vite
    - **Root Directory**: Click "Edit" and select `frontend`.
5.  **Environment Variables**:
    - Key: `VITE_API_BASE_URL`
    - Value: `https://knownet-backend.onrender.com` (The URL from Step 3).
    - **Important**: Do not add a trailing slash `/` at the end.
6.  Click **Deploy**.

---

## Step 5: Final Check
1.  Open your new Vercel URL (e.g., `https://knownet-app.vercel.app`).
2.  Try to Sign Up. This will test the connection to the Backend and Database.
3.  If successful, your app is live!

---

### Troubleshooting
- **Database Error**: Ensure the `DATABASE_URL` in Render starts with `mysql+pymysql://`.
- **CORS Error**: If the frontend says "Network Error", check the Backend logs in Render. ensure `ALLOWED_ORIGINS` is set to `*` or your Vercel domain.
