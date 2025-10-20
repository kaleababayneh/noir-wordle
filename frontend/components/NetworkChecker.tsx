import { useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

const TARGET_CHAIN_ID = baseSepolia.id; // 84532

export function NetworkChecker() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    // Only check if user is connected and on wrong network
    if (isConnected && chainId !== TARGET_CHAIN_ID) {
      console.log(`🔄 Wrong network detected (${chainId}), switching to Base Sepolia (${TARGET_CHAIN_ID})...`);
      
      // Automatically switch to Base Sepolia
      switchChain({ chainId: TARGET_CHAIN_ID });
    }
  }, [isConnected, chainId, switchChain]);

  // Show a warning banner if on wrong network
  if (isConnected && chainId !== TARGET_CHAIN_ID) {
    return (
      <div className="bg-yellow-500 text-black px-4 py-3 text-center font-semibold">
        ⚠️ Wrong Network! Switching to Base Sepolia...
      </div>
    );
  }

  return null;
}
