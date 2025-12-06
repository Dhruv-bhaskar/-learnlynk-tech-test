# LearnLynk – Technical Assessment

**Completed by:** Dhruv kumar bhaskar

A full-stack application management system built with Supabase, Edge Functions, and Next.js.

---

## Quick Setup

### 1. Database Setup

In Supabase SQL Editor, run in order:
1. `backend/schema.sql`
2. `backend/rls_policies.sql`

### 2. Edge Function

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy create-task --no-verify-jwt
```

### 3. Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=your_url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key" >> .env.local

npm run dev
```

Open: open your local deployment link

### 4. Add Test Data

Run in Supabase SQL Editor:

```sql
WITH new_lead AS (
  INSERT INTO leads (id, tenant_id, owner_id, stage, first_name, last_name, email)
  VALUES ('11111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 
          '00000000-0000-0000-0000-000000000001'::uuid, 'new', 'John', 'Doe', 'john@test.com')
  RETURNING id
),
new_app AS (
  INSERT INTO applications (id, tenant_id, lead_id, status)
  VALUES ('22222222-2222-2222-2222-222222222222'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
          '11111111-1111-1111-1111-111111111111'::uuid, 'pending')
  RETURNING id
)
INSERT INTO tasks (tenant_id, application_id, type, title, due_at, status)
VALUES 
('00000000-0000-0000-0000-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 
 'call', 'Initial call', NOW() + INTERVAL '2 hours', 'pending'),
('00000000-0000-0000-0000-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 
 'email', 'Send documents', NOW() + INTERVAL '4 hours', 'pending'),
('00000000-0000-0000-0000-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 
 'review', 'Review materials', NOW() + INTERVAL '6 hours', 'pending');
```

---

## �� Project Structure

```
backend/
  rls_policies.sql
  schema.sql

frontend/
  lib/
    supabaseClient.ts
  pages/
    dashboard/
      today.tsx
    _app.tsx
  styles/
    globals.css

supabase/
  .temp/
  functions/
    create-task/
      index.ts

```

---

## ✅ Features Implemented

### Section 1 – Database Schema
- 3 tables: leads, applications, tasks
- Foreign key relationships
- Check constraints (task types, due_at validation)
- Optimized indexes for common queries

### Section 2 – RLS Policies
- Row-level security enabled on all tables
- Role-based access (Admin vs Counselor)
- Team-based permissions
- Demo-friendly policies (production notes in comments)

### Section 3 – Edge Function
- POST endpoint: `/create-task`
- Input validation (task_type, due_at)
- Error handling (400, 404, 500)
- Realtime event broadcasting

### Section 4 – Frontend Dashboard
- Tasks due today display
- "Mark Complete" functionality
- Loading & error states
- React Query for state management
- Modern UI with Tailwind CSS

### Section 5 – Stripe Integration

When a user initiates payment, create a `payment_requests` record with status "pending", then call `stripe.checkout.sessions.create()` with payment details and metadata. Store the `session_id` and redirect user to Stripe checkout.

Handle the `checkout.session.completed` webhook by verifying the signature with `stripe.webhooks.constructEvent()`, updating `payment_requests` to "succeeded", and updating the application's payment_status and stage. Wrap webhook processing in a database transaction for consistency.

Listen for `checkout.session.expired` and `payment_intent.payment_failed` events to handle failures.

just update the folder structure in this read me. i am giving you my correct folder structure.
