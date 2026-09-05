# Note-Taking App — Poora Step-by-Step Guide (Shuru se)

Ye guide maan ke chal raha hai ki tujhe kuch nahi pata. Har step ko order me follow karna, skip mat karna.

---

## PHASE 0: Apne Computer ko Ready Karna (ek baar ka kaam)

### Step 1: Node.js install karo
Node.js wo software hai jo tere computer ko JavaScript/TypeScript code chalana sikhata hai.

1. Jaa **https://nodejs.org**
2. "LTS" wala version download kar (jo bada button dikhega)
3. Install kar (Next → Next → Finish, jaisa normal software install hota hai)
4. Check karne ke liye: Computer pe "Terminal" (Mac) ya "Command Prompt/PowerShell" (Windows) khol
5. Type kar aur Enter daba:
   ```
   node -v
   ```
6. Agar kuch aisa dikhe `v20.x.x` ya `v22.x.x` — matlab ho gaya ✅

### Step 2: VS Code install karo (code likhne/dekhne ke liye editor)
1. Jaa **https://code.visualstudio.com**
2. Download kar apne OS ke hisaab se (Windows/Mac)
3. Install kar

### Step 3: Git install karo (version control ke liye)
1. Jaa **https://git-scm.com/downloads**
2. Apne OS ke hisaab se download-install kar
3. Terminal me check kar:
   ```
   git --version
   ```

### Step 4: GitHub account banao (agar nahi hai)
1. Jaa **https://github.com**
2. "Sign up" kar, free hai
3. Ye tera code online store karne ke liye hai — evaluator yahi se tera code dekhega

### Step 5: Vercel account banao (app ko live/deploy karne ke liye)
1. Jaa **https://vercel.com**
2. "Sign up with GitHub" pe click kar (seedha GitHub se login ho jayega)
3. Bas account bana ke chhod de, baad me use karenge

### Step 6: Neon account banao (free PostgreSQL database ke liye)
1. Jaa **https://neon.tech**
2. "Sign up" kar (GitHub se bhi kar sakta hai)
3. "Create a project" pe click kar → naam de: `note-app`
4. Project banne ke baad ek **Connection String** milegi jaisi dikhegi:
   ```
   postgresql://neondb_owner:AbCd1234@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Ye pura string kahin safe jagah copy karke rakh le (Notepad me) — isko kisi ke saath share mat karna, ye tera database password hai

**✅ Phase 0 complete hone ke baad, aage badh.**

---

## PHASE 1: Project Code Lena

Main tujhe project ka code ek **zip file** ke roop me dunga (ya jab pura ban jayega, tab dunga — abhi hum saath me bana rahe hain).

1. Zip file download kar apne computer pe (Downloads folder me jayegi)
2. Usse ek folder me extract/unzip kar — jaise Desktop pe `note-app` naam ka folder bana ke
3. VS Code khol → File → Open Folder → `note-app` folder select kar

---

## PHASE 2: Project Setup (VS Code ke andar Terminal use karke)

VS Code ke andar upar menu me **Terminal → New Terminal** kholo. Neeche jo bhi commands di hain, wahi terminal me type karke Enter dabao.

### Step 7: Dependencies install karo
```bash
npm install --legacy-peer-deps
```
(Ye sab zaroori packages download karega — thoda time lagega, wait karo)

### Step 8: `.env` file banao
1. Project folder me ek file `.env.example` milegi — usko copy karke naam do `.env`
2. `.env` file kholo aur usme apni Neon connection string daalo:
   ```
   DATABASE_URL="yahan apni neon wali string paste kar"
   JWT_SECRET="koi bhi random lamba text daal de, jaise: xk29fj29fjs92jfaklsdjf92"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```
3. Save kar (Ctrl+S / Cmd+S)

**⚠️ Zaroori:** `.env` file kabhi bhi GitHub pe upload nahi hoti (already ignore kiya hua hai) — isme password/secrets hote hain.

### Step 9: Database me tables banao
```bash
npx prisma generate
npx prisma db push
```
Ye command tera schema (User, Note, ShareLink tables) tere Neon database me bana degi.

### Step 10: App ko chalu karo
```bash
npm run dev
```
Terminal me likha aayega: `Local: http://localhost:3000`

