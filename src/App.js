import React, { useState, useEffect } from 'react';
import './App.css';
import { database } from './firebase'; 
import { ref, onValue, update, runTransaction, onDisconnect, remove } from "firebase/database";

const ROLE_CONFIG = {
  'p0': { name: '蘇打貓', hex: '#74D6E0' },
  'p1': { name: '起司貓', hex: '#FFB370' },
  'p2': { name: '抹茶貓', hex: '#95E0AF' },
  'p3': { name: '花花貓', hex: '#FF99CC' }
};

function App() {
  const [activeRoomCount, setActiveRoomCount] = useState(null);
  const [playerCount, setPlayerCount] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [syncData, setSyncData] = useState({ grid: {}, players: {} });

  useEffect(() => {
    const roomsRef = ref(database, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomEntries = Object.values(data);
        const activeRooms = roomEntries.filter(room => 
          room.players && Object.keys(room.players).length > 0
        );
        setActiveRoomCount(activeRooms.length);

        let totalPlayers = 0;
        activeRooms.forEach(room => {
          totalPlayers += Object.keys(room.players).length;
        });
        setPlayerCount(totalPlayers);
      } else {
        setActiveRoomCount(0);
        setPlayerCount(0);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isJoined || !roomId) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setIsJoined(false);
        setUserRole(null);
        return;
      }

      if (!data.players) {
        remove(ref(database, `rooms/${roomId}`));
        return;
      }

      setSyncData({
        grid: data.grid || {},
        players: data.players || {}
      });
    });

    return () => unsubscribe();
  }, [isJoined, roomId]);

  const syncEntryState = (targetRoomId, playerId) => {
    const playerSeatRef = ref(database, `rooms/${targetRoomId}/players/${playerId}`);
    
    onDisconnect(playerSeatRef).remove();

    setRoomId(targetRoomId);
    setUserRole({ ...ROLE_CONFIG[playerId], id: playerId });
    setIsJoined(true);
  };

  const joinSession = async () => {
    if (!roomId.trim()) return;
    const playersRef = ref(database, `rooms/${roomId}/players`);
    
    try {
      let assignedId = null;
      
      const result = await runTransaction(playersRef, (currentPlayers) => {
        const players = currentPlayers || {};
        let targetId = null;

        for (let i = 0; i < 4; i++) {
          const checkId = `p${i}`;
          if (!players[checkId]) {
            targetId = checkId;
            break;
          }
        }

        if (!targetId) return; 

        assignedId = targetId;
        return { ...players, [targetId]: { active: true } };
      });

      if (result.committed && assignedId) {
        syncEntryState(roomId, assignedId);
      } else {
        alert("隊伍人數已滿");
      }
    } catch (e) {
      alert("加入失敗");
    }
  };

  const handleRoomIdChange = (e) => {
    setRoomId(e.target.value);
  };

  const toggleTileStatus = (floorNum, doorNum) => {
    if (!userRole) return;
    const fKey = `f${floorNum}`, dKey = `d${doorNum}`;
    const floor = syncData.grid[fKey] || {};

    if (floor[dKey] && floor[dKey] !== userRole.hex) return;
    
    if (floor[dKey] === userRole.hex) {
      update(ref(database, `rooms/${roomId}/grid/${fKey}`), { [dKey]: null });
      return;
    }

    const updates = {};
    [1, 2, 3, 4].forEach(door => { 
      if (floor[`d${door}`] === userRole.hex) updates[`d${door}`] = null; 
    });
    
    updates[dKey] = userRole.hex;
    update(ref(database, `rooms/${roomId}/grid/${fKey}`), updates);
  };

  const clearGridSession = () => {
    if (window.confirm("確定清空全隊標記？")) {
      update(ref(database, `rooms/${roomId}`), { grid: null });
    }
  };

  const leaveSession = async () => { 
    const mySeatRef = ref(database, `rooms/${roomId}/players/${userRole.id}`);

    onDisconnect(mySeatRef).cancel();
    await remove(mySeatRef);

    setIsJoined(false);
    setUserRole(null);
    setRoomId(""); 
  };

  const destroySession = () => {
    if (window.confirm("隊伍即將解散!!")) {
      remove(ref(database, `rooms/${roomId}`));
    }
  };

  if (!isJoined) {
    return (
      <div className="container">
        <h1>阿泰爾 羅茱副本 助手小貓咪</h1>
        
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
          <p>歡迎使用羅密歐與茱麗葉輔助小工具~</p>
          <p>請直接輸入隊名以創建或進入房間</p>
          <p>然後開始你們的副本之旅吧❤️</p>
          <p>★使用方式: 點選格子進行標記 再次點擊可取消標記★</p>
        </div>

        <div className="lobby-status">
          <span className="status-badge">
            🐾 有 <strong> {activeRoomCount}</strong> 組隊伍在線中，其中有 <strong>{playerCount}</strong> 隻貓貓
          </span>
        </div>

        <div className="join-box">
          <input 
            type="text" 
            placeholder="請輸入團隊名稱" 
            maxLength={12}
            value={roomId} 
            onChange={handleRoomIdChange} 
          />
          <button className="btn-join" onClick={joinSession}>加入隊伍</button>
        </div>
          
        <p className="server-limit-hint">
          ※ 若無法看到上面貓貓數量代表同時可連線玩家數量已滿，還請見諒
        </p>

        <footer className="footer-info">© 2026 剛普夫人 | gpna1229</footer>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>阿泰爾 羅茱副本 助手小貓咪</h1>
      <div className="simple-info">
        <div>
          隊伍: <span className="highlight">{roomId}</span> | 
          你是: <span style={{ color: userRole?.hex, fontWeight: 'bold' }}>{userRole?.name}</span>
        </div>

        <div className="button-group">
          <button className="btn-clear-all" onClick={clearGridSession}>全隊標記清空</button>
          <button className="btn-leave" onClick={leaveSession}>離開隊伍</button>
          <button className="btn-close-all" onClick={destroySession}>解散</button>
        </div>

        <div className="member-list">
          房間成員: 
          {Object.keys(syncData.players).map(key => {
              const config = ROLE_CONFIG[key];
              if (!config) return null;
              return (
                <span 
                  key={key} 
                  className="member-dot" 
                  style={{ backgroundColor: config.hex }}
                  title={config.name}
                ></span>
              );
            })}
        </div>
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
                  onClick={() => toggleTileStatus(fNum, dNum)}
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