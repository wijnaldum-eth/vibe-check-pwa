# Farcaster Integration Documentation

## Overview

This document describes the Farcaster social graph sentiment analysis features added to the Vibe Check PWA. The integration includes:

- **Farcaster Social Graph**: Fetch and analyze user connections via Neynar API
- **Network Sentiment**: Calculate sentiment across user networks
- **Leaderboard System**: Ranked competitions with Redis caching
- **Referral System**: Unlock features through user referrals
- **Background Jobs**: Automated updates and synchronization

## Features

### 1. Farcaster Social Graph Integration

**Purpose**: Connect users' Farcaster profiles and analyze sentiment across their social networks.

**Key Components**:
- **Database Schema**: Extended with Farcaster profile and social connection tables
- **Neynar API Integration**: Fetch followers/following data
- **Social Graph Analysis**: Calculate network-wide sentiment

**API Endpoints**:
```typescript
// Get user's social graph
GET /api/trpc/getUserSocialGraph

// Sync social graph from Neynar
POST /api/trpc/syncSocialGraphFromNeynar
```

**Database Tables**:
- `farcaster_profile`: User Farcaster profile data
- `social_connection`: Following/follower relationships

### 2. Network Sentiment Analysis

**Purpose**: Calculate sentiment percentages across networks and provide access controls.

**Features**:
- **Global Sentiment**: Sentiment across all users
- **Network-Specific**: Sentiment within user's social graph
- **Access Control**: Full access requires 3 referrals
- **Real-time Updates**: Cached in Redis for performance

**API Endpoints**:
```typescript
// Get network sentiment (access-controlled)
GET /api/trpc/getNetworkSentiment
```

**Access Levels**:
- **Limited Access**: Users with < 3 referrals see basic data
- **Full Access**: Users with ≥ 3 referrals see complete network analysis

### 3. Leaderboard System

**Purpose**: Rank users by streak metrics and create competitive engagement.

**Categories**:
- **Current Streak**: Active daily check-ins
- **Longest Streak**: Best streak achieved
- **Total Check-ins**: All-time participation

**Features**:
- **Redis Caching**: Fast leaderboard queries
- **Real-time Rankings**: Automatic score calculation
- **Farcaster Integration**: Display user profiles and FIDs
- **DataTable UI**: Sortable, filterable interface

**Database Tables**:
- `leaderboard_entry`: Cached leaderboard data
- `user_streak`: User streak information

### 4. Referral System

**Purpose**: Drive user growth and unlock premium features through referrals.

**Features**:
- **Invite Codes**: Generate unique referral codes
- **Tracking**: Monitor referral status and completions
- **Rewards**: Unlock network sentiment access with 3 referrals
- **Sharing**: Built-in sharing functionality

**API Endpoints**:
```typescript
// Create referral code
POST /api/trpc/createReferralCode

// Use referral code
POST /api/trpc/useReferralCode

// Get referral status
GET /api/trpc/getUserReferralStatus
```

**Database Tables**:
- `referral_code`: Generated referral codes
- `referral`: Referral relationships
- `network_sentiment_access`: Access permissions

### 5. Background Jobs

**Purpose**: Automate periodic updates and data synchronization.

**Job Types**:
- **Network Sentiment Update**: Hourly sentiment calculations
- **Leaderboard Refresh**: Every 30 minutes
- **Social Graph Sync**: Manual triggering via API

**Implementation**:
- **Redis Queue**: Job scheduling and management
- **Automatic Scheduling**: Recurring job setup
- **Error Handling**: Graceful failure recovery

## Database Schema

### New Tables

```sql
-- Farcaster user profiles
CREATE TABLE farcaster_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE UNIQUE,
  fid INTEGER NOT NULL UNIQUE,
  username TEXT NOT NULL,
  display_name TEXT,
  pfp TEXT,
  bio TEXT,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  active_status BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Social graph connections
CREATE TABLE social_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_fid INTEGER NOT NULL,
  following_fid INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Referral codes
CREATE TABLE referral_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  max_uses INTEGER DEFAULT 10,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Referral relationships
CREATE TABLE referral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  referred_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  referral_code_id UUID REFERENCES referral_code(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  referred_fid INTEGER,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Network sentiment snapshots
CREATE TABLE network_sentiment_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP NOT NULL,
  total_moods INTEGER NOT NULL DEFAULT 0,
  bullish_count INTEGER NOT NULL DEFAULT 0,
  bearish_count INTEGER NOT NULL DEFAULT 0,
  neutral_count INTEGER NOT NULL DEFAULT 0,
  confused_count INTEGER NOT NULL DEFAULT 0,
  bullish_percentage DECIMAL(5,2) DEFAULT 0.00,
  bearish_percentage DECIMAL(5,2) DEFAULT 0.00,
  neutral_percentage DECIMAL(5,2) DEFAULT 0.00,
  confused_percentage DECIMAL(5,2) DEFAULT 0.00,
  unique_users INTEGER NOT NULL DEFAULT 0,
  avg_connections_per_user DECIMAL(8,2) DEFAULT 0.00,
  total_connections INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Leaderboard entries
CREATE TABLE leaderboard_entry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  fid INTEGER,
  username TEXT,
  display_name TEXT,
  pfp TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_check_ins INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL,
  category TEXT NOT NULL,
  snapshot_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Network sentiment access control
CREATE TABLE network_sentiment_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE UNIQUE,
  has_full_access BOOLEAN DEFAULT false,
  referral_count INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## API Integration

### Neynar API Configuration

```typescript
// Environment variables
NEYNAR_API_KEY=your_neynar_api_key_here
FARCASTER_SIGNER_UUID=your_signer_uuid_here
```

### Example API Calls

```typescript
// Sync social graph
const syncResponse = await fetch('/api/trpc/syncSocialGraphFromNeynar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fid: 12345,
    neynarApiKey: process.env.NEYNAR_API_KEY
  })
});

