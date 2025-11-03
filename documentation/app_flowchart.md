flowchart TD
    Start[User opens app]
    WalletConnect[Connect wallet via RainbowKit]
    MoodInput[Select mood gesture]
    SubmitMood[Submit mood to backend]
    StoreMood[Log mood in PostgreSQL]
    StreakCalc[Calculate user streak]
    Milestone{Streak milestone reached}
    MintNFT[Mint NFT badge via Alchemy]
    SkipMint[No NFT minted]
    Leaderboard[Fetch leaderboard from Redis]
    Dashboard[Render dashboard with chart and leaderboard]
    Frame[Generate Farcaster Frame OG image]
    End[End]

    Start --> WalletConnect
    WalletConnect --> MoodInput
    MoodInput --> SubmitMood
    SubmitMood --> StoreMood
    StoreMood --> StreakCalc
    StreakCalc --> Milestone
    Milestone -- Yes --> MintNFT
    Milestone -- No --> SkipMint
    MintNFT --> Leaderboard
    SkipMint --> Leaderboard
    Leaderboard --> Dashboard
    Dashboard --> Frame
    Frame --> End