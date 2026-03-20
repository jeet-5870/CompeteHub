<div align="center">

<br/>

```
  ██████╗ ██████╗ ███╗   ███╗██████╗ ███████╗████████╗███████╗██╗  ██╗██╗   ██╗██████╗ 
 ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██╔════╝╚══██╔══╝██╔════╝██║  ██║██║   ██║██╔══██╗
 ██║     ██║   ██║██╔████╔██║██████╔╝█████╗     ██║   █████╗  ███████║██║   ██║██████╔╝
 ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██╔══╝     ██║   ██╔══╝  ██╔══██║██║   ██║██╔══██╗
 ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ███████╗   ██║   ███████╗██║  ██║╚██████╔╝██████╔╝
  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝
```

### Your Unified Competitive Programming Dashboard

*Track ratings · Browse contests · Visualize your activity*

<br/>

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_4-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=06B6D4)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase_12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)

<br/>

</div>

---

## 🌟 What is CompeteHub?

CompeteHub is a single-page dashboard built for competitive programmers. It consolidates your stats from **Codeforces**, **LeetCode**, **AtCoder**, and **CodeChef** into one sleek interface — no more switching between tabs during contest prep.

---

## ✨ Feature Overview

<table>
<tr>
<td width="50%">

### 🔐 Authentication
- Email/password with regex validation  
- Google OAuth (redirect flow)  
- GitHub OAuth (redirect flow)  
- Firebase Auth with persistent sessions  
- Friendly, mapped error messages  

</td>
<td width="50%">

### 📅 Contest Schedule
- Live contest banner with countdown timers  
- Upcoming contests sorted chronologically  
- Multi-source aggregation (CF + LC + AtCoder + CodeChef)  
- Platform filter bar with brand colors  
- Offline fallback mode when APIs are unreachable  

</td>
</tr>
<tr>
<td width="50%">

### 🏅 Platform Hub
- Overview cards for 5 major OJ platforms  
- Real-time Codeforces rating + rank  
- LeetCode problems solved + global ranking  
- Cached fetches (1-hour TTL) via Firestore  

</td>
<td width="50%">

### 👤 Profile & Heatmap
- GitHub-style 365-day contribution heatmap  
- Real data fetched from GitHub Contributions API  
- Direct → CORS proxy fallback strategy  
- Configurable handles (CF, LC, GitHub)  
- Settings persisted to Cloud Firestore  

</td>
</tr>
</table>

---

## 🗂️ Project Structure

```
competehub/
├── public/
├── src/
│   ├── components/
│   │   ├── ContributionHeatmap.jsx   # 365-day GitHub activity grid
│   │   ├── Navbar.jsx                # Top nav + mobile dropdown menu
│   │   └── ProtectedRoute.jsx        # Auth guard wrapper
│   ├── context/
│   │   └── AuthContext.jsx           # Firebase auth state provider
│   ├── pages/
│   │   ├── Login.jsx                 # Sign-in (email + Google + GitHub)
│   │   ├── Signup.jsx                # Sign-up (email + Google + GitHub)
│   │   ├── Platforms.jsx             # Platform overview cards
│   │   ├── Schedule.jsx              # Contest calendar + filter bar
│   │   └── Profile.jsx               # Stats, heatmap & settings
│   ├── services/
│   │   └── apiService.js             # Unified API layer (all platforms + heatmap)
│   ├── utils/
│   │   └── dateUtils.js              # IST/UTC date formatting
│   └── firebase.js                   # Firebase init, auth & Firestore helpers
├── .env                              # 🔒 Secret keys (never committed)
├── .gitignore
├── index.html
├── vite.config.js
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- A [Firebase project](https://console.firebase.google.com) with **Authentication** + **Firestore** enabled  
  → Enable providers: *Email/Password*, *Google*, *GitHub*
- A [Clist.by](https://clist.by) account for multi-platform contest aggregation

### 1 — Clone & Install

```bash
git clone https://github.com/your-username/competehub.git
cd competehub
npm install
```

### 2 — Set Up Environment Variables

Create a `.env` file in the project root:

```env
# Firebase (from Project Settings → Your Apps → SDK setup)
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:...

# Clist.by API (from clist.by/api → API key)
VITE_CLIST_USERNAME=your_clist_username
VITE_CLIST_API_KEY=your_clist_api_key
```


### 3 — Run

```bash
npm run dev
# → http://localhost:5173
```

---

## 🔧 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server with HMR |
| `npm run build` | Build production bundle → `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

## 🌐 Data Sources & API Strategy

| Platform | API Endpoint | Auth | CORS Strategy |
|---|---|---|---|
| **Codeforces** | `codeforces.com/api` | None (public) | Direct |
| **LeetCode** | `leetcode-stats-api.herokuapp.com` | None | `corsproxy.io` (multi-proxy fallback) |
| **AtCoder** | `kenkoooo.com/atcoder` | None | `corsproxy.io` |
| **CodeChef + all** | `clist.by/api/v1` | API key | Direct → `corsproxy.io` fallback |
| **GitHub Heatmap** | `github-contributions.vercel.app` | None | Direct → `corsproxy.io` fallback |

All fetches use a **30-second `AbortController` timeout** and gracefully fall back to cached or mock data so the UI is never broken.

---

## 🔒 Auth Architecture

```
User clicks "Sign in with Google"
        ↓
signInWithRedirect(auth, googleProvider)
        ↓
  [Browser navigates to Google]
        ↓
  [Returns to app]
        ↓
useEffect → getRedirectResult(auth) → navigate('/platforms')
```

Popups are intentionally **never used** to avoid `auth/popup-blocked` errors across all browsers and mobile devices.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 + CSS Custom Properties |
| Icons | Lucide React |
| Routing | React Router DOM 7 |
| Auth | Firebase Authentication 12 |
| Database | Cloud Firestore |
| Lint | ESLint 9 |

---

## 📄 License

MIT © 2026 CompeteHub