# Architecture Document
## Helsinki Moving App - Technical Implementation

---

## 1. System Architecture Overview

### High-Level Architecture
```
┌─────────────────┐
│   Web Browser   │
│  (PWA Client)   │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│   Next.js App   │
│  (Server + UI)  │
└────────┬────────┘
         │
         ├───────────────────┐
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │   Third Party   │
│  - PostgreSQL   │  │   - Stripe      │
│  - Auth         │  │   - Mapbox      │
│  - Realtime     │  │                 │
│  - Storage      │  │                 │
└─────────────────┘  └─────────────────┘
```

---

## 2. Technology Stack

### Frontend
- **Framework**: Next.js 15 (React 18, Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 + Shadcn/UI components
- **State Management**: React Context API + Zustand (for complex state)
- **Forms**: React Hook Form + Zod validation
- **Maps**: Mapbox GL JS
- **Real-time**: Supabase Realtime subscriptions
- **Notifications**: Browser Push API + Supabase Realtime

### Backend
- **BaaS**: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Authentication**: Supabase Auth (Email/Password, Phone/SMS)
- **Database**: PostgreSQL 15
- **File Storage**: Supabase Storage (driver licenses, insurance docs, item photos)
- **Real-time**: Supabase Realtime (location updates, chat, booking status)

### Third-Party Services
- **Payments**: Stripe (Payment Intents API)
- **Maps**: Mapbox (Geocoding, Directions, Static Maps)
- **SMS** (Optional): Supabase Auth handles phone verification

### Infrastructure
- **Hosting**: Vercel (Next.js app)
- **Database**: Supabase Cloud (managed PostgreSQL)
- **CDN**: Vercel Edge Network
- **Domain**: Custom domain with SSL

---

## 3. Database Schema

### 3.1 Tables

#### `profiles`
Extends Supabase Auth users with role and additional info.
```sql
CREATE TYPE user_role AS ENUM ('consumer', 'transporter', 'admin');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'consumer',
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en', -- 'en' or 'fi'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `transporter_applications`
Transporter verification documents.
```sql
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE transporter_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status application_status DEFAULT 'pending',
  driver_license_url TEXT NOT NULL,
  van_make TEXT NOT NULL,
  van_model TEXT NOT NULL,
  van_year INTEGER NOT NULL,
  van_license_plate TEXT NOT NULL,
  insurance_url TEXT NOT NULL,
  bank_account_iban TEXT NOT NULL,
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id)
);
```

#### `bookings`
Main bookings table.
```sql
CREATE TYPE item_type AS ENUM ('small_furniture', 'large_furniture', 'appliances', 'fragile', 'home_move');
CREATE TYPE item_size AS ENUM ('small', 'medium', 'large');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'en_route_pickup', 'picked_up', 'en_route_dropoff', 'delivered', 'cancelled');

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Locations
  pickup_address TEXT NOT NULL,
  pickup_lat NUMERIC(10, 7) NOT NULL,
  pickup_lng NUMERIC(10, 7) NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat NUMERIC(10, 7) NOT NULL,
  dropoff_lng NUMERIC(10, 7) NOT NULL,
  
  -- Item details
  item_type item_type NOT NULL,
  item_size item_size NOT NULL,
  item_photos TEXT[], -- Array of URLs
  special_instructions TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Pricing
  distance_km NUMERIC(5, 2) NOT NULL,
  base_price NUMERIC(8, 2) NOT NULL,
  distance_price NUMERIC(8, 2) NOT NULL,
  extras_price NUMERIC(8, 2) DEFAULT 0,
  total_price NUMERIC(8, 2) NOT NULL,
  platform_fee NUMERIC(8, 2) NOT NULL, -- 15% commission
  transporter_earnings NUMERIC(8, 2) NOT NULL,
  
  -- Status
  status booking_status DEFAULT 'pending',
  
  -- Ratings
  consumer_rating INTEGER CHECK (consumer_rating >= 1 AND consumer_rating <= 5),
  consumer_review TEXT,
  transporter_rating INTEGER CHECK (transporter_rating >= 1 AND transporter_rating <= 5),
  transporter_review TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `location_updates`
Real-time transporter location tracking.
```sql
CREATE TABLE location_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  transporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat NUMERIC(10, 7) NOT NULL,
  lng NUMERIC(10, 7) NOT NULL,
  heading NUMERIC(5, 2), -- Compass direction (0-360)
  speed NUMERIC(5, 2), -- km/h
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `messages`
In-app chat system.
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `payments`
Payment transaction records.
```sql
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount NUMERIC(8, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status payment_status DEFAULT 'pending',
  refund_amount NUMERIC(8, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `transporter_availability`
Track when transporters are online.
```sql
CREATE TABLE transporter_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_location_lat NUMERIC(10, 7),
  last_location_lng NUMERIC(10, 7),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. Row Level Security (RLS) Policies

### Profiles
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Bookings
```sql
-- Consumers can view their own bookings
CREATE POLICY "Consumers can view own bookings" ON bookings
  FOR SELECT USING (consumer_id = auth.uid());

-- Transporters can view bookings assigned to them
CREATE POLICY "Transporters can view assigned bookings" ON bookings
  FOR SELECT USING (transporter_id = auth.uid());

-- Transporters can view pending bookings (marketplace)
CREATE POLICY "Transporters can view pending bookings" ON bookings
  FOR SELECT USING (
    status = 'pending' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'transporter')
  );

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Consumers can create bookings
CREATE POLICY "Consumers can create bookings" ON bookings
  FOR INSERT WITH CHECK (consumer_id = auth.uid());

-- Transporters can update booking status
CREATE POLICY "Transporters can update booking status" ON bookings
  FOR UPDATE USING (transporter_id = auth.uid());
```

### Messages
```sql
-- Users can view messages for their bookings
CREATE POLICY "Users can view messages for their bookings" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.consumer_id = auth.uid() OR bookings.transporter_id = auth.uid())
    )
  );

