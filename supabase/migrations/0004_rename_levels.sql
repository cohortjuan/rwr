-- The four levels are named after the four Ikigai circles (Heart, Craft, Cause, Coin).
-- Passion, Mission, Vocation, and Profession are the overlaps between circles, so they no
-- longer name levels. Both tables were empty when this ran.
alter table public.interview_sessions
  drop constraint interview_sessions_phase_check,
  add constraint interview_sessions_phase_check
    check (phase in ('Onboarding', 'Heart', 'Craft', 'Cause', 'Coin', 'Crossroads'));

alter table public.claims
  drop constraint claims_quadrant_check,
  add constraint claims_quadrant_check
    check (quadrant in ('heart', 'craft', 'cause', 'coin'));
