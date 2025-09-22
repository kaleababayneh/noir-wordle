import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask(),
  ],
  transports: {
    [sepolia.id]: http(rpcUrl, {
      batch: true, // Enable request batching for better performance
      retryCount: 3, // Retry failed requests
      retryDelay: 1000, // 1 second retry delay
    }),
  },
})