-- Users can send messages for their bookings
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());
```

---

## 5. API Architecture

### Next.js API Routes (`/pages/api/`)

#### `/api/bookings/create`
- **Method**: POST
- **Auth**: Required (consumer)
- **Body**: `{ pickupAddress, dropoffAddress, itemType, itemSize, scheduledAt, ... }`
- **Logic**:
  1. Calculate distance using Mapbox Directions API
  2. Calculate price based on distance + item size
  3. Insert booking into database
  4. Return booking ID

#### `/api/bookings/accept`
- **Method**: POST
- **Auth**: Required (transporter)
- **Body**: `{ bookingId }`
- **Logic**:
  1. Verify booking is still pending
  2. Update booking with transporter_id and status = 'accepted'
  3. Send push notification to consumer

#### `/api/bookings/update-status`
- **Method**: POST
- **Auth**: Required (transporter)
- **Body**: `{ bookingId, status }`
- **Logic**:
  1. Verify transporter owns the booking
  2. Update booking status
  3. Trigger Supabase Realtime update

#### `/api/payments/create-intent`
- **Method**: POST
- **Auth**: Required (consumer)
- **Body**: `{ bookingId }`
- **Logic**:
  1. Get booking total price
  2. Create Stripe PaymentIntent
  3. Return clientSecret

#### `/api/payments/webhook`
- **Method**: POST
- **Auth**: Stripe signature verification
- **Logic**:
  1. Handle `payment_intent.succeeded` event
  2. Update payment status in database
  3. Update booking status to 'completed'

#### `/api/admin/approve-transporter`
- **Method**: POST
- **Auth**: Required (admin)
- **Body**: `{ applicationId, approved, notes }`
- **Logic**:
  1. Update transporter application status
  2. If approved, update user role to 'transporter'
  3. Send email notification

---

## 6. Real-time Features

### Location Tracking
```typescript
// Transporter app sends location every 5 seconds
const channel = supabase.channel('location-updates');
channel.send({
  type: 'broadcast',
  event: 'location',
  payload: { bookingId, lat, lng, heading }
});

// Consumer app subscribes to location updates
supabase.channel('location-updates')
  .on('broadcast', { event: 'location' }, (payload) => {
    // Update map marker
  })
  .subscribe();
```

### Chat
```typescript
// Insert message
await supabase.from('messages').insert({
  booking_id: bookingId,
  sender_id: userId,
  content: messageText
});

// Subscribe to new messages
supabase
  .channel('messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
    (payload) => {
      // Display new message
    }
  )
  .subscribe();
```

---

## 7. Security Considerations

### Authentication
- Supabase Auth with JWT tokens
- Row Level Security (RLS) on all tables
- Session management with refresh tokens

### Data Protection
- All API calls over HTTPS
- Sensitive data (driver licenses, insurance) in private Supabase Storage buckets
- Payment card data never touches our servers (Stripe handles PCI compliance)

### Rate Limiting
- Implement rate limiting on critical endpoints (booking creation, location updates)
- Use Vercel Edge Middleware for IP-based throttling

---

## 8. Performance Optimization

### Frontend
- Next.js Static Generation for public pages (landing, pricing)
- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Service Worker for offline support (PWA)

### Database
- Indexes on frequently queried columns (booking status, consumer_id, transporter_id)
- Materialized views for analytics dashboard
- Connection pooling via Supabase

### Caching
- Browser caching for static assets
- React Query for client-side caching
- Redis (future) for session storage

---

## 9. Monitoring & Analytics

### Application Monitoring
- Vercel Analytics for frontend performance
- Supabase Dashboard for database queries
- Error tracking with Sentry (future)

### Business Metrics
- Admin dashboard with real-time charts
- Daily/weekly email reports
- Google Analytics for user behavior

---

## 10. Deployment Strategy

### Development
- Local development with Supabase CLI
- Git branch: `develop`
- Environment: Supabase staging project

### Staging
- Vercel Preview Deployments
- Git branch: `main`
- Environment: Supabase staging project

### Production
- Vercel Production
- Git branch: `production`
- Environment: Supabase production project

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-09  
**Owner**: Softgen AI