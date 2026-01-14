import { http, createConfig } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';

export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  transports: {
    // Using official Arbitrum Sepolia RPC
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
  },
});
