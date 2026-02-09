-- Step 1: Create ENUM types for the application
CREATE TYPE user_role AS ENUM ('consumer', 'transporter', 'admin');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE item_type AS ENUM ('small_furniture', 'large_furniture', 'appliances', 'fragile', 'home_move');
CREATE TYPE item_size AS ENUM ('small', 'medium', 'large');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'en_route_pickup', 'picked_up', 'en_route_dropoff', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');