Browser me jaa aur ye URL khol — tera app chal raha hoga! 🎉

---

## PHASE 3: App ko Test Karna (Local pe)

Ye sab check karna (jab hum pura code de denge):
- [ ] `/register` pe naya account banao
- [ ] `/login` se login karo
- [ ] `/notes/new` pe ek note banao (title, content, expiry, share type, access type select karke)
- [ ] Share link generate hoti hai dekho
- [ ] Us link ko naye tab/incognito me khol (bina login ke) — public/password flow test karo
- [ ] Galat password daal ke dekho (fail hona chahiye)
- [ ] Same one-time link 2 baar khol ke dekho (dusri baar "expired" bolna chahiye)
- [ ] `/notes/[id]` pe jaa ke link "Revoke" karo, phir link khol ke dekho (band ho jana chahiye)
- [ ] View count badh raha hai ya nahi check karo

---

## PHASE 4: GitHub pe Upload Karna

Terminal me (project folder ke andar):
```bash
git config user.name "Tera Naam"
git config user.email "teraemail@example.com"
git add -A
git commit -m "final: complete note sharing app"
```

Ab GitHub pe naya empty repository banao:
1. github.com pe jaa → "New repository" → naam do `note-taking-app` → Create (README add mat karna, empty rakhna)
2. GitHub tumhe kuch commands dikhayega jaisa "…or push an existing repository from the command line" — wahi copy karke apne terminal me chalao. Kuch aisa dikhega:
   ```bash
   git remote add origin https://github.com/tera-username/note-taking-app.git
   git branch -M main
   git push -u origin main
   ```

---

## PHASE 5: Vercel pe Deploy (Live URL banane ke liye)

1. **vercel.com** pe jaa → "Add New Project"
2. Apni GitHub repo `note-taking-app` select kar → "Import"
3. "Environment Variables" section me apni `.env` wali 3 values daal (DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL — is baar `NEXT_PUBLIC_APP_URL` me tera vercel wala URL daalna, jaise `https://note-taking-app.vercel.app`)
4. "Deploy" pe click kar
5. 2-3 minute me tera app live ho jayega ek URL ke saath — yahi tera "Live demo URL" hai submission ke liye

---

## PHASE 6: Demo Video Banana

Screen record karo (Windows: Win+G / Mac: Cmd+Shift+5 / ya Loom.com use kar lo — free hai) aur ye sab dikhao:
1. Note create karna
2. Share link generate hona
3. Public link open karna
4. Password-protected link open karna + generated password dikhana
5. Galat password daalna (fail case)
6. One-time link doosri baar expire dikhana
7. Time-based link expire hote dikhana
8. Revoke karke link band karna
9. View count badhte dikhana

Video ko YouTube (Unlisted) ya Loom pe upload kar, link mil jayega.

---

## PHASE 7: Submission Email Bhejna

**To:** jackson@peacockindia.in
**CC:** admin@peacockindia.in, harish@peacockindia.in, shreeram@peacockindia.in
**Subject:** MERN/PERN Stack Developer POC Submission – [Tera Naam]

**Body me daalo:**
- Live demo URL (Vercel wala)
- GitHub repo link
- Demo video link
- Test credentials (jo test account tune banaya, uska email/password)

---

## Abhi Kaha Hai Hum?

✅ Phase 0 (tools install) — tu kar sakta hai independently
🔨 Phase 1-2 ka code — **main saath me bana raha hu**, jaise ban jayega tujhe zip milega
⏳ Phase 3-7 — baad me karenge jab code ready ho

**Abhi tera kaam:** Phase 0 ke saare accounts/installs kar le (Node, VS Code, Git, GitHub, Vercel, Neon). Jab ho jaye, mujhe bata "Phase 0 done" — phir main aage ka code banana continue karunga.
