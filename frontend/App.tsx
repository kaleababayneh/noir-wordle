import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "./config.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TwoPlayerGame from "./components/TwoPlayerGame.tsx";
import { GameLobby } from "./components/GameLobby.tsx";
import ConnectWallet from "./components/ConnectWallet.tsx";

import "./App.css";

const queryClient = new QueryClient();

function App() {
  const [selectedGameContract, setSelectedGameContract] = useState<string | null>(null);
  const [showLobby, setShowLobby] = useState(true);

  const handleGameSelected = (gameContract: string) => {
    setSelectedGameContract(gameContract);
    setShowLobby(false);
  };

  const handleBackToLobby = () => {
    setSelectedGameContract(null);
    setShowLobby(true);
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
              <h1 
                className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={handleBackToLobby}
              >
                🔤 ZK Wordle
              </h1>
              <div className="flex items-center gap-4">
                {!showLobby && (
                  <button
                    onClick={handleBackToLobby}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to Lobby
                  </button>
                )}
                <ConnectWallet />
              </div>
            </div>
          </header>
          
          <main>
            {showLobby ? (
              <GameLobby onGameSelected={handleGameSelected} />
            ) : (
              selectedGameContract && (
                <TwoPlayerGame 
                  gameContract={selectedGameContract}
                  onBackToLobby={handleBackToLobby}
                />
              )
            )}
          </main>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
