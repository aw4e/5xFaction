# KALI-YUGA: THE LAST INK

**KALI-YUGA** is a revolutionary no-loss DeFi protocol built on **Arbitrum** that transforms yield farming into an epic strategic battle. Enter the ultimate arena where five legendary factions battle for yield dominance.

> **Pure Strategy. No Luck. Just Skill.**

## 🌌 The Concept

Unlike traditional gambling or trading, your principal (deposited USDC) remains **100% safe** at all times. All deposits are routed to **Aave V3** to generate yield. The "battle" is for this generated yield.

Players choose one of five factions to back. At the end of every 24-hour epoch, the winning faction—determined by the **Pentagon Nash Equilibrium**—takes 100% of the yield pot.

## ⚔️ The Five Factions

The arena is governed by a cycle of five elements, each defeating two others and being defeated by two others:

| Faction | Element | Role | Archetype |
|:---:|:---:|:---:|:---:|
| **KAGE** | Shadow | Assassin | *The Neon Syndicate* |
| **STEEL** | Blade | Samurai | *The Iron Path* |
| **GHOST** | Spirit | Phantom | *The Ethereal Order* |
| **MONK** | Pillar | Guardian | *The Mountain Sect* |
| **WIND** | Arrow | Marksman | *The Sky Covenant* |

## 📐 Game Mechanics: Pentagon Nash Equilibrium

Victory is not random. It is calculated.

**Score = (Target TVL) - (Predator TVL)**

-   **Target TVL**: Total Value Locked in the two factions your faction *defeats*.
-   **Predator TVL**: Total Value Locked in the two factions that *defeat* your faction.

This creates a dynamic metagame where the strongest faction can become the most vulnerable if its predators grow too large.

## 🛠️ Technology Stack

This project is built with a modern, performance-first stack:

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Animations**: CSS Animations & Transitions

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+
-   npm, yarn, or pnpm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/kali-yuga.git
    cd kali-yuga
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Open the app**
    Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## 📂 Project Structure

```
kali-yuga/
├── app/                  # Next.js App Router
│   ├── arena/            # Arena / Betting Page
│   ├── docs/             # Documentation Page
│   ├── home/             # Landing Page
│   ├── portfolio/        # User Dashboard
│   ├── layout.tsx        # Root Layout
│   └── globals.css       # Global Styles
├── components/           # React Components
│   ├── ui/               # Reusable UI components (buttons, cards, etc.)
│   ├── faction-showcase.tsx # Hero interaction component
│   └── navigation.tsx    # Main navbar
└── public/               # Static assets
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*“Enter the cycle. Break the wheel. Claim the ink.”*
