// api/search.js
module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' })
    }

    // Mock data for testing - replace with real database query
    const mockDrugs = [
      { drug_id: '1', trade_name: 'Panadol', active_ingredient: 'Paracetamol', avg_price: 15, form: 'Tablet' },
      { drug_id: '2', trade_name: 'Panadol Extra', active_ingredient: 'Paracetamol + Caffeine', avg_price: 20, form: 'Tablet' },
      { drug_id: '3', trade_name: 'Panadol Advance', active_ingredient: 'Paracetamol', avg_price: 25, form: 'Tablet' },
      { drug_id: '4', trade_name: 'Pandol Cold & Flu', active_ingredient: 'Paracetamol + Pseudoephedrine', avg_price: 30, form: 'Capsule' },
      { drug_id: '5', trade_name: 'Brufen', active_ingredient: 'Ibuprofen', avg_price: 18, form: 'Tablet' },
      { drug_id: '6', trade_name: 'Aspirin', active_ingredient: 'Acetylsalicylic Acid', avg_price: 10, form: 'Tablet' },
      { drug_id: '7', trade_name: 'Augmentin', active_ingredient: 'Amoxicillin + Clavulanic Acid', avg_price: 50, form: 'Tablet' },
      { drug_id: '8', trade_name: 'Cataflam', active_ingredient: 'Diclofenac', avg_price: 22, form: 'Tablet' },
      { drug_id: '9', trade_name: 'Voltaren', active_ingredient: 'Diclofenac', avg_price: 25, form: 'Gel' },
      { drug_id: '10', trade_name: 'Congestal', active_ingredient: 'Paracetamol + Chlorpheniramine', avg_price: 12, form: 'Tablet' }
    ]

    // Filter based on query
    const results = mockDrugs.filter(drug => 
      drug.trade_name.toLowerCase().includes(q) || 
      drug.active_ingredient.toLowerCase().includes(q)
    )

    console.log(`[API] Search query: "${q}", Found: ${results.length} results`)

    return res.status(200).json(results)
  } catch (error) {
    console.error('[API] Search error:', error)
    return res.status(500).json({ error: error.message || 'Search failed' })
  }
}
