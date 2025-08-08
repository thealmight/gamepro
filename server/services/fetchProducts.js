// services/fetchProducts.js
const supabase = require('../db');

async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

module.exports = fetchProducts;
