# Product Requirements Document (PRD)
## Helsinki Moving App - "Uber for Moving Stuff"

### Executive Summary
A two-sided marketplace connecting consumers who need items moved with van-owning transporters in Helsinki, Finland. The platform handles booking, real-time tracking, payment processing, and ratings.

---

## 1. Product Vision

**Mission**: Make moving small items and furniture in Helsinki as easy as ordering a ride.

**Target Market**: 
- **Primary**: Helsinki metropolitan area residents needing furniture/appliance delivery
- **Secondary**: Small businesses, students moving between apartments, IKEA shoppers

**Success Metrics**:
- 100 active transporters in first 6 months
- 500 completed moves in first quarter
- 4.5+ average rating from consumers
- <10 minute average acceptance time

---

## 2. User Personas

### Persona 1: Maria (Consumer)
- 32-year-old marketing professional
- Just bought a couch from Marketplace
- Doesn't own a car
- Needs delivery within 24 hours
- Willing to pay €30-80 for convenience

### Persona 2: Jukka (Transporter)
- 45-year-old van owner
- Works flexible hours
- Wants to monetize van downtime
- Needs transparent earnings and route optimization
- Values respectful, verified customers

### Persona 3: Admin (Platform Manager)
- Monitors platform health
- Approves transporter applications
- Handles disputes
- Analyzes business metrics

---

## 3. Core Features

### 3.1 Consumer App (Progressive Web App)

#### Registration & Authentication
- **Sign-up options**: Email/password or phone number (SMS verification)
- **Profile**: Name, phone, payment methods, address book
- **Languages**: English and Finnish (toggle in settings)

#### Booking Flow
1. **Item Details**:
   - Type: Small furniture, Large furniture, Appliances, Fragile items, Full home move
   - Size estimate: Small (fits in sedan), Medium (requires van), Large (requires multiple trips)
   - Photos (optional, up to 5)
   - Special instructions (assembly needed, stairs, fragile handling)

2. **Location**:
   - Pickup address (autocomplete with Mapbox)
   - Drop-off address
   - Date/time picker (ASAP or scheduled up to 7 days ahead)

3. **Pricing**:
   - Dynamic pricing based on:
     - Distance (Google Maps API)
     - Item size category
     - Time of day (surge pricing during peak hours)
     - Stairs/assembly surcharge
   - Display breakdown: Base fare + Distance + Extras

4. **Confirmation**:
   - Review details
   - Apply promo code
   - Confirm payment method
   - Submit booking

#### Active Move Experience
- **Real-time tracking**: See transporter's location on map
- **Status updates**: 
  - "Searching for transporter..."
  - "Transporter accepted"
  - "Transporter en route to pickup"
  - "Items picked up - en route to destination"
  - "Delivered"
- **In-app chat**: Text messages with transporter
- **Call transporter**: One-tap phone call button
- **Cancel booking**: Cancellation policy (free >1 hour before, 50% fee <1 hour)

#### Post-Move
- **Automatic payment**: Charged to saved card
- **Receipt**: Email + in-app
- **Rating**: 1-5 stars + optional written review
- **Support**: Report issue button

#### History & Settings
- **Move history**: All past bookings with details
- **Favorite addresses**: Save home, work, storage
- **Payment methods**: Add/remove cards, view MobilePay option
- **Notifications**: Push notification settings

---

### 3.2 Transporter App (Progressive Web App)

#### Registration & Verification
- **Application form**:
  - Personal details (name, phone, email)
  - Driver's license upload (photo)
  - Van details (make, model, year, license plate)
  - Insurance certificate upload
  - Bank account (for payouts)
- **Admin approval**: Pending status until verified

#### Job Board
- **Available jobs**: List view sorted by proximity
- **Job details**: 
  - Pickup/drop-off locations
  - Estimated distance and duration
  - Item size and type
  - Earnings for this job
  - Consumer rating
- **Accept/Reject**: 30-second countdown to accept

#### Active Job Experience
- **Navigation**: Open in Google Maps/Waze
- **Status updates**: Manual status changes (Arrived at pickup, Items loaded, Arrived at drop-off, Completed)
- **In-app chat**: Communicate with consumer
- **Call consumer**: Direct phone button
- **Photo proof**: Take photo of delivered items

