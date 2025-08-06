import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import config from '../config';

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  // Game state
  const [gameId, setGameId] = useState(null);
  const [rounds, setRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRoundsFinalized, setRoundsFinalized] = useState(false);
  const [isGameEnded, setGameEnded] = useState(false);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, active, paused, ended
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds

  // User state
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Game data
  const [countries] = useState(['USA', 'China', 'Germany', 'Japan', 'India']);
  const [products] = useState(['Steel', 'Grain', 'Oil', 'Electronics', 'Textiles']);
  const [production, setProduction] = useState([]);
  const [demand, setDemand] = useState([]);
  const [tariffRates, setTariffRates] = useState([]);
  const [tariffHistory, setTariffHistory] = useState([]);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);

    // API helper function
    const apiCall = useCallback(async (endpoint, options = {}) => {
      const token = localStorage.getItem('token');
      const defaultOptions = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      };

      const response = await fetch(`${config.API_BASE_URL}/api${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
      }

      return response.json();
    }, []);





// Socket connection
const [socket, setSocket] = useState(null);
const [isConnected, setIsConnected] = useState(false);

// Initialize user from localStorage and socket connection
useEffect(() => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  const savedGameId = localStorage.getItem('gameId');
  const savedCurrentRound = localStorage.getItem('currentRound');

  let newSocket; // ✅ Declare in outer scope

  if (token && userData) {
    try {
      const user = JSON.parse(userData);
      setAuthUser(user);

      if (savedGameId) {
        setGameId(savedGameId);
        loadGameData(); // ✅ Load game data
      }

      newSocket = io(process.env.REACT_APP_SOCKET_URL, {
        auth: { token },
        withCredentials: true,
        autoConnect: true,
        transports: ['websocket'],
      });

      // ✅ All socket event listeners
      newSocket.on('connect', () => {
        console.log('✅ Connected to server:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('⚠️ Disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (err) => {
        console.error('❌ Connection error:', err.message);
      });

      newSocket.on('onlineUsers', setOnlineUsers);
      newSocket.on('userStatusUpdate', (update) => {
        setOnlineUsers(prev => {
          const filtered = prev.filter(user => user.id !== update.userId);
          return update.isOnline ? [...filtered, update] : filtered;
        });
      });

      newSocket.on('gameStateChanged', (data) => {
        if (data.gameId) {
          setGameId(data.gameId);
          localStorage.setItem('gameId', data.gameId);
        }
        if (data.currentRound !== undefined) {
          setCurrentRound(data.currentRound);
          localStorage.setItem('currentRound', data.currentRound);
        }
        if (data.status) setGameStatus(data.status);
        if (data.totalRounds) setRounds(data.totalRounds);
        if (data.isEnded !== undefined) setGameEnded(data.isEnded);
      });

      newSocket.on('roundTimerUpdated', (data) => {
        setTimeLeft(data.timeRemaining);
        setCurrentRound(data.currentRound);
        localStorage.setItem('currentRound', data.currentRound);
      });

      newSocket.on('tariffUpdated', (data) => {
        setTariffRates(prev => {
          const filtered = prev.filter(t => 
            !(t.product === data.product && 
              t.fromCountry === data.fromCountry && 
              t.toCountry === data.toCountry &&
              t.roundNumber === data.roundNumber)
          );
          return [...filtered, data];
        });

        setTariffHistory(prev => [...prev, {
          round: data.roundNumber,
          player: data.updatedBy,
          country: data.fromCountry,
          tariffs: { [data.product]: data.rate },
          submittedAt: data.updatedAt
        }]);
      });

      newSocket.on('newMessage', (message) => {
        console.log('Received message:', message);
        setChatMessages(prev => [...prev, message]);
      });

      newSocket.on('gameDataUpdated', (data) => {
        if (data.production) setProduction(data.production);
        if (data.demand) setDemand(data.demand);
        if (data.tariffRates) setTariffRates(data.tariffRates);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  return () => {
    if (newSocket) newSocket.disconnect(); // ✅ Safe cleanup
  };
}, []);

  // Create new game (operator only)
  const createGame = async (totalRounds = 5) => {
    try {
      const data = await apiCall('/game/create', {
        method: 'POST',
        body: JSON.stringify({ totalRounds })
      });

      setGameId(data.game.id);
      setRounds(totalRounds);
      setGameStatus('waiting');
      setCurrentRound(0);
      setGameEnded(false);

      return data.game;
    } catch (error) {
      console.error('Create game error:', error);
      throw error;
    }
  };

  // Start game (operator only)
  const startGame = async () => {
    if (!gameId) throw new Error('No game ID available');

    try {
      const data = await apiCall(`/game/${gameId}/start`, {
        method: 'POST'
      });

      setGameStatus('active');
      setCurrentRound(1);
      setRoundsFinalized(true);
      setTimeLeft(900);

      // Broadcast game state change
      if (socket) {
        socket.emit('gameStateUpdate', {
          gameId,
          status: 'active',
          currentRound: 1,
          isStarted: true
        });
      }

      return data;
    } catch (error) {
      console.error('Start game error:', error);
      throw error;
    }
  };

  // Start next round (operator only)
  const startNextRound = async () => {
    if (!gameId) throw new Error('No game ID available');

    try {
      const data = await apiCall(`/game/${gameId}/next-round`, {
        method: 'POST'
      });

      setCurrentRound(data.currentRound);
      setTimeLeft(900);

      // Broadcast round change
      if (socket) {
        socket.emit('gameStateUpdate', {
          gameId,
          currentRound: data.currentRound,
          timeRemaining: 900
        });
      }

      return data;
    } catch (error) {
      console.error('Start next round error:', error);
      throw error;
    }
  };

  // End game (operator only)
  const endGame = async () => {
    if (!gameId) throw new Error('No game ID available');

    try {
      const data = await apiCall(`/game/${gameId}/end`, {
        method: 'POST'
      });

      setGameStatus('ended');
      setGameEnded(true);

      // Broadcast game end
      if (socket) {
        socket.emit('gameStateUpdate', {
          gameId,
          status: 'ended',
          isEnded: true
        });
      }

      return data;
    } catch (error) {
      console.error('End game error:', error);
      throw error;
    }
  };

  // Submit tariff changes (players only)
  const submitTariffs = async (tariffChanges) => {
    if (!gameId || !authUser) throw new Error('Game ID or user not available');

    try {
      const data = await apiCall('/game/tariffs/submit', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          roundNumber: currentRound,
          tariffChanges
        })
      });

      // Emit tariff updates via socket
      if (socket) {
        tariffChanges.forEach(change => {
          socket.emit('tariffUpdate', {
            gameId,
            roundNumber: currentRound,
            product: change.product,
            fromCountry: authUser.country,
            toCountry: change.toCountry,
            rate: change.rate
          });
        });
      }

      return data;
    } catch (error) {
      console.error('Submit tariffs error:', error);
      throw error;
    }
  };


  // Load game data
  const loadGameData = useCallback(async () => {
    if (!gameId) return;

    try {
      let data;
      if (authUser?.role === 'operator') {
        data = await apiCall(`/game/${gameId}`);
        setProduction(data.game.production || []);
        setDemand(data.game.demand || []);
        setTariffRates(data.game.tariffRates || []);
      } else {
        data = await apiCall(`/game/${gameId}/player-data?currentRound=${currentRound}`);
        setProduction(data.production || []);
        setDemand(data.demand || []);
        setTariffRates(data.tariffRates || []);
      }

         setCurrentRound(parseInt(localStorage.getItem('currentRound')) || 0);


    } catch (error) {
      console.error('Load game data error:', error);
    }
  }, [gameId, currentRound, authUser, apiCall]);

  // Send chat message
  const sendChatMessage = (content, messageType = 'group', recipientCountry = null) => {
    if (!socket || !gameId) return;

    socket.emit('sendMessage', {
      gameId,
      content,
      messageType,
      recipientCountry
    });
  };

  // Logout
  const logout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('gameId');
      localStorage.removeItem('currentRound');
      if (socket) {
        socket.disconnect();
      }
      setAuthUser(null);
      setSocket(null);
      setIsConnected(false);
      // Reset all game state
      setGameId(null);
      setCurrentRound(0);
      setGameStatus('waiting');
      setRoundsFinalized(false);
      setGameEnded(false);
      setProduction([]);
      setDemand([]);
      setTariffRates([]);
      setTariffHistory([]);
      setChatMessages([]);
      setOnlineUsers([]);
    }
  };

  const value = {
    // Game state
    gameId,
    setGameId,
    rounds,
    setRounds,
    currentRound,
    setCurrentRound,
    isRoundsFinalized,
    setRoundsFinalized,
    isGameEnded,
    setGameEnded,
    gameStatus,
    timeLeft,
    setTimeLeft,

    // User state
    authUser,
    setAuthUser,
    onlineUsers,

    // Game data
    countries,
    products,
    production,setProduction,
    demand,setDemand,
    tariffRates,setTariffRates,
    tariffHistory,




    // Chat
    chatMessages,
    sendChatMessage,

    // Socket
    socket,
    isConnected,

    // Actions
    createGame,
    startGame,
    startNextRound,
    endGame,
    submitTariffs,
    loadGameData,
    logout,

    // API helper
    apiCall
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
