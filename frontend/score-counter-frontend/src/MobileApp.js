import React, { useState, useEffect } from 'react';
import './MobileApp.css'; // Create a CSS file for MobileApp specific styles

function MobileApp({ score1, score2, resetScores, handleLeftClick, handleRightClick, onLeaveRoom, roomId, role }) {
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="MobileApp h-screen w-screen">
      {/* Header com informações da sala */}
      <div className="bg-gray-800 text-white p-2 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Sala: {roomId}</h2>
          <p className="text-xs text-gray-300">Papel: {role}</p>
        </div>
        <button
          onClick={onLeaveRoom}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
        >
          Sair
        </button>
      </div>

      <div className={`flex ${isLandscape ? 'flex-row h-full' : 'flex-col'} h-full`}>

        <div
          className="card bg-black rounded-box grid flex-grow place-items-center text-white"
          onClick={handleLeftClick}
        >
          <div className={`card-title ${isLandscape ? 'text-[250px]' : 'text-[250px]'}`} id="score1">{score1}</div>
        </div>

        <div className={`flex items-center justify-center ${isLandscape ? 'h-full w-auto' : 'w-full'} p-4`}>
          <button
            onClick={resetScores}
            className={`btn btn-lg bg-gray-500 text-xl ${isLandscape ? 'h-full' : 'w-full'} p-4 rounded`}
          >
            Reset
          </button>
        </div>

        <div
          className="card bg-white rounded-box grid flex-grow place-items-center text-black"
          onClick={handleRightClick}
        >
          <div className={`card-title ${isLandscape ? 'text-[250px]' : 'text-[250px]'}`} id="score2">{score2}</div>
        </div>

      </div>
    </div>
  );
}

export default MobileApp;
