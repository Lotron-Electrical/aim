import React, { useState } from "react";
import useStore from "../store.js";
import { SoundManager } from "../audio/SoundManager.js";

export default function LobbyScreen() {
  const { playerName, player, roomList, createRoom, createAIRoom, joinRoom, disconnect } =
    useStore();
  const [joinCode, setJoinCode] = useState("");

  const handleCreate = () => {
    SoundManager.play("click");
    createRoom();
  };

  const handleAI = () => {
    SoundManager.play("click");
    createAIRoom();
  };

  const handleJoin = (roomId) => {
    SoundManager.play("click");
    joinRoom(roomId);
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      handleJoin(joinCode.trim().toUpperCase());
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-lg mb-8">
        <div>
          <h2 className="font-pixel text-lg text-neon-green glow-green">
            LOBBY
          </h2>
          <p className="font-pixel text-[8px] text-amber mt-1">
            {playerName} // ELO: {player?.rating || 1000}
          </p>
        </div>
        <button
          onClick={disconnect}
          className="font-pixel text-[8px] text-red border border-red px-3 py-1 hover:bg-red hover:text-bg transition-colors"
        >
          DISCONNECT
        </button>
      </div>

      {/* Actions */}
      <div className="w-full max-w-lg space-y-4 mb-8">
        <button
          onClick={handleCreate}
          className="w-full font-pixel text-sm bg-bg border-2 border-neon-green text-neon-green
                     py-4 hover:bg-neon-green hover:text-bg transition-colors glow-green"
        >
          [ CREATE ROOM ]
        </button>

        <button
          onClick={handleAI}
          className="w-full font-pixel text-sm bg-bg border-2 border-amber text-amber
                     py-4 hover:bg-amber hover:text-bg transition-colors"
        >
          [ VS AI ]
        </button>

        <form onSubmit={handleJoinByCode} className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) =>
              setJoinCode(e.target.value.toUpperCase().slice(0, 4))
            }
            placeholder="ROOM CODE"
            maxLength={4}
            className="flex-1 font-pixel text-[10px] bg-bg border border-cyan-dim text-cyan
                       px-3 py-2 outline-none placeholder-cyan-dim uppercase tracking-widest"
          />
          <button
            type="submit"
            disabled={!joinCode.trim()}
            className="font-pixel text-[10px] border border-cyan text-cyan px-4 py-2
                       hover:bg-cyan hover:text-bg transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            JOIN
          </button>
        </form>
      </div>

      {/* Room List */}
      <div className="w-full max-w-lg">
        <h3 className="font-pixel text-[10px] text-amber mb-3">OPEN ROOMS</h3>
        {roomList.length === 0 ? (
          <div className="font-pixel text-[8px] text-neon-green-dim text-center py-8 border border-bg-panel">
            No open rooms. Create one to start.
          </div>
        ) : (
          <div className="space-y-2">
            {roomList.map((room) => (
              <button
                key={room.id}
                onClick={() => handleJoin(room.id)}
                className="w-full flex items-center justify-between font-pixel text-[10px]
                           bg-bg-panel border border-neon-green-dim p-3
                           hover:border-neon-green hover:bg-bg transition-colors text-left"
              >
                <div>
                  <span className="text-cyan">[{room.id}]</span>
                  <span className="text-neon-green ml-3">{room.host}</span>
                </div>
                <span className="text-amber">ELO {room.hostRating}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
