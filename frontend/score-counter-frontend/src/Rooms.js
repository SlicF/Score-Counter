import React, { useState, useEffect } from 'react';

function Rooms({ onRoomSelected }) {
  const [roomId, setRoomId] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [spectatorPass, setSpectatorPass] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRole, setJoinRole] = useState('admin'); // 'admin' ou 'spectator'
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    fetchAvailableRooms();
  }, []);

  const fetchAvailableRooms = async () => {
    setLoadingRooms(true);
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (attempts < maxAttempts) {
      try {
        const res = await fetch('/api/rooms');
        if (!res.ok) {
          // Log status e statusText
          console.error(`Erro HTTP ao carregar salas: status=${res.status}, statusText=${res.statusText}`);
          // Retry apenas para erros 5xx
          if (res.status >= 500 && res.status < 600) {
            attempts++;
            await delay(500 * attempts);
            continue;
          } else {
            // Outros erros não são elegíveis para retry
            setAvailableRooms([]);
            return setLoadingRooms(false);
          }
        }
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setAvailableRooms(data.rooms);
        } else {
          setAvailableRooms([]);
        }
        return setLoadingRooms(false);
      } catch (err) {
        lastError = err;
        // Log detalhes do erro
        console.error('Erro de rede ao carregar salas:', err && err.stack ? err.stack : err);
        attempts++;
        // Retry apenas para erros de rede
        await delay(500 * attempts);
      }
    }
    // Falha final após tentativas
    console.error('Falha ao carregar salas após múltiplas tentativas:', lastError);
    setAvailableRooms([]);
    setLoadingRooms(false);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    if (!roomId.trim()) {
      setError('O nome da sala não pode ser vazio.');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch('/api/create_room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          admin_pass: adminPass,
          spectator_pass: spectatorPass
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar sala');
        setIsCreating(false);
        return;
      }
      setRoomId('');
      setAdminPass('');
      setSpectatorPass('');
      setError('');
      setIsCreating(false);
      // Atualizar lista de salas
      await fetchAvailableRooms();
      // Entrar na sala criada como admin
      onRoomSelected(roomId, 'admin');
    } catch (err) {
      setError('Erro ao criar sala');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setError('');
    setIsJoining(true);
    try {
      const res = await fetch('/api/join_room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: joinRoomId,
          password: joinPass,
          role: joinRole
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao entrar na sala');
        return;
      }
      onRoomSelected(joinRoomId, joinRole);
    } catch (err) {
      setError('Erro ao entrar na sala');
    } finally {
      setIsJoining(false);
    }
  };
  const handleRoomClick = (room) => {
    setJoinRoomId(room.id);
    setJoinPass('');
  };

  const handleQuickJoin = async (roomId) => {
    const room = availableRooms.find(r => r.id === roomId);
    if (room && room.hasPassword) {
      setJoinRoomId(roomId);
      setError('Esta sala requer senha. Por favor, insira a senha abaixo.');
      return;
    }
    onRoomSelected(roomId, 'admin');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Score Counter - Salas</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Lista de Salas Disponíveis - Lado Esquerdo */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Salas Disponíveis</h2>
              <button
                onClick={fetchAvailableRooms}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                disabled={loadingRooms}
              >
                {loadingRooms ? '⟳' : '↻'}
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loadingRooms ? (
                <div className="text-center py-8 text-gray-400">
                  Carregando salas...
                </div>
              ) : availableRooms.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Sem salas disponíveis
                </div>
              ) : (
                availableRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => handleRoomClick(room)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{room.id}</h3>
                        <p className="text-gray-300 text-sm">
                          {room.participants || 0} participantes conectados
                        </p>
                        {room.hasPassword && (
                          <span className="inline-block px-2 py-1 bg-yellow-600 text-xs rounded mt-1">
                            🔒 Protegida
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickJoin(room.id);
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                      >
                        Entrar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Menu de Criação e Entrada - Lado Direito */}
          <div className="space-y-6">
            {/* Criar Sala */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">Criar Sala</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="ID da sala"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
                <input
                  type="password"
                  placeholder="Senha de admin (opcional)"
                  value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
                <input
                  type="password"
                  placeholder="Senha de espectador (opcional)"
                  value={spectatorPass}
                  onChange={e => setSpectatorPass(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg font-semibold transition-colors"
                >
                  {isCreating ? 'Criando...' : 'Criar Sala'}
                </button>
              </div>
            </div>

            {/* Entrar em Sala */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">Entrar em Sala</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="ID da sala"
                  value={joinRoomId}
                  onChange={e => setJoinRoomId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                />
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="joinRole"
                      value="admin"
                      checked={joinRole === 'admin'}
                      onChange={() => setJoinRole('admin')}
                    /> Admin
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="joinRole"
                      value="spectator"
                      checked={joinRole === 'spectator'}
                      onChange={() => setJoinRole('spectator')}
                    /> Espectador
                  </label>
                </div>
                <input
                  type="password"
                  placeholder={joinRole === 'admin' ? 'Senha de admin' : 'Senha de espectador'}
                  value={joinPass}
                  onChange={e => setJoinPass(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={isJoining}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded-lg font-semibold transition-colors"
                >
                  {isJoining ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-800 border border-red-600 p-4 rounded-lg">
                <p className="text-red-100">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Rooms;
