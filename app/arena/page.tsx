"use client"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Swords, ShieldIcon, Target, ChevronRight, Loader2, AlertCircle, Clock, Coins } from "lucide-react"
import { usePrivy } from "@privy-io/react-auth"
import {
  useCurrentEpoch,
  useTimeUntilCanvasClears,
  useAllClanTVLs,
  useAllScores,
  useTotalTVL,
  useWarriorInfo,
  useUSDCBalance,
  useUSDCAllowance,
  useApproveUSDC,
  useJoinClan,
  useStakeInk,
  useWithdrawInk,
  useMintUSDC,
  useClearCanvas,
  useEpochStartTime,
  useDepositPhaseDuration,
  useEpochDuration,
  formatUSDC,
  formatScore,
  isDepositPhase,
  Clan,
  CLAN_NAMES,
} from "@/hooks/useContract"
import { parseUnits } from "viem"

const factions = [
  {
    id: Clan.SHADOW,
    name: "SHADOW",
    subtitle: "The Kage",
    description: "Assassin who merges with shadows, striking from darkness",
    image: "/images/kage-shadow.jpg",
    defeats: ["Spirit", "Wind"],
    defeatedBy: ["Blade", "Pillar"],
  },
  {
    id: Clan.BLADE,
    name: "BLADE",
    subtitle: "The Steel",
    description: "Samurai with colossal blade that cuts through anything",
    image: "/images/steel-blade.jpg",
    defeats: ["Shadow", "Pillar"],
    defeatedBy: ["Spirit", "Wind"],
  },
  {
    id: Clan.SPIRIT,
    name: "SPIRIT",
    subtitle: "The Ghost",
    description: "Invisible entity that attacks the mind and soul",
    image: "/images/ghost-spirit.jpg",
    defeats: ["Blade", "Pillar"],
    defeatedBy: ["Shadow", "Wind"],
  },
  {
    id: Clan.PILLAR,
    name: "PILLAR",
    subtitle: "The Monk",
    description: "Absolute defense with extraordinary physical strength",
    image: "/images/monk-pillar.jpg",
    defeats: ["Wind", "Shadow"],
    defeatedBy: ["Blade", "Spirit"],
  },
  {
    id: Clan.WIND,
    name: "WIND",
    subtitle: "The Arrow",
    description: "Archer striking from invisible distances with deadly precision",
    image: "/images/wind-arrow.jpg",
    defeats: ["Spirit", "Blade"],
    defeatedBy: ["Pillar", "Shadow"],
  },
]

function formatTimeRemaining(seconds: bigint | undefined): string {
  if (!seconds) return "Loading..."
  const s = Number(seconds)
  if (s <= 0) return "Epoch Ended"
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  return `${hours}h ${minutes}m`
}

