import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import MobileApp from './MobileApp';

function App() {
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    // Fetch initial scores from the API when the component mounts
    axios.get('/api/score1')
      .then(response => {
        setScore1(response.data.score1);
      });
    axios.get('/api/score2')
      .then(response => {
        setScore2(response.data.score2);
      });

    // Set up Socket.IO connection
    const socket = io();

    socket.on('update_score1', (data) => {
      setScore1(data.score1);
    });

    socket.on('update_score2', (data) => {
      setScore2(data.score2);
    });

    socket.on('reset_scores', (data) => {
      setScore1(data.score1);
      setScore2(data.score2);
    });

    // Clean up the socket connection when the component unmounts
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const resetScores = () => {
    axios.post('/api/reset')
      .then(() => {
        setScore1(0);
        setScore2(0);
      });
  };

  const handleLeftClick = (e) => {
    const { clientY, currentTarget } = e;
    const targetHeight = currentTarget.clientHeight;
    let newScore1;
    if (clientY < targetHeight / 2) {
      newScore1 = score1 + 1;
    } else {
      newScore1 = Math.max(0, score1 - 1);
    }
    axios.post(`/api/score1/${newScore1}`)
      .then(() => {
        setScore1(newScore1);
      });
  };

  const handleRightClick = (e) => {
    const { clientY, currentTarget } = e;
    const targetHeight = currentTarget.clientHeight;
    let newScore2;
    if (isMobile() && isPortrait) {
      console.log(clientY - targetHeight, targetHeight);
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
    axios.post(`/api/score2/${newScore2}`)
      .then(() => {
        setScore2(newScore2);
      });
  };

  const isMobile = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  if (isMobile()) {
    return (
      <MobileApp
        score1={score1}
        score2={score2}
        resetScores={resetScores}
        handleLeftClick={handleLeftClick}
        handleRightClick={handleRightClick}
      />
    );
  }

  return (
    <div className="App h-screen">
      <div className="flex w-full flex-col lg:flex-row h-full">

        <div 
          className="card bg-black rounded-box grid h-full flex-grow place-items-center text-white"
          onClick={handleLeftClick}
        >
          <div className="card-title text-[400px] text-dark" id="score1">{score1}</div>
        </div>

        <div className="flex items-center justify-center w-full lg:w-auto">
          <button 
            onClick={resetScores} 
            className="btn btn-lg bg-gray-500 text-xl h-full"
          >
            Reset
          </button>
        </div>

        <div 
          className="card bg-white rounded-box grid h-full flex-grow place-items-center text-black"
          onClick={handleRightClick}
        >
          <div className="card-title text-[400px] text-dark" id="score2">{score2}</div>
        </div>

      </div>
    </div>
  );
}

export default App;
