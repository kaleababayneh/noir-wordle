import { WagmiProvider } from "wagmi";
import { config } from "./config.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TwoPlayerGame from "./components/TwoPlayerGame.tsx";

import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div>
          <TwoPlayerGame />
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