export default function ArenaPage() {
  const [selectedFaction, setSelectedFaction] = useState<Clan | null>(null)
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isDepositing, setIsDepositing] = useState(true)
  const [actionStep, setActionStep] = useState<"idle" | "joining" | "approving" | "staking" | "withdrawing">("idle")
  const [pendingStakeAmount, setPendingStakeAmount] = useState<string | null>(null)

  const { authenticated, user, login, ready } = usePrivy()
  const walletAddress = user?.wallet?.address as `0x${string}` | undefined

  const { data: currentEpoch, refetch: refetchEpoch } = useCurrentEpoch()
  const { data: timeRemaining, refetch: refetchTime } = useTimeUntilCanvasClears()
  const { data: clanTVLs, refetch: refetchTVLs } = useAllClanTVLs()
  const { data: scores, refetch: refetchScores } = useAllScores()
  const { data: totalTVL, refetch: refetchTotalTVL } = useTotalTVL()
  const { data: warriorInfo, refetch: refetchWarrior } = useWarriorInfo(walletAddress)
  const { data: usdcBalance, refetch: refetchBalance } = useUSDCBalance(walletAddress)
  const { data: allowance, refetch: refetchAllowance } = useUSDCAllowance(walletAddress)
  const { data: epochStartTime, refetch: refetchEpochStart } = useEpochStartTime()
  const { data: depositPhaseDuration } = useDepositPhaseDuration()
  const { data: epochDuration } = useEpochDuration()

  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: approveSuccess, reset: resetApprove } = useApproveUSDC()
  const { joinClan, isPending: isJoining, isConfirming: isJoinConfirming, isSuccess: joinSuccess, reset: resetJoin } = useJoinClan()
  const { stakeInk, isPending: isStaking, isConfirming: isStakeConfirming, isSuccess: stakeSuccess, reset: resetStake } = useStakeInk()
  const { withdrawInk, isPending: isWithdrawing, isConfirming: isWithdrawConfirming, isSuccess: withdrawSuccess, reset: resetWithdraw } = useWithdrawInk()
  const { mint, isPending: isMinting, isConfirming: isMintConfirming, isSuccess: mintSuccess, reset: resetMint } = useMintUSDC()
  const { clearCanvas, isPending: isClearing, isConfirming: isClearConfirming, isSuccess: clearSuccess, reset: resetClear } = useClearCanvas()

  const inDepositPhase = isDepositPhase(epochStartTime, depositPhaseDuration)
  
  // Check if epoch has ended and can be cleared
  const canClearCanvas = (() => {
    if (!epochStartTime || !epochDuration) return false
    const now = BigInt(Math.floor(Date.now() / 1000))
    return now >= epochStartTime + epochDuration
  })()

  useEffect(() => {
    if (joinSuccess) {
      refetchWarrior()
      resetJoin()
      setActionStep("idle")
    }
  }, [joinSuccess])

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
          setActionStep("staking")
          stakeInk(pendingStakeAmount)
        } else {
          console.error("Allowance verification failed after approval. Please try again.")
          resetApprove()
          setActionStep("idle")
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
      refetchScores()
      refetchTotalTVL()
      refetchAllowance()
      resetStake()
      setDepositAmount("")
      setActionStep("idle")
    }
  }, [stakeSuccess])

  useEffect(() => {
    if (withdrawSuccess) {
      refetchBalance()
      refetchWarrior()
      refetchTVLs()
      refetchScores()
      refetchTotalTVL()
      resetWithdraw()
      setWithdrawAmount("")
      setActionStep("idle")
    }
  }, [withdrawSuccess])

  useEffect(() => {
    if (mintSuccess) {
      refetchBalance()
      resetMint()
    }
  }, [mintSuccess])

  useEffect(() => {
    if (clearSuccess) {
      refetchEpoch()
      refetchEpochStart()
      refetchTime()
      refetchTVLs()
      refetchScores()
      resetClear()
    }
  }, [clearSuccess])

  useEffect(() => {
    const interval = setInterval(() => {
      refetchTime()
      refetchTVLs()
      refetchScores()
      if (walletAddress) {
        refetchAllowance()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [walletAddress])

  useEffect(() => {
    if (walletAddress) {
      refetchAllowance()
      refetchBalance()
    }
  }, [walletAddress])

  const selected = factions.find((f) => f.id === selectedFaction)
  const userClan = warriorInfo ? Number(warriorInfo[1]) as Clan : Clan.NONE
  const userStake = warriorInfo ? warriorInfo[0] : BigInt(0)
  const userScore = warriorInfo ? warriorInfo[3] : BigInt(0)

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

  const handleAction = async () => {
    if (!authenticated) {
      login()
      return
    }

    if (!selectedFaction) return

    if (userClan === Clan.NONE) {
      setActionStep("joining")
      joinClan(selectedFaction)
      return
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) return

    // Always refresh allowance before checking to ensure we have fresh data
    const { data: freshAllowance } = await refetchAllowance()
    
    const requiredAmount = parseUnits(depositAmount, 6)
    
    // Check with fresh allowance data
    if (freshAllowance && freshAllowance >= requiredAmount) {
      // Already has sufficient allowance, directly stake
      setActionStep("staking")
      stakeInk(depositAmount)
    } else {
      // Need approval first (unlimited), then stake after approval
      setActionStep("approving")
      setPendingStakeAmount(depositAmount)
      approve() // Unlimited approval - no amount needed
    }
  }

  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return
    setActionStep("withdrawing")
    withdrawInk(withdrawAmount)
  }

  const handleMint = () => {
    if (!walletAddress) return
    mint(walletAddress, "10000")
  }

  const getButtonText = () => {
    if (!authenticated) return "CONNECT WALLET"
    if (!selectedFaction) return "SELECT A FACTION"
    
    if (userClan === Clan.NONE) {
      if (isJoining || isJoinConfirming) return "JOINING CLAN..."
      return `JOIN ${selected?.name}`
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      return "ENTER AMOUNT"
    }

    if (!hasAllowance) {
      if (isApproving || isApproveConfirming) return "APPROVING..."
      return "APPROVE USDC"
    }

    if (isStaking || isStakeConfirming) return "STAKING..."
    return `STAKE ${depositAmount} USDC`
  }

  const isButtonDisabled = () => {
    if (!authenticated) return false
    if (!selectedFaction) return true
    if (userClan === Clan.NONE) return isJoining || isJoinConfirming
    if (!depositAmount || parseFloat(depositAmount) <= 0) return true
    if (!inDepositPhase) return true
    return isApproving || isApproveConfirming || isStaking || isStakeConfirming
  }

  const isLoading = isJoining || isJoinConfirming || isApproving || isApproveConfirming || isStaking || isStakeConfirming

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="mb-12 text-center">
          <h1 className="mb-4 font-mono text-4xl font-black tracking-tighter md:text-6xl">THE ARENA</h1>
          <p className="text-lg text-muted-foreground">Choose your faction. Deploy your USDC. Battle for yield.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 font-mono text-sm">
            <Badge variant="outline" className="px-4 py-2">
              <span className="text-muted-foreground">Epoch:</span>
              <span className="ml-2 font-bold">#{currentEpoch?.toString() || "..."}</span>
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <Clock className="mr-1 h-3 w-3" />
              <span className="text-muted-foreground">Ends in:</span>
              <span className="ml-2 font-bold">{formatTimeRemaining(timeRemaining)}</span>
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <Coins className="mr-1 h-3 w-3" />
              <span className="text-muted-foreground">TVL:</span>
              <span className="ml-2 font-bold">${totalTVL ? formatUSDC(totalTVL) : "0.00"}</span>
            </Badge>
            <Badge variant={inDepositPhase ? "default" : "destructive"} className="px-4 py-2">
              {inDepositPhase ? "DEPOSIT PHASE" : "LOCKED PHASE"}
            </Badge>
          </div>
        </div>

        {authenticated && userClan !== Clan.NONE && (
          <Card className="mb-8 border-2 border-primary/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  <span className="text-muted-foreground">Your Clan: </span>
                  <span className="font-mono font-bold text-primary">{CLAN_NAMES[userClan]}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Staked: </span>
                  <span className="font-mono font-bold">${formatUSDC(userStake)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Score: </span>
                  <span className={`font-mono font-bold ${Number(userScore) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatScore(userScore)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {authenticated && (
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
        )}

        {canClearCanvas && (
          <Card className="mb-8 border-2 border-green-500/50 bg-green-500/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono font-bold text-green-500">EPOCH ENDED!</p>
                <p className="text-sm text-muted-foreground">Clear the canvas to start a new epoch and distribute rewards</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="font-mono text-xs border-green-500/50 text-green-500 hover:bg-green-500/10"
                onClick={() => clearCanvas()}
                disabled={isClearing || isClearConfirming}
              >
                {isClearing || isClearConfirming ? (
                  <><Loader2 className="mr-2 h-3 w-3 animate-spin" />CLEARING...</>
                ) : (
                  "CLEAR CANVAS"
                )}
              </Button>
            </div>
          </Card>
        )}

        <div className="mb-12">
          <h2 className="mb-6 font-mono text-2xl font-black">SELECT YOUR FACTION</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {factions.map((faction, index) => {
              const tvl = clanTVLs ? clanTVLs[index] : BigInt(0)
              const score = scores ? scores[index] : BigInt(0)

              return (
                <Card
                  key={faction.id}
                  className={`group cursor-pointer overflow-hidden border-2 transition-all ${
                    selectedFaction === faction.id
                      ? "border-foreground shadow-lg ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : userClan === faction.id
                      ? "border-primary/50"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => setSelectedFaction(faction.id)}
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={faction.image || "/placeholder.svg"}
                      alt={faction.name}
                      className={`h-full w-full object-cover transition-transform ${
                        selectedFaction === faction.id ? "scale-105" : "group-hover:scale-110"
                      }`}
                    />
                    {userClan === faction.id && (
                      <div className="absolute top-2 right-2">
                        <Badge className="font-mono text-xs">YOUR CLAN</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 font-mono text-lg font-bold">{faction.name}</h3>
                    <p className="mb-3 text-xs text-muted-foreground">{faction.subtitle}</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">TVL:</span>
                        <span className="font-mono font-bold">${formatUSDC(tvl)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Score:</span>
                        <span className={`font-mono font-bold ${Number(score) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatScore(score)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {selected && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-2 border-border p-6">
              <div className="mb-6 flex items-start gap-4">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden border-2 border-border">
                  <img
                    src={selected.image || "/placeholder.svg"}
                    alt={selected.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="mb-1 font-mono text-2xl font-black">{selected.name}</h3>
                  <p className="mb-2 text-sm text-muted-foreground">{selected.subtitle}</p>
                  <p className="text-sm">{selected.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded border border-border bg-muted/50 p-4">
                  <div className="mb-2 flex items-center gap-2 font-mono text-sm font-bold">
                    <Swords className="h-4 w-4" />
                    DEFEATS
                  </div>
                  <ul className="space-y-1 text-sm">
                    {selected.defeats.map((defeat) => (
                      <li key={defeat} className="flex items-center gap-2 text-green-500">
                        <ChevronRight className="h-3 w-3" />
                        {defeat}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded border border-border bg-muted/50 p-4">
                  <div className="mb-2 flex items-center gap-2 font-mono text-sm font-bold">
                    <Target className="h-4 w-4" />
                    DEFEATED BY
                  </div>
                  <ul className="space-y-1 text-sm">
                    {selected.defeatedBy.map((defeatedBy) => (
                      <li key={defeatedBy} className="flex items-center gap-2 text-red-500">
                        <ChevronRight className="h-3 w-3" />
                        {defeatedBy}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="border-2 border-border p-6">
              {userClan !== Clan.NONE && (
                <div className="mb-4 flex gap-2">
                  <Button
                    variant={isDepositing ? "default" : "outline"}
                    className="flex-1 font-mono text-xs"
                    onClick={() => setIsDepositing(true)}
                  >
                    DEPOSIT
                  </Button>
                  <Button
                    variant={!isDepositing ? "default" : "outline"}
                    className="flex-1 font-mono text-xs"
                    onClick={() => setIsDepositing(false)}
                    disabled={userStake === BigInt(0)}
                  >
                    WITHDRAW
                  </Button>
                </div>
              )}

              {(isDepositing || userClan === Clan.NONE) ? (
                <>
                  <h3 className="mb-6 font-mono text-xl font-black">
                    {userClan === Clan.NONE ? "JOIN FACTION" : "STAKE USDC"}
                  </h3>

                  {userClan === Clan.NONE ? (
                    <div className="mb-6 rounded border border-border bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground">
                        Join the <span className="font-bold text-foreground">{selected.name}</span> faction to start staking and earning yield.
                        Once joined, you can deposit USDC to participate in the battle.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 space-y-4">
                        <div>
                          <label className="mb-2 block font-mono text-sm font-bold">STAKE AMOUNT</label>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              className="font-mono text-lg pr-16"
                              disabled={!inDepositPhase}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                              USDC
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {["100", "500", "1000", "MAX"].map((amount) => (
                            <Button
                              key={amount}
                              variant="outline"
                              size="sm"
                              className="flex-1 font-mono text-xs bg-transparent"
                              disabled={!inDepositPhase}
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
                      </div>

                      {!inDepositPhase && (
                        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3">
                          <p className="flex items-center gap-2 text-sm text-red-500">
                            <AlertCircle className="h-4 w-4" />
                            Deposit phase has ended. Wait for next epoch to stake.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="mb-6 space-y-3 rounded border border-border bg-muted/50 p-4 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wallet Balance:</span>
                      <span className="font-bold">{usdcBalance ? formatUSDC(usdcBalance) : "0.00"} USDC</span>
                    </div>
                    {userClan !== Clan.NONE && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Stake:</span>
                          <span className="font-bold">{formatUSDC(userStake)} USDC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Allowance:</span>
                          <span className={`font-bold ${hasAllowance ? "text-green-500" : "text-yellow-500"}`}>
                            {hasAllowance ? "Approved" : "Needs Approval"}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk:</span>
                      <span className="font-bold text-green-500">0% (Principal Safe)</span>
                    </div>
                  </div>

                  <Button
                    className="w-full font-mono"
                    size="lg"
                    onClick={handleAction}
                    disabled={isButtonDisabled()}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {!isLoading && <ShieldIcon className="mr-2 h-4 w-4" />}
                    {getButtonText()}
                  </Button>

                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    {userClan === Clan.NONE
                      ? "Join a clan to start participating in the yield battle"
                      : "Your USDC generates yield. Winning clan takes all."}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mb-6 font-mono text-xl font-black">WITHDRAW USDC</h3>
                  
                  {!inDepositPhase && (
                    <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3">
                      <p className="flex items-center gap-2 text-sm text-red-500">
                        <AlertCircle className="h-4 w-4" />
                        Withdrawals only available during Deposit Phase (first 2 days)
                      </p>
                    </div>
                  )}

                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="mb-2 block font-mono text-sm font-bold">WITHDRAW AMOUNT</label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="font-mono text-lg pr-16"
                          disabled={!inDepositPhase || userStake === BigInt(0)}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                          USDC
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {["25%", "50%", "75%", "MAX"].map((percent) => (
                        <Button
                          key={percent}
                          variant="outline"
                          size="sm"
                          className="flex-1 font-mono text-xs bg-transparent"
                          disabled={!inDepositPhase || userStake === BigInt(0)}
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
                  </div>

                  <div className="mb-6 space-y-3 rounded border border-border bg-muted/50 p-4 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Your Stake:</span>
                      <span className="font-bold">{formatUSDC(userStake)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Withdrawing:</span>
                      <span className="font-bold">{withdrawAmount || "0.00"} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className="font-bold">
                        {(Number(userStake) / 1e6 - parseFloat(withdrawAmount || "0")).toFixed(2)} USDC
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full font-mono"
                    size="lg"
                    onClick={handleWithdraw}
                    disabled={!inDepositPhase || isWithdrawing || isWithdrawConfirming || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  >
                    {(isWithdrawing || isWithdrawConfirming) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isWithdrawing || isWithdrawConfirming ? "WITHDRAWING..." : `WITHDRAW ${withdrawAmount || "0"} USDC`}
                  </Button>
                </>
              )}
            </Card>
          </div>
        )}

        {!selected && (
          <Card className="border-2 border-dashed border-border p-12 text-center">
            <p className="font-mono text-muted-foreground">
              Select a faction above to view details and deploy your USDC
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
