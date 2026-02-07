# Deploy على Vercel (بدون كارت)

المشروع متجهّز كـ **Frontend (Vite)** + **API Serverless** داخل مجلد `api/`.
Vercel هيبني الموقع تلقائيًا بناءً على `vercel.json`.

## خطوات النشر
1) ارفع المشروع على GitHub.
2) على Vercel: New Project → اختار الريبو.
3) سيب الإعدادات زي ما هي (Vercel هيقرأ `vercel.json`).
4) لو عايز الشات + OCR يشتغلوا بالذكاء الاصطناعي:
   - ضيف Environment Variable: `GEMINI_API_KEY`
   - لو مش موجودة، الشات هيشتغل **Fallback** و OCR بيرجع فاضي.

## Local Dev
- شغّل الباك:
  - `cd backend && npm i && npm run dev`
- شغّل الفرونت:
  - `cd frontend && npm i && npm run dev`

لو الباك اشتغل على **3001** بدل 3000:
- Windows PowerShell:
  - `$env:VITE_API_PROXY_TARGET='http://127.0.0.1:3001'; npm run dev`
- macOS/Linux:
  - `VITE_API_PROXY_TARGET=http://127.0.0.1:3001 npm run dev`

## Endpoints
- `GET /api/search?q=...`
- `POST /api/chat`
- `POST /api/ocr`
- `POST /api/interactions/check`
- `POST /api/prescription/validate`
- `GET /api/pharmacies`
- `POST /api/orders/reserve`
