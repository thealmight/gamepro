// services/insertUser.js
const supabase = require('../db');

/**
 * Insert a user row.
 * @param {Object} params
 * @param {string} params.id (Supabase Auth user ID)
 * @param {string} params.username
 * @param {string} params.role
 * @param {string} [params.country]
 */
async function insertUser({ id, username, role, country }) {
  const { data, error } = await supabase
    .from('users')
    .insert([{ id, username, role, country }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = insertUser;
