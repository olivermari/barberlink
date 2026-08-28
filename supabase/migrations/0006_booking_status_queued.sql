-- Same-day on-demand redesign: bookings for a busy barber now wait in
-- a queue instead of being scheduled for a future date. Split into
-- its own migration because a new enum value can't be referenced in
-- the same transaction that adds it.

alter type booking_status add value 'queued';
