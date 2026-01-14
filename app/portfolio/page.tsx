"use client"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Wallet, TrendingUp, History, DollarSign, Download, Upload, Loader2, AlertCircle, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import Link from "next/link"
import {
  useCurrentEpoch,
  useWarriorInfo,
  useUSDCBalance,
  useAllClanTVLs,
  useStakeInk,
  useWithdrawInk,
  useApproveUSDC,
  useUSDCAllowance,
  useMintUSDC,
  useEpochStartTime,
  useDepositPhaseDuration,
  useTimeUntilCanvasClears,
  formatUSDC,
  formatScore,
  isDepositPhase,
  Clan,
  CLAN_NAMES,
} from "@/hooks/useContract"
import { parseUnits } from "viem"

const CLAN_IMAGES: Record<Clan, string> = {
  [Clan.NONE]: "/placeholder.svg",
  [Clan.SHADOW]: "/images/kage-shadow.jpg",
  [Clan.BLADE]: "/images/steel-blade.jpg",
  [Clan.SPIRIT]: "/images/ghost-spirit.jpg",
  [Clan.PILLAR]: "/images/monk-pillar.jpg",
  [Clan.WIND]: "/images/wind-arrow.jpg",
}

const CLAN_SUBTITLES: Record<Clan, string> = {
  [Clan.NONE]: "",
  [Clan.SHADOW]: "The Kage",
  [Clan.BLADE]: "The Steel",
  [Clan.SPIRIT]: "The Ghost",
  [Clan.PILLAR]: "The Monk",
  [Clan.WIND]: "The Arrow",
}

