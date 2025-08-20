import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import MobileApp from './MobileApp';
import Rooms from './Rooms';

function App() {
  const [roomId, setRoomId] = useState(null);
  const [role, setRole] = useState(null);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!roomId) return;
    // Fetch initial scores from the API when a room is selected
    // O backend pode ser adaptado para retornar os scores da sala
    // Aqui, usamos socket para receber os scores iniciais
    const s = io();
    setSocket(s);
    s.emit('join', { room_id: roomId });
    s.on('init_scores', (data) => {
      setScore1(data.score1);
      setScore2(data.score2);
    });
    s.on('update_score', (data) => {
      if (data.team === 1) setScore1(data.score);
      if (data.team === 2) setScore2(data.score);
    });
    s.on('reset_scores', (data) => {
      setScore1(data.score1);
      setScore2(data.score2);
    });
    return () => {
      s.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Função para lidar com seleção de sala
  const handleRoomSelected = (selectedRoomId, selectedRole) => {
    setRoomId(selectedRoomId);
    setRole(selectedRole);
  };

  // Função para voltar à lista de salas
  const handleLeaveRoom = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setRoomId(null);
    setRole(null);
    setScore1(0);
    setScore2(0);
  };

  const resetScores = async () => {
    if (!roomId || role !== 'admin') return;
    try {
      await axios.post(`/api/reset/${roomId}`);
    } catch (err) {
      console.error('Failed to reset scores:', err);
      // Consider showing an error notification to the user
    }
  };


  // Só permite alterar o placar se for admin
  const handleLeftClick = async (e) => {
    if (!roomId || role !== 'admin') return;
    const { clientY, currentTarget } = e;
    const targetHeight = currentTarget.clientHeight;
    let newScore1;
    if (clientY < targetHeight / 2) {
      newScore1 = score1 + 1;
    } else {
      newScore1 = Math.max(0, score1 - 1);
    }
    try {
      await axios.post(`/api/score/${roomId}/1/${newScore1}`);
    } catch (err) {
      console.error('Failed to update score1:', err);
      // Consider showing an error notification to the user
    }
  };

  const handleRightClick = async (e) => {
    if (!roomId || role !== 'admin') return;
    const { clientY, currentTarget } = e;
    const targetHeight = currentTarget.clientHeight;
    let newScore2;
    if (isMobile() && isPortrait) {
      if (clientY - targetHeight < targetHeight / 2) {
        newScore2 = score2 + 1;
      } else {
        newScore2 = Math.max(0, score2 - 1);
      }
    } else {
      if (clientY < targetHeight / 2) {
        newScore2 = score2 + 1;
      } else {
        newScore2 = Math.max(0, score2 - 1);
      }
    }
    try {
      await axios.post(`/api/score/${roomId}/2/${newScore2}`);
    } catch (err) {
      console.error('Failed to update score2:', err);
      // Consider showing an error notification to the user
    }
  };

  const isMobile = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  // Se não há sala selecionada, mostrar o componente Rooms
  if (!roomId) {
    return <Rooms onRoomSelected={handleRoomSelected} />;
  }

  // Renderizar versão mobile se for dispositivo móvel
  if (isMobile()) {
    return (
      <MobileApp
        score1={score1}
        score2={score2}
        resetScores={resetScores}
        handleLeftClick={handleLeftClick}
        handleRightClick={handleRightClick}
        onLeaveRoom={handleLeaveRoom}
        roomId={roomId}
        role={role}
      />
    );
  }

  // Renderizar versão desktop
  return (
    <div className="App h-screen bg-gray-900">
      {/* Header com informações da sala */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Sala: {roomId}</h2>
          <p className="text-sm text-gray-300">Papel: {role}</p>
        </div>
        <button
          onClick={handleLeaveRoom}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
        >
          Sair da Sala
        </button>
      </div>

      {/* Área principal do jogo */}
      <div className="flex w-full flex-col lg:flex-row h-full">
        <div 
          className="card bg-black rounded-box grid h-full flex-grow place-items-center text-white cursor-pointer"
          onClick={handleLeftClick}
        >
          <div className="card-title text-[400px] text-dark" id="score1">{score1}</div>
        </div>
        <div className="flex items-center justify-center w-full lg:w-auto">
          <button 
            onClick={resetScores} 
            className="btn btn-lg bg-gray-500 hover:bg-gray-600 text-white text-xl h-full px-6 py-4 rounded"
          >
            Reset
          </button>
        </div>
        <div 
          className="card bg-white rounded-box grid h-full flex-grow place-items-center text-black cursor-pointer"
          onClick={handleRightClick}
        >
          <div className="card-title text-[400px] text-dark" id="score2">{score2}</div>
        </div>
      </div>
    </div>
  );
}

export default App;