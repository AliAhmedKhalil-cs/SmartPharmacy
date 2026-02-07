import { sendError, sendOk } from './_util'

const pharmacies = [
  { id: 1, name: 'صيدلية العزبي - El Ezaby', address: '15 شارع قصر النيل، القاهرة', phone: '19011', gps_lat: 30.0444, gps_lng: 31.2357, logo_url: null },
  { id: 2, name: 'صيدليات سيف - Seif Pharmacies', address: '22 شارع جامعة الدول، الجيزة', phone: '19199', gps_lat: 30.0511, gps_lng: 31.2001, logo_url: null },
  { id: 3, name: 'Smart Pharmacy Partner', address: 'بجوارك تماماً', phone: '0100000000', gps_lat: 30.045, gps_lng: 31.236, logo_url: null }
]

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  return sendOk(res, { pharmacies })
}
