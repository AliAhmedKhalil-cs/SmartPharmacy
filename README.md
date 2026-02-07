# Smart Pharmacy System

## Quick start (local)

### Backend
```bash
cd backend
npm i
cp .env.example .env 2>/dev/null || true
npm run dev
```

Backend: `http://localhost:3000/api`

### Frontend
```bash
cd frontend
npm i
cp .env.example .env 2>/dev/null || true
npm run dev
```

Frontend يعتمد على:
- `VITE_API_BASE_URL` (مفضل)
- fallback: `VITE_API_BASE`

## Rebuild v2
- Allergy profile (chips) + warning badges
- Interaction analyzer (cart + drawer) متصل بجد بالباك
- Backend hardening: request-id, structured logs, unified errors
- Endpoints جديدة: health, allergy, interactions, inventory forecast

## API
- `GET /api/health`
- `GET /api/search?q=...`
- `POST /api/ocr` (multipart field: `image`)
- `POST /api/chat` `{ message }`
- `POST /api/allergy/check` `{ active_ingredient, allergens: string[] }`
- `POST /api/interactions/check` `{ items: [{ trade_name, active_ingredient }] }`
- `GET /api/inventory/forecast?trade_name=...&days=30`
