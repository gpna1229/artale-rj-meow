import React, { useState, useEffect } from 'react';
import './App.css';
import { database } from './firebase'; 
import { ref, onValue, update, runTransaction, onDisconnect } from "firebase/database";

const ROLE_CONFIG = [
  { id: 0, name: '蘇打貓', hex: '#78E8FF' },
  { id: 1, name: '起司貓', hex: '#FFB370' },
  { id: 2, name: '抹茶貓', hex: '#88FFBB' },
  { id: 3, name: '花花貓', hex: '#FF99CC' }
];

function App() {
  const [isJoined, setIsJoined] = useState(false);
  const [roomID, setRoomID] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [syncData, setSyncData] = useState({ grid: {}, players: {} });

  useEffect(() => {
    if (!isJoined || !roomID) return;

    const roomRef = ref(database, `rooms/${roomID}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setIsJoined(false);
        setUserRole(null);
        return;
      }
      setSyncData({
        grid: data.grid || {},
        players: data.players || {}
      });
    });

    return () => unsubscribe();
  }, [isJoined, roomID]);

  const syncEntryState = (id, index) => {
    const playerSeatRef = ref(database, `rooms/${id}/players/${index}`);

    onDisconnect(playerSeatRef).remove().then(() => {
    });

    setRoomID(id);
    setUserRole(ROLE_CONFIG[index]);
    setIsJoined(true);
  };

  const joinSession = async () => {
    if (!roomID.trim()) return;
    const roomRef = ref(database, `rooms/${roomID}`);
    const seatRef = ref(database, `rooms/${roomID}/players`);
    
    try {
      let assignedIndex = -1;
      
      const result = await runTransaction(seatRef, (currentPlayers) => {
        const players = currentPlayers || {};
        let target = -1;

        for (let i = 0; i < 4; i++) {
          if (!players[i]) {
            target = i;
            break;
          }
        }

        if (target === -1) return; 

        assignedIndex = target;
        return { ...players, [target]: { active: true } };
      });

      if (result.committed && assignedIndex !== -1) {
        if (assignedIndex === 0) {
           onDisconnect(roomRef).remove();
        }
        syncEntryState(roomID, assignedIndex);
      } else {
        alert("隊伍人數已滿");
      }
    } catch (e) {
      alert("加入失敗");
    }
  };

  const handleIDChange = (e) => {
    setRoomID(e.target.value);
  };

  const handleTileToggle = (f, d) => {
    if (!userRole) return;
    const fKey = `f${f}`, dKey = `d${d}`;
    const floor = syncData.grid[fKey] || {};

    if (floor[dKey] && floor[dKey] !== userRole.hex) return;
    if (floor[dKey] === userRole.hex) {
      update(ref(database, `rooms/${roomID}/grid/${fKey}`), { [dKey]: null });
      return;
    }

    const updates = {};
    [1, 2, 3, 4].forEach(door => { if (floor[`d${door}`] === userRole.hex) updates[`d${door}`] = null; });
    updates[dKey] = userRole.hex;
    update(ref(database, `rooms/${roomID}/grid/${fKey}`), updates);
  };

  const clearGlobalProgress = () => {
    if (window.confirm("全隊標記重置？")) update(ref(database, `rooms/${roomID}`), { grid: null });
  };

  const closeSession = () => {
    if (window.confirm("隊伍即將解散!!")) update(ref(database, `rooms`), { [roomID]: null });
  };

  if (!isJoined) {
    return (
      <div className="container">
        <h1>阿泰爾 羅朱 助手小貓咪</h1>
        
        <div className="avatar-group">
          <img 
            src="https://mod-file.dn.nexoncdn.co.kr/profile/185/1773945197315.png?s=120x120&t=crop&q=100&f=png" 
            alt="My Avatar" 
            className="user-avatar" 
          />
          <img 
            src="https://mod-file.dn.nexoncdn.co.kr/profile/15/1773281232244.png?s=120x120&t=crop&q=100&f=png" 
            alt="Boyfriend's Avatar" 
            className="user-avatar" 
          />
        </div>

        <div className="welcome-section">
          <p>歡迎使用羅密歐與朱麗葉輔助小工具~</p>
          <p>請直接輸入隊名以創建或進入房間</p>
          <p>然後開始你們的副本之旅吧 ❤️</p>
        </div>
        <div className="join-box">
          <input 
            type="text" 
            placeholder="請輸入團隊名稱" 
            maxLength={12}
            value={roomID} 
            onChange={handleIDChange} 
          />
          <button className="btn-join" onClick={joinSession}>加入隊伍</button>
        </div>
        <footer className="footer-info">© 2026 剛普夫人 | gpna1229</footer>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>阿泰爾 羅朱 助手小貓咪</h1>
      <div className="simple-info">
        <div>
          隊伍: <span className="highlight">{roomID}</span> | 
          你是: <span style={{ color: userRole?.hex, fontWeight: 'bold' }}>{userRole?.name}</span>
        </div>
        <div className="member-list">
          房間成員: 
          {Object.keys(syncData.players).map(key => (
            <span 
              key={key} 
              className="member-dot" 
              style={{ backgroundColor: ROLE_CONFIG[key].hex }}
              title={ROLE_CONFIG[key].name}
            ></span>
          ))}
        </div>
      </div>
      <div className="button-group">
        <button className="btn-clear-all" onClick={clearGlobalProgress}>全隊清除</button>
        <button className="btn-back-inline" style={{backgroundColor: '#F39C12'}} onClick={closeSession}>💥 解散團隊</button>
      </div>
      <div className="staircase">
        {[...Array(10)].map((_, i) => {
          const fNum = 10 - i;
          return (
            <div key={fNum} className="floor-row">
              <div className="floor-num">{fNum}F</div>
              {[1, 2, 3, 4].map(dNum => (
                <div key={dNum} className="door"
                  style={{ backgroundColor: syncData.grid[`f${fNum}`]?.[`d${dNum}`] || (fNum % 2 === 0 ? '#3A3A3A' : '#2A2A2A') }}
                  onClick={() => handleTileToggle(fNum, dNum)}
                >{dNum}</div>
              ))}
            </div>
          );
        })}
      </div>
      <footer className="footer-info">© 2026 剛普夫人 | gpna1229</footer>
    </div>
  );
}

export default App;