#### Earnings Dashboard
- **Today's earnings**: Real-time counter
- **Weekly breakdown**: Chart showing daily earnings
- **Payout schedule**: Weekly direct deposit every Monday
- **Tax documents**: Download yearly summaries

#### Profile & Settings
- **Availability toggle**: Go online/offline
- **Vehicle info**: Update van details
- **Banking**: Update payout account
- **Ratings**: View consumer feedback

---

### 3.3 Admin Dashboard (Web)

#### Transporter Management
- **Pending applications**: 
  - Review uploaded documents
  - Approve/reject with notes
  - Request additional documentation
- **Active transporters**: 
  - View profile, ratings, earnings
  - Suspend/ban accounts
  - Manually adjust ratings

#### Consumer Management
- **User list**: Search, filter, sort
- **Account actions**: Suspend problematic users
- **Refund processing**: Issue partial/full refunds

#### Booking Management
- **Live bookings**: Real-time map of active moves
- **Booking history**: Search, filter by date/status
- **Dispute resolution**: 
  - View chat logs
  - See photos
  - Issue refunds or bonuses

#### Financial Dashboard
- **Revenue metrics**:
  - Gross revenue (total booking value)
  - Net revenue (after transporter payouts)
  - Platform commission (15% of each booking)
  - Refunds issued
- **Charts**: Daily/weekly/monthly trends

#### Analytics
- **Key metrics**:
  - Total moves completed
  - Average move price
  - Peak booking times (heatmap)
  - Top-rated transporters
  - Consumer retention rate
  - Cancellation rate
- **Export**: CSV download for external analysis

---

## 4. Technical Requirements

### 4.1 Non-Functional Requirements
- **Performance**: Page load <2 seconds, real-time updates <500ms latency
- **Security**: End-to-end encryption for chat, PCI DSS compliance for payments
- **Availability**: 99.9% uptime SLA
- **Scalability**: Handle 1000 concurrent users

### 4.2 Compliance
- **GDPR**: Right to deletion, data export, cookie consent
- **Finnish regulations**: VAT handling, transporter insurance verification

### 4.3 Integrations
- **Maps**: Mapbox for geocoding, routing, distance calculation
- **Payments**: Stripe for card processing
- **SMS**: Twilio for phone verification (optional, use Supabase Auth)
- **Push notifications**: Firebase Cloud Messaging or Supabase Realtime

---

## 5. User Flows

### 5.1 Consumer: Book a Move
1. Open app → "Book a Move" button
2. Enter pickup address (autocomplete)
3. Enter drop-off address
4. Select item type and size
5. Add photo and notes (optional)
6. Choose date/time (ASAP or scheduled)
7. See price estimate
8. Confirm booking
9. Wait for transporter acceptance (receive push notification)
10. Track transporter in real-time
11. Receive delivery confirmation
12. Rate and pay

### 5.2 Transporter: Complete a Move
1. Log in → Go online
2. Receive job notification
3. View job details
4. Accept job
5. Navigate to pickup location
6. Update status: "Arrived at pickup"
7. Load items, take photo
8. Update status: "Items picked up"
9. Navigate to drop-off
10. Update status: "Arrived at drop-off"
11. Unload items
12. Update status: "Completed"
13. Receive payment to weekly balance

### 5.3 Admin: Approve Transporter
1. Log in to admin dashboard
2. Navigate to "Pending Applications"
3. Open application
4. Review driver's license, van registration, insurance
5. Verify information is valid
6. Click "Approve" → Transporter receives email
7. Transporter can now go online

---

## 6. Out of Scope (Future Phases)

- **Phase 2**: iOS and Android native apps
- **Phase 3**: Multi-city expansion (Tampere, Turku, Espoo)
- **Phase 4**: Corporate accounts for businesses
- **Phase 5**: Scheduled recurring moves
- **Phase 6**: Multi-transporter jobs (large moves requiring 2+ vans)

---

## 7. Launch Plan

### Pre-Launch
- Recruit 20 beta transporters
- Offer free moves for first 50 consumers
- Gather feedback and iterate

### Launch Week
- Press release to local Helsinki media
- Social media campaign
- Flyers in IKEA, Marketplace groups

### Post-Launch
- Monitor metrics daily
- Weekly transporter meetups
- Respond to support tickets <24 hours

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-09  
**Owner**: Softgen AI