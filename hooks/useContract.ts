import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { 
  FIVE_FACTION_ADDRESS, 
  MOCK_USDC_ADDRESS,
  FIVE_FACTION_ABI,
  MOCK_USDC_ABI 
} from "@/lib/contracts";

export enum Clan {
  NONE = 0,
  SHADOW = 1,
  BLADE = 2,
  SPIRIT = 3,
  PILLAR = 4,
  WIND = 5,
}

export const CLAN_NAMES: Record<Clan, string> = {
  [Clan.NONE]: "None",
  [Clan.SHADOW]: "SHADOW",
  [Clan.BLADE]: "BLADE",
  [Clan.SPIRIT]: "SPIRIT",
  [Clan.PILLAR]: "PILLAR",
  [Clan.WIND]: "WIND",
};

export function useCurrentEpoch() {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "currentEpoch",
  });
}

export function useEpochDuration() {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "epochDuration",
  });
}

export function useEpochStartTime() {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "epochStartTime",
  });
}

export function useDepositPhaseDuration() {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "DEPOSIT_PHASE_DURATION",
  });
}

export function useTimeUntilCanvasClears() {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "getTimeUntilCanvasClears",
  });
}

export function useAllClanTVLs() {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "getAllClanTVLs",
  });
}

export function useAllScores() {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "getAllScores",
  });
}

export function useTotalTVL() {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "getTotalTVL",
  });
}

export function useRolloverInk() {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "rolloverInk",
  });
}

export function useWarriorInfo(address: `0x${string}` | undefined) {
  return useReadContract({
    address: FIVE_FACTION_ADDRESS,
    abi: FIVE_FACTION_ABI,
    functionName: "getWarriorInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useUSDCBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useUSDCAllowance(owner: `0x${string}` | undefined) {
  return useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: owner ? [owner, FIVE_FACTION_ADDRESS] : undefined,
    query: {
      enabled: !!owner,
    },
  });
}

export function useApproveUSDC() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = () => {
    console.log("[approve] Approving USDC for FiveFaction:", FIVE_FACTION_ADDRESS);
    // Use unlimited approval for better UX - user only needs to approve once
    writeContract({
      address: MOCK_USDC_ADDRESS,
      abi: MOCK_USDC_ABI,
      functionName: "approve",
      args: [FIVE_FACTION_ADDRESS, maxUint256],
      // Specify gas manually to bypass estimation issues
      gas: BigInt(150000),
    });
  };

  return { approve, isPending, isConfirming, isSuccess, error, hash, reset };
}

export function useJoinClan() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const joinClan = (clan: Clan) => {
    writeContract({
      address: FIVE_FACTION_ADDRESS,
      abi: FIVE_FACTION_ABI,
      functionName: "joinClan",
      args: [clan],
    });
  };

  return { joinClan, isPending, isConfirming, isSuccess, error, hash, reset };
}

export function useStakeInk() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const stakeInk = (amount: string) => {
    const parsedAmount = parseUnits(amount, 6);
    console.log("[stakeInk] Attempting to stake:", amount, "USDC (raw:", parsedAmount.toString(), ")");
    writeContract({
      address: FIVE_FACTION_ADDRESS,
      abi: FIVE_FACTION_ABI,
      functionName: "stakeInk",
      args: [parsedAmount],
      // Specify gas manually to bypass estimation issues
      gas: BigInt(500000),
    }, {
      onError: (err) => {
        console.error("[stakeInk] Transaction failed:", err);
        // Try to parse the revert reason
        const errorMessage = err.message || String(err);
        if (errorMessage.includes("DepositPhaseClosed")) {
          console.error("[stakeInk] Reason: Deposit phase is closed. Wait for next epoch.");
        } else if (errorMessage.includes("JoinClanFirst")) {
          console.error("[stakeInk] Reason: You must join a clan first.");
        } else if (errorMessage.includes("AmountZero")) {
          console.error("[stakeInk] Reason: Amount cannot be zero.");
        } else if (errorMessage.includes("ERC20InsufficientAllowance") || errorMessage.includes("0xfb8f41b2")) {
          console.error("[stakeInk] Reason: Insufficient token allowance. Need to approve FiveFaction first.");
        } else if (errorMessage.includes("ERC20InsufficientBalance")) {
          console.error("[stakeInk] Reason: Insufficient USDC balance.");
        }
      }
    });
  };

  return { stakeInk, isPending, isConfirming, isSuccess, error, hash, reset };
}

export function useWithdrawInk() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdrawInk = (amount: string) => {
    const parsedAmount = parseUnits(amount, 6);
    writeContract({
      address: FIVE_FACTION_ADDRESS,
      abi: FIVE_FACTION_ABI,
      functionName: "withdrawInk",
      args: [parsedAmount],
    });
  };

  return { withdrawInk, isPending, isConfirming, isSuccess, error, hash, reset };
}

export function useClearCanvas() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const clearCanvas = () => {
    writeContract({
      address: FIVE_FACTION_ADDRESS,
      abi: FIVE_FACTION_ABI,
      functionName: "clearCanvas",
    });
  };

  return { clearCanvas, isPending, isConfirming, isSuccess, error, hash, reset };
}

export function useMintUSDC() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const mint = (to: `0x${string}`, amount: string) => {
    const parsedAmount = parseUnits(amount, 6);
    writeContract({
      address: MOCK_USDC_ADDRESS,
      abi: MOCK_USDC_ABI,
      functionName: "mint",
      args: [to, parsedAmount],
    });
  };

  return { mint, isPending, isConfirming, isSuccess, error, hash, reset };
}

export function formatUSDC(value: bigint | undefined): string {
  if (value === undefined || value === null) return "0.00";
  const formatted = formatUnits(value, 6);
  const num = parseFloat(formatted);
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatScore(value: bigint | undefined): string {
  if (value === undefined || value === null) return "0";
  const num = Number(value) / 1e6;
  const prefix = num >= 0 ? "+" : "";
  return prefix + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function isDepositPhase(epochStartTime: bigint | undefined, depositPhaseDuration: bigint | undefined): boolean {
  if (!epochStartTime || !depositPhaseDuration) return false;
  const now = BigInt(Math.floor(Date.now() / 1000));
  return now < epochStartTime + depositPhaseDuration;
}
