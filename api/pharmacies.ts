import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCors, sendError, sendOk } from './_util'

export const config = {
  runtime: 'nodejs'
}

const pharmacies = [
  { 
    id: 1, 
    name: 'صيدلية العزبي - El Ezaby', 
    address: '15 شارع قصر النيل، القاهرة', 
    phone: '19011', 
    gps_lat: 30.0444, 
    gps_lng: 31.2357, 
    logo_url: null,
    rating: 4.5
  },
  { 
    id: 2, 
    name: 'صيدليات سيف - Seif Pharmacies', 
    address: '22 شارع جامعة الدول، الجيزة', 
    phone: '19199', 
    gps_lat: 30.0511, 
    gps_lng: 31.2001, 
    logo_url: null,
    rating: 4.3
  },
  { 
    id: 3, 
    name: 'صيدلية 19011 - صيدلية العزبي فرع المعادي', 
    address: 'شارع 9، المعادي، القاهرة', 
    phone: '19011', 
    gps_lat: 29.9602, 
    gps_lng: 31.2781, 
    logo_url: null,
    rating: 4.6
  },
  { 
    id: 4, 
    name: 'صيدلية الدواء', 
    address: 'شارع الهرم، الجيزة', 
    phone: '0233851234', 
    gps_lat: 30.0131, 
    gps_lng: 31.2089, 
    logo_url: null,
    rating: 4.2
  },
  { 
    id: 5, 
    name: 'صيدلية رشدي', 
    address: 'ميدان رمسيس، القاهرة', 
    phone: '0225748901', 
    gps_lat: 30.0626, 
    gps_lng: 31.2497, 
    logo_url: null,
    rating: 4.4
  },
  { 
    id: 6, 
    name: 'صيدلية الشفاء', 
    address: 'مدينة نصر، القاهرة', 
    phone: '0222743567', 
    gps_lat: 30.0715, 
    gps_lng: 31.3406, 
    logo_url: null,
    rating: 4.1
  },
  { 
    id: 7, 
    name: 'Smart Pharmacy Partner', 
    address: 'بجوارك تماماً', 
    phone: '0100000000', 
    gps_lat: 30.045, 
    gps_lng: 31.236, 
    logo_url: null,
    rating: 5.0
  }
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return
  
  if (req.method !== 'GET') {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET allowed')
  }
  
  return sendOk(res, { pharmacies })
}
