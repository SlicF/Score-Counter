import React, { useState, useEffect } from 'react';
import './MobileApp.css'; // Create a CSS file for MobileApp specific styles

function MobileApp({ score1, score2, resetScores, handleLeftClick, handleRightClick }) {
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
      <div className={`flex h-full ${isLandscape ? 'flex-row' : 'flex-col'}`}>

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
