// api/pharmacies.js
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const pharmacies = [
    { 
      id: 1, 
      name: 'صيدلية العزبي - El Ezaby', 
      address: '15 شارع قصر النيل، القاهرة', 
      phone: '19011', 
      gps_lat: 30.0444, 
      gps_lng: 31.2357, 
      rating: 4.5
    },
    { 
      id: 2, 
      name: 'صيدليات سيف - Seif Pharmacies', 
      address: '22 شارع جامعة الدول، الجيزة', 
      phone: '19199', 
      gps_lat: 30.0511, 
      gps_lng: 31.2001, 
      rating: 4.3
    },
    { 
      id: 3, 
      name: 'صيدلية 19011 - فرع المعادي', 
      address: 'شارع 9، المعادي، القاهرة', 
      phone: '19011', 
      gps_lat: 29.9602, 
      gps_lng: 31.2781, 
      rating: 4.6
    },
    { 
      id: 4, 
      name: 'صيدلية الدواء', 
      address: 'شارع الهرم، الجيزة', 
      phone: '0233851234', 
      gps_lat: 30.0131, 
      gps_lng: 31.2089, 
      rating: 4.2
    },
    { 
      id: 5, 
      name: 'Smart Pharmacy Partner', 
      address: 'بجوارك تماماً', 
      phone: '0100000000', 
      gps_lat: 30.045, 
      gps_lng: 31.236, 
      rating: 5.0
    }
  ]

  res.status(200).json({ pharmacies })
}
