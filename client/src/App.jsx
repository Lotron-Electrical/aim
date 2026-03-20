import React from "react";
import useStore from "./store.js";
import TitleScreen from "./screens/TitleScreen.jsx";
import LobbyScreen from "./screens/LobbyScreen.jsx";
import BuildScreen from "./screens/BuildScreen.jsx";
import BattleScreen from "./screens/BattleScreen.jsx";
import ResultScreen from "./screens/ResultScreen.jsx";
import RetroEffects from "./components/RetroEffects.jsx";

export default function App() {
  const screen = useStore((s) => s.screen);

  return (
    <div className="min-h-screen bg-bg crt-screen crt-flicker relative">
      <RetroEffects />
      {screen === "title" && <TitleScreen />}
      {screen === "lobby" && <LobbyScreen />}
      {screen === "build" && <BuildScreen />}
      {screen === "battle" && <BattleScreen />}
      {screen === "result" && <ResultScreen />}
    </div>
  );
}
