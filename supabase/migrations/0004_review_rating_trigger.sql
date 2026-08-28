-- Recalculates barber_profiles.rating_avg / rating_count whenever a
-- review is inserted, so the aggregate shown on browse/profile pages
-- stays correct without the app having to do it client-side.

create or replace function public.update_barber_rating()
returns trigger as $$
begin
  update barber_profiles
  set
    rating_avg = (
      select round(avg(rating)::numeric, 2)
      from reviews
      where barber_id = new.barber_id
    ),
    rating_count = (
      select count(*)
      from reviews
      where barber_id = new.barber_id
    )
  where id = new.barber_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace trigger reviews_update_barber_rating
  after insert on reviews
  for each row execute function public.update_barber_rating();