// Get network sentiment
const sentimentResponse = await fetch('/api/trpc/getNetworkSentiment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    fid: 12345,
    date: '2024-01-15'
  })
});
```

## Frontend Components

### 1. NetworkSentiment Component

```typescript
<NetworkSentiment
  userId="user-123"
  fid={12345}
  className="w-full"
/>
```

**Features**:
- Access control checks
- Visual sentiment indicators
- Real-time data fetching
- Responsive design

### 2. Leaderboard Component

```typescript
<Leaderboard />
```

**Features**:
- Multiple categories (current streak, longest streak, total check-ins)
- Sortable and filterable table
- User profile integration
- Farcaster links

### 3. ReferralSystem Component

```typescript
<ReferralSystem
  userId="user-123"
  userName="John Doe"
/>
```

**Features**:
- Referral code generation
- Status tracking
- Progress indicators
- Sharing functionality

## Deployment and Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Background Jobs
BACKGROUND_JOBS_ENABLED=true

# Neynar API
NEYNAR_API_KEY=your_api_key_here
FARCASTER_SIGNER_UUID=your_signer_uuid_here
```

### Database Migration

```bash
# Generate migration
npm run db:generate

# Push to database
npm run db:push
```

### Background Job Setup

```bash
# Start background jobs
curl -X POST http://localhost:3000/api/jobs/start
```

## Testing

### Demo Setup

```bash
# Create demo data for testing
curl -X POST http://localhost:3000/api/demo-setup
```

### Manual Testing

1. **Social Graph Sync**:
   - Navigate to Dashboard → Network tab
   - Click "Sync Social Graph"
   - Verify follower/following counts update

2. **Network Sentiment**:
   - Check sentiment display
   - Verify access control with referrals
   - Test different date ranges

3. **Leaderboard**:
   - View different categories
   - Test sorting and filtering
   - Verify score calculations

4. **Referral System**:
   - Create referral codes
   - Test code redemption
   - Verify access unlocking

## Performance Considerations

### Redis Caching

- **Network Sentiment**: 5-minute cache
- **Leaderboard**: 2-minute cache
- **Social Graph**: 15-minute cache

### Database Optimization

- Indexed queries on user_id, fid, and timestamps
- Batch operations for social graph updates
- Periodic cleanup of old data

### Rate Limiting

- Neynar API calls rate limited
- Background job throttling
- Cache warming strategies

## Security Considerations

### Access Control

- Network sentiment gated by referrals
- API key management for Neynar
- User permission validation

### Data Privacy

- Farcaster data handling compliance
- User consent for social graph access
- Secure storage of API keys

## Monitoring and Maintenance

### Background Job Monitoring

```bash
# Check job status
curl http://localhost:3000/api/jobs/status
```

### Health Checks

- Redis connection monitoring
- Database query performance
- API response times
- Error rate tracking

### Data Consistency

- Regular data integrity checks
- Cache invalidation strategies
- Backup procedures

## Future Enhancements

### Planned Features

1. **Advanced Analytics**:
   - Sentiment trend analysis
   - Network influence metrics
   - Correlation with market data

2. **Enhanced Social Features**:
   - Direct messaging via Farcaster
   - Group sentiment analysis
   - Influencer tracking

3. **Gamification**:
   - Achievement system
   - Streak bonuses
   - Network challenges

4. **API Extensions**:
   - GraphQL endpoints
   - Webhook support
   - Third-party integrations

## Troubleshooting

### Common Issues

1. **Neynar API Errors**:
   - Check API key validity
   - Verify rate limits
   - Confirm FID format

2. **Redis Connection Issues**:
   - Verify Redis server running
   - Check connection string format
   - Monitor memory usage

3. **Database Performance**:
   - Check query execution plans
   - Monitor connection pool
   - Verify indexes

### Debug Mode

Enable debug logging:

```bash
DEBUG=true npm run dev
```

This will output detailed information about:
- Background job execution
- API call responses
- Database queries
- Cache operations

## Support

For issues and questions:
- Check this documentation
- Review console logs
- Contact development team
- Create GitHub issues