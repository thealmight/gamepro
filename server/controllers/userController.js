// server/controllers/userController.js
const User = require('../models/User');

const countryPool = ['USA', 'Germany', 'India', 'China', 'Brazil'];
let assignedCountries = [];

const assignCountry = () => {
  const available = countryPool.filter(c => !assignedCountries.includes(c));
  if (available.length === 0) return null; // all assigned
  const country = available[Math.floor(Math.random() * available.length)];
  assignedCountries.push(country);
  return country;
};

exports.loginUser = async (req, res) => {
  try {
    const { username } = req.body;
    const role = username === 'pavan' ? 'operator' : 'player';
    const country = role === 'player' ? assignCountry() : null;

    let user = await User.findOne({ where: { username } });

    if (!user) {
      user = await User.create({ username, role, country });
      console.log('✅ User created:', user.username);
    }

    res.status(200).json(user); // ✅ Always send response
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll(); // ✅ Fix here
    res.json(users);
  } catch (err) {
    console.error('❌ Fetch users error:', err.message);
    res.status(500).json({ error: 'Could not fetch users' });
  }
};