function formatTimeRemaining(seconds: bigint | undefined): string {
  if (!seconds) return "..."
  const s = Number(seconds)
  if (s <= 0) return "Ended"
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h ${minutes}m`
}

export default function PortfolioPage() {
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [pendingStakeAmount, setPendingStakeAmount] = useState<string | null>(null)

  const { authenticated, user, login, ready } = usePrivy()
  const walletAddress = user?.wallet?.address as `0x${string}` | undefined

  const { data: currentEpoch } = useCurrentEpoch()
  const { data: warriorInfo, refetch: refetchWarrior } = useWarriorInfo(walletAddress)
  const { data: usdcBalance, refetch: refetchBalance } = useUSDCBalance(walletAddress)
  const { data: clanTVLs, refetch: refetchTVLs } = useAllClanTVLs()
  const { data: allowance, refetch: refetchAllowance } = useUSDCAllowance(walletAddress)
  const { data: epochStartTime } = useEpochStartTime()
  const { data: depositPhaseDuration } = useDepositPhaseDuration()
  const { data: timeRemaining } = useTimeUntilCanvasClears()

  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: approveSuccess, reset: resetApprove } = useApproveUSDC()
  const { stakeInk, isPending: isStaking, isConfirming: isStakeConfirming, isSuccess: stakeSuccess, reset: resetStake } = useStakeInk()
  const { withdrawInk, isPending: isWithdrawing, isConfirming: isWithdrawConfirming, isSuccess: withdrawSuccess, reset: resetWithdraw } = useWithdrawInk()
  const { mint, isPending: isMinting, isConfirming: isMintConfirming, isSuccess: mintSuccess, reset: resetMint } = useMintUSDC()

  const inDepositPhase = isDepositPhase(epochStartTime, depositPhaseDuration)

  useEffect(() => {
    if (approveSuccess && pendingStakeAmount) {
      const performStakeAfterApproval = async () => {
        // Wait for blockchain state to update (important for RPC nodes to sync)
        await new Promise(resolve => setTimeout(resolve, 2500))
        
        // Refetch allowance to verify approval was successful
        const { data: newAllowance } = await refetchAllowance()
        
        const requiredAmount = parseUnits(pendingStakeAmount, 6)
        
        // Verify allowance is sufficient before staking
        if (newAllowance && newAllowance >= requiredAmount) {
          resetApprove()
          stakeInk(pendingStakeAmount)
        } else {
          console.error("Allowance verification failed after approval. Please try again.")
          resetApprove()
        }
        setPendingStakeAmount(null)
      }
      
      performStakeAfterApproval()
    }
  }, [approveSuccess, pendingStakeAmount])

  useEffect(() => {
    if (stakeSuccess) {
      refetchBalance()
      refetchWarrior()
      refetchTVLs()
      refetchAllowance()
      resetStake()
      setDepositAmount("")
    }
  }, [stakeSuccess])

  useEffect(() => {
    if (withdrawSuccess) {
      refetchBalance()
      refetchWarrior()
      refetchTVLs()
      resetWithdraw()
      setWithdrawAmount("")
    }
  }, [withdrawSuccess])

  useEffect(() => {
    if (mintSuccess) {
      refetchBalance()
      resetMint()
    }
  }, [mintSuccess])

  useEffect(() => {
    if (walletAddress) {
      refetchAllowance()
      refetchBalance()
    }
  }, [walletAddress])

  const userClan = warriorInfo ? Number(warriorInfo[1]) as Clan : Clan.NONE
  const userStake = warriorInfo ? warriorInfo[0] : BigInt(0)
  const userScore = warriorInfo ? warriorInfo[3] : BigInt(0)
  const epochJoined = warriorInfo ? Number(warriorInfo[2]) : 0

  const hasAllowance = (() => {
    if (!allowance || !depositAmount) return false
    try {
      const amount = parseFloat(depositAmount)
      if (isNaN(amount) || amount <= 0) return false
      return allowance >= parseUnits(depositAmount, 6)
    } catch {
      return false
    }
  })()

  const getClanTVL = (clan: Clan) => {
    if (!clanTVLs || clan === Clan.NONE) return BigInt(0)
    return clanTVLs[clan - 1]
  }

  const getStakePercentage = () => {
    const clanTVL = getClanTVL(userClan)
    if (clanTVL === BigInt(0) || userStake === BigInt(0)) return "0"
    return ((Number(userStake) / Number(clanTVL)) * 100).toFixed(1)
  }

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return
    
    // Always refresh allowance before checking to ensure we have fresh data
    const { data: freshAllowance } = await refetchAllowance()
    
    const requiredAmount = parseUnits(depositAmount, 6)
    
    // Check with fresh allowance data
    if (freshAllowance && freshAllowance >= requiredAmount) {
      // Already has sufficient allowance, directly stake
      stakeInk(depositAmount)
    } else {
      // Need approval first (unlimited), then stake after approval success
      setPendingStakeAmount(depositAmount)
      approve() // Unlimited approval - no amount needed
    }
  }

  const handleWithdraw = () => {
    if (!withdrawAmount) return
    withdrawInk(withdrawAmount)
  }

  const handleMint = () => {
    if (!walletAddress) return
    mint(walletAddress, "10000")
  }

  if (!ready) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-20">
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-20">
          <div className="flex min-h-[60vh] flex-col items-center justify-center">
            <h1 className="mb-4 font-mono text-4xl font-black tracking-tighter md:text-6xl">PORTFOLIO</h1>
            <p className="mb-8 text-lg text-muted-foreground">Connect your wallet to view your portfolio</p>
            <Button size="lg" className="font-mono" onClick={login}>
              CONNECT WALLET
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="mb-12">
          <h1 className="mb-4 font-mono text-4xl font-black tracking-tighter md:text-6xl">PORTFOLIO</h1>
          <p className="text-lg text-muted-foreground">Manage your deposits, track rewards, and monitor performance</p>
        </div>

        <Card className="mb-8 border border-dashed border-yellow-500/50 bg-yellow-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-500">Testnet Mode - Get free USDC for testing</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="font-mono text-xs border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
              onClick={handleMint}
              disabled={isMinting || isMintConfirming}
            >
              {isMinting || isMintConfirming ? (
                <><Loader2 className="mr-2 h-3 w-3 animate-spin" />MINTING...</>
              ) : (
                "MINT 10,000 USDC"
              )}
            </Button>
          </div>
        </Card>

        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Card className="border-2 border-border p-6">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="font-mono text-xs">YOUR STAKE</span>
            </div>
            <div className="font-mono text-3xl font-black">${formatUSDC(userStake)}</div>
            <div className="mt-1 text-xs text-muted-foreground">USDC Staked</div>
          </Card>

          <Card className="border-2 border-border p-6">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="font-mono text-xs">WALLET BALANCE</span>
            </div>
            <div className="font-mono text-3xl font-black">${usdcBalance ? formatUSDC(usdcBalance) : "0.00"}</div>
            <div className="mt-1 text-xs text-muted-foreground">Available USDC</div>
          </Card>

          <Card className="border-2 border-border p-6">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="font-mono text-xs">CURRENT SCORE</span>
            </div>
            <div className={`font-mono text-3xl font-black ${Number(userScore) >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatScore(userScore)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{userClan !== Clan.NONE ? CLAN_NAMES[userClan] : "No Clan"}</div>
          </Card>

          <Card className="border-2 border-border p-6">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-xs">EPOCH STATUS</span>
            </div>
            <div className="font-mono text-2xl font-black">#{currentEpoch?.toString() || "-"}</div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={inDepositPhase ? "default" : "secondary"} className="text-xs">
                {inDepositPhase ? "DEPOSIT" : "LOCKED"}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatTimeRemaining(timeRemaining)}</span>
            </div>
          </Card>
        </div>

        {userClan !== Clan.NONE && (
          <div className="mb-8">
            <h2 className="mb-4 font-mono text-2xl font-black">YOUR CLAN</h2>
            <Card className="border-2 border-primary/50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden border-2 border-border">
                    <img
                      src={CLAN_IMAGES[userClan]}
                      alt={CLAN_NAMES[userClan]}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-mono text-lg font-bold">{CLAN_NAMES[userClan]}</h3>
                    <p className="text-sm text-muted-foreground">{CLAN_SUBTITLES[userClan]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold">${formatUSDC(userStake)}</div>
                  <div className="text-sm text-muted-foreground">{getStakePercentage()}% of clan TVL</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Joined Epoch</div>
                  <div className="font-mono font-bold">#{epochJoined}</div>
                </div>
                <Badge className="font-mono" variant="outline">
                  ACTIVE
                </Badge>
              </div>
            </Card>
          </div>
        )}

        {userClan === Clan.NONE && (
          <Card className="mb-8 border-2 border-dashed border-border p-12 text-center">
            <h3 className="mb-4 font-mono text-xl font-bold">NO CLAN SELECTED</h3>
            <p className="mb-6 text-muted-foreground">Join a clan in the Arena to start earning yield</p>
            <Link href="/arena">
              <Button className="font-mono">GO TO ARENA</Button>
            </Link>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-2 border-border p-6">
            <h2 className="mb-4 font-mono text-xl font-black">DEPOSIT USDC</h2>

            {!inDepositPhase && (
              <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3">
                <p className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  Deposit phase has ended. Wait for next epoch.
                </p>
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="font-mono text-lg pr-16"
                  disabled={userClan === Clan.NONE || !inDepositPhase}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                  USDC
                </div>
              </div>
            </div>
            <div className="mb-4 flex gap-2">
              {["100", "500", "1000", "MAX"].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  className="flex-1 font-mono text-xs bg-transparent"
                  disabled={userClan === Clan.NONE || !inDepositPhase}
                  onClick={() => {
                    if (amount === "MAX" && usdcBalance) {
                      setDepositAmount(formatUSDC(usdcBalance).replace(/,/g, ""))
                    } else {
                      setDepositAmount(amount)
                    }
                  }}
                >
                  {amount}
                </Button>
              ))}
            </div>

            <div className="mb-4 text-xs text-muted-foreground">
              Allowance: <span className={hasAllowance ? "text-green-500" : "text-yellow-500"}>
                {hasAllowance ? "Approved" : "Needs Approval"}
              </span>
            </div>

            <Button
              className="w-full font-mono"
              onClick={handleDeposit}
              disabled={userClan === Clan.NONE || !inDepositPhase || !depositAmount || parseFloat(depositAmount) <= 0 || isApproving || isApproveConfirming || isStaking || isStakeConfirming}
            >
              {(isApproving || isApproveConfirming || isStaking || isStakeConfirming) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isApproving && !isApproveConfirming && !isStaking && !isStakeConfirming && <Upload className="mr-2 h-4 w-4" />}
              {isApproving || isApproveConfirming ? "APPROVING..." : isStaking || isStakeConfirming ? "DEPOSITING..." : !hasAllowance && depositAmount ? "APPROVE USDC" : "DEPOSIT"}
            </Button>
            {userClan === Clan.NONE && (
              <p className="mt-2 text-center text-xs text-muted-foreground">Join a clan first to deposit</p>
            )}
          </Card>

          <Card className="border-2 border-border p-6">
            <h2 className="mb-4 font-mono text-xl font-black">WITHDRAW USDC</h2>

            {!inDepositPhase && (
              <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3">
                <p className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  Withdrawals only during Deposit Phase (first 2 days)
                </p>
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="font-mono text-lg pr-16"
                  disabled={userStake === BigInt(0) || !inDepositPhase}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                  USDC
                </div>
              </div>
            </div>
            <div className="mb-4 flex gap-2">
              {["25%", "50%", "75%", "MAX"].map((percent) => (
                <Button
                  key={percent}
                  variant="outline"
                  size="sm"
                  className="flex-1 font-mono text-xs bg-transparent"
                  disabled={userStake === BigInt(0) || !inDepositPhase}
                  onClick={() => {
                    const stake = Number(userStake) / 1e6
                    if (percent === "MAX") {
                      setWithdrawAmount(stake.toString())
                    } else {
                      const pct = parseInt(percent) / 100
                      setWithdrawAmount((stake * pct).toFixed(2))
                    }
                  }}
                >
                  {percent}
                </Button>
              ))}
            </div>

            <div className="mb-4 text-xs text-muted-foreground">
              Available to withdraw: <span className="font-bold">{formatUSDC(userStake)} USDC</span>
            </div>

            <Button
              variant="outline"
              className="w-full font-mono bg-transparent"
              onClick={handleWithdraw}
              disabled={userStake === BigInt(0) || !inDepositPhase || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || isWithdrawing || isWithdrawConfirming}
            >
              {(isWithdrawing || isWithdrawConfirming) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isWithdrawing && !isWithdrawConfirming && <Download className="mr-2 h-4 w-4" />}
              {isWithdrawing || isWithdrawConfirming ? "WITHDRAWING..." : "WITHDRAW"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
