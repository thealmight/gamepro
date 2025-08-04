import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthUser } = useGame();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update the context state
      setAuthUser(data.user);

      // Navigate based on role
      if (data.user.role === 'operator') {
        navigate('/operator');
      } else {
        navigate('/player');
      }

    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userType) => {
    if (userType === 'operator') {
      setUsername('pavan');
    } else {
      // For demo, allow any username for players
      const playerNames = ['player1', 'player2', 'player3', 'player4', 'player5'];
      const randomPlayer = playerNames[Math.floor(Math.random() * playerNames.length)];
      setUsername(randomPlayer);
    }
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black bg-opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            Econ Empire
          </h1>
          <p className="text-xl text-blue-200 mb-2">
            Strategic Economic Simulation
          </p>
          <p className="text-sm text-blue-300">
            Master production, demand, and tariffs in real-time multiplayer gameplay
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white border-opacity-20">
          <h2 className="text-2xl font-bold mb-6 text-center text-white">
            Enter the Empire
          </h2>

          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Password (Optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter password (optional)"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Logging in...
                </div>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Quick Login Options */}
          <div className="mt-6 pt-6 border-t border-white border-opacity-20">
            <p className="text-sm text-blue-200 text-center mb-4">Quick Login Options:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickLogin('operator')}
                disabled={loading}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-2 px-4 rounded-lg hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all duration-200 disabled:opacity-50"
              >
                Operator (Pavan)
              </button>
              <button
                onClick={() => handleQuickLogin('player')}
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium py-2 px-4 rounded-lg hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 disabled:opacity-50"
              >
                Random Player
              </button>
            </div>
          </div>

          {/* Game Info */}
          <div className="mt-6 pt-6 border-t border-white border-opacity-20">
            <div className="text-xs text-blue-300 space-y-1">
              <p>• 5 Countries: USA, China, Germany, Japan, India</p>
              <p>• 5 Products: Steel, Grain, Oil, Electronics, Textiles</p>
              <p>• Real-time multiplayer with tariff negotiations</p>
              <p>• Round-based gameplay with live chat</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-blue-300">
            Need all 5 players online to start the game
          </p>
        </div>
      </div>
    </div>
  );
}
