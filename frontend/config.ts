import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

const rpcUrl = import.meta.env.VITE_BASE_SEPOLIA_RPC
export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    metaMask(),
  ],
  transports: {
    [baseSepolia.id]: http(rpcUrl, {
      batch: true, // Enable request batching for better performance
      retryCount: 3, // Retry failed requests
      retryDelay: 1000, // 1 second retry delay
    }),
  },
})