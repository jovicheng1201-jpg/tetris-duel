-- Tetris duel MVP: all application tables, RPCs, and Realtime policy names use the tetris_ prefix.
create table if not exists public.tetris_player (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  avatar_key text,
  locale text not null default 'en' check (locale in ('en','zh-TW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tetris_room (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[A-F0-9]{10}$'),
  host_user_id uuid not null references auth.users(id),
  status text not null default 'waiting' check (status in ('waiting','playing','finished','expired')),
  rules_version text not null default '1.0',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours'
);

create table if not exists public.tetris_room_member (
  room_id uuid not null references public.tetris_room(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat smallint not null check (seat in (1,2)),
  is_ready boolean not null default false,
  rematch_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_heartbeat_at timestamptz not null default now(),
  primary key (room_id,user_id),
  unique (room_id,seat)
);
create index if not exists tetris_room_member_user_idx on public.tetris_room_member(user_id, left_at);

create table if not exists public.tetris_match (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.tetris_room(id) on delete set null,
  mode text not null check (mode in ('solo','ai','online_pvp')),
  round_no integer not null default 1 check (round_no > 0),
  status text not null default 'playing' check (status in ('playing','finished','abandoned')),
  seed bigint not null check (seed between 0 and 4294967295),
  rules_version text not null default '1.0',
  player1_user_id uuid references auth.users(id),
  player2_user_id uuid references auth.users(id),
  winner_user_id uuid references auth.users(id),
  finish_reason text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists tetris_match_room_round_idx on public.tetris_match(room_id, round_no desc);

create table if not exists public.tetris_match_result (
  match_id uuid not null references public.tetris_match(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat smallint check (seat in (1,2)),
  score bigint not null default 0 check (score >= 0),
  lines_cleared integer not null default 0 check (lines_cleared >= 0),
  final_level integer not null default 1 check (final_level >= 1),
  elapsed_ms bigint not null default 0 check (elapsed_ms >= 0),
  attacks_sent integer not null default 0 check (attacks_sent >= 0),
  attacks_received integer not null default 0 check (attacks_received >= 0),
  outcome text not null check (outcome in ('win','loss','draw','finished')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','rejected')),
  submitted_at timestamptz not null default now(),
  primary key (match_id,user_id)
);

create table if not exists public.tetris_score (
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('solo','ai','online_pvp')),
  season_key text not null,
  best_score bigint not null default 0 check (best_score >= 0),
  total_score bigint not null default 0 check (total_score >= 0),
  matches_played integer not null default 0 check (matches_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  rating integer not null default 1000,
  updated_at timestamptz not null default now(),
  primary key (user_id,mode,season_key)
);
create index if not exists tetris_score_leaderboard_idx on public.tetris_score(mode,season_key,best_score desc,rating desc);

alter table public.tetris_player enable row level security;
alter table public.tetris_room enable row level security;
alter table public.tetris_room_member enable row level security;
alter table public.tetris_match enable row level security;
alter table public.tetris_match_result enable row level security;
alter table public.tetris_score enable row level security;

create or replace function public.tetris_is_room_member(p_room_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.tetris_room_member m
    where m.room_id::text=p_room_id and m.user_id=auth.uid() and m.left_at is null
  )
$$;

drop policy if exists tetris_player_self_select on public.tetris_player;
create policy tetris_player_self_select on public.tetris_player for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists tetris_room_member_select on public.tetris_room;
create policy tetris_room_member_select on public.tetris_room for select to authenticated using (public.tetris_is_room_member(id::text));
drop policy if exists tetris_room_members_select on public.tetris_room_member;
create policy tetris_room_members_select on public.tetris_room_member for select to authenticated using (public.tetris_is_room_member(room_id::text));
drop policy if exists tetris_match_participant_select on public.tetris_match;
create policy tetris_match_participant_select on public.tetris_match for select to authenticated using (
  player1_user_id = (select auth.uid()) or player2_user_id = (select auth.uid()) or public.tetris_is_room_member(room_id::text)
);
drop policy if exists tetris_result_participant_select on public.tetris_match_result;
create policy tetris_result_participant_select on public.tetris_match_result for select to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.tetris_match m where m.id = match_id and
      (m.player1_user_id = (select auth.uid()) or m.player2_user_id = (select auth.uid()))
  )
);
drop policy if exists tetris_score_public_select on public.tetris_score;
create policy tetris_score_public_select on public.tetris_score for select to authenticated using (true);

revoke all on public.tetris_player, public.tetris_room, public.tetris_room_member,
  public.tetris_match, public.tetris_match_result, public.tetris_score from anon, authenticated;

create or replace function public.tetris_ensure_profile(p_display_name text, p_locale text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_name text := left(trim(coalesce(p_display_name,'')),20);
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_name = '' then v_name := 'Player'; end if;
  insert into public.tetris_player(user_id,display_name,locale)
  values (v_user,v_name,case when p_locale = 'zh-TW' then 'zh-TW' else 'en' end)
  on conflict (user_id) do update set display_name = excluded.display_name, locale = excluded.locale, updated_at = now();
  return jsonb_build_object('user_id',v_user);
end $$;

create or replace function public.tetris_create_room(p_settings jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_room public.tetris_room%rowtype; v_code text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.tetris_player p where p.user_id = v_user) then raise exception 'PROFILE_REQUIRED'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    exit when not exists(select 1 from public.tetris_room r where r.room_code = v_code and r.expires_at > now());
  end loop;
  insert into public.tetris_room(room_code,host_user_id,rules_version,settings)
    values(v_code,v_user,coalesce(p_settings->>'rulesVersion','1.0'),coalesce(p_settings,'{}'::jsonb)) returning * into v_room;
  insert into public.tetris_room_member(room_id,user_id,seat) values(v_room.id,v_user,1);
  return jsonb_build_object('room_id',v_room.id,'room_code',v_room.room_code);
end $$;

create or replace function public.tetris_join_room(p_room_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_room public.tetris_room%rowtype; v_member public.tetris_room_member%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.tetris_room where room_code = upper(trim(p_room_code)) for update;
  if not found or v_room.expires_at <= now() then raise exception 'ROOM_NOT_FOUND'; end if;
  select * into v_member from public.tetris_room_member where room_id = v_room.id and user_id = v_user;
  if found and v_member.left_at is null then return jsonb_build_object('room_id',v_room.id,'room_code',v_room.room_code); end if;
  if v_room.status <> 'waiting' then raise exception 'ROOM_CLOSED'; end if;
  if v_member.user_id is not null then
    update public.tetris_room_member set left_at = null, is_ready = false, rematch_ready = false, joined_at = now(), last_heartbeat_at = now()
      where room_id = v_room.id and user_id = v_user;
  else
    delete from public.tetris_room_member where room_id = v_room.id and seat = 2 and left_at is not null;
    if exists(select 1 from public.tetris_room_member where room_id = v_room.id and left_at is null) and
       (select count(*) from public.tetris_room_member where room_id = v_room.id and left_at is null) >= 2 then raise exception 'ROOM_FULL'; end if;
    insert into public.tetris_room_member(room_id,user_id,seat) values(v_room.id,v_user,2);
  end if;
  return jsonb_build_object('room_id',v_room.id,'room_code',v_room.room_code);
end $$;

create or replace function public.tetris_get_room_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if v_user is null or not exists(select 1 from public.tetris_room_member m where m.room_id=p_room_id and m.user_id=v_user and m.left_at is null) then
    raise exception 'ROOM_ACCESS_DENIED';
  end if;
  select jsonb_build_object(
    'id',r.id,'room_code',r.room_code,'host_user_id',r.host_user_id,'status',r.status,
    'members',coalesce((select jsonb_agg(jsonb_build_object(
      'user_id',m.user_id,'display_name',p.display_name,'seat',m.seat,'is_ready',m.is_ready,
      'rematch_ready',m.rematch_ready,'left_at',m.left_at
    ) order by m.seat) from public.tetris_room_member m join public.tetris_player p on p.user_id=m.user_id
      where m.room_id=r.id and m.left_at is null),'[]'::jsonb),
    'match',(select jsonb_build_object('id',g.id,'mode',g.mode,'status',g.status,'seed',g.seed,
      'round_no',g.round_no,'rules_version',g.rules_version,'started_at',g.started_at)
      from public.tetris_match g where g.room_id=r.id order by g.round_no desc limit 1)
  ) into v_result from public.tetris_room r where r.id=p_room_id;
  if v_result is null then raise exception 'ROOM_NOT_FOUND'; end if;
  return v_result;
end $$;

create or replace function public.tetris_set_ready(p_room_id uuid,p_ready boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if not exists(select 1 from public.tetris_room where id=p_room_id and status='waiting') then raise exception 'ROOM_NOT_READY'; end if;
  update public.tetris_room_member set is_ready=p_ready,last_heartbeat_at=now()
    where room_id=p_room_id and user_id=v_user and left_at is null;
  if not found then raise exception 'ROOM_ACCESS_DENIED'; end if;
  return jsonb_build_object('ready',p_ready);
end $$;

create or replace function public.tetris_start_match(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_room public.tetris_room%rowtype; v_id uuid; v_seed bigint; v_round integer; v_start timestamptz;
begin
  select * into v_room from public.tetris_room where id=p_room_id for update;
  if not found or v_room.host_user_id <> v_user then raise exception 'HOST_REQUIRED'; end if;
  if v_room.status <> 'waiting' then raise exception 'ROOM_NOT_READY'; end if;
  if (select count(*) from public.tetris_room_member where room_id=p_room_id and left_at is null and is_ready)=2 then null;
  else raise exception 'PLAYERS_NOT_READY'; end if;
  v_seed := floor(random()*2147483647)::bigint;
  select coalesce(max(round_no),0)+1 into v_round from public.tetris_match where room_id=p_room_id;
  v_start := clock_timestamp()+interval '3 seconds';
  insert into public.tetris_match(room_id,mode,round_no,status,seed,rules_version,player1_user_id,player2_user_id,started_at)
    select p_room_id,'online_pvp',v_round,'playing',v_seed,v_room.rules_version,
      (select user_id from public.tetris_room_member where room_id=p_room_id and seat=1 and left_at is null),
      (select user_id from public.tetris_room_member where room_id=p_room_id and seat=2 and left_at is null),v_start
    returning id into v_id;
  update public.tetris_room set status='playing',updated_at=now() where id=p_room_id;
  update public.tetris_room_member set rematch_ready=false where room_id=p_room_id;
  return jsonb_build_object('match_id',v_id,'seed',v_seed,'round_no',v_round,'rules_version',v_room.rules_version,'server_start_at',v_start);
end $$;

create or replace function public.tetris_mark_presence_heartbeat(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  update public.tetris_room_member set last_heartbeat_at=now() where room_id=p_room_id and user_id=v_user and left_at is null;
  if not found then raise exception 'ROOM_ACCESS_DENIED'; end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.tetris_leave_room(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_room public.tetris_room%rowtype; v_next uuid;
begin
  select * into v_room from public.tetris_room where id=p_room_id for update;
  update public.tetris_room_member set left_at=now(),is_ready=false,rematch_ready=false where room_id=p_room_id and user_id=v_user and left_at is null;
  if not found then return jsonb_build_object('left',false); end if;
  if v_room.host_user_id=v_user then
    select user_id into v_next from public.tetris_room_member where room_id=p_room_id and left_at is null order by seat limit 1;
    if v_next is null then update public.tetris_room set status='expired',expires_at=now(),updated_at=now() where id=p_room_id;
    else update public.tetris_room set host_user_id=v_next,updated_at=now() where id=p_room_id; end if;
  end if;
  return jsonb_build_object('left',true);
end $$;

create or replace function public.tetris_request_rematch(p_room_id uuid,p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_match public.tetris_match%rowtype; v_room public.tetris_room%rowtype; v_seed bigint; v_round integer; v_start timestamptz; v_new uuid;
begin
  select * into v_room from public.tetris_room where id=p_room_id for update;
  select * into v_match from public.tetris_match where id=p_match_id and room_id=p_room_id;
  if not found or v_match.status <> 'finished' then raise exception 'MATCH_NOT_FINISHED'; end if;
  if v_user is null or not exists(select 1 from public.tetris_room_member where room_id=p_room_id and user_id=v_user and left_at is null) then raise exception 'ROOM_ACCESS_DENIED'; end if;
  update public.tetris_room_member set rematch_ready=true where room_id=p_room_id and user_id=v_user and left_at is null;
  if (select count(*) from public.tetris_room_member where room_id=p_room_id and left_at is null and rematch_ready)=2 then
    v_seed := floor(random()*2147483647)::bigint;
    select coalesce(max(round_no),0)+1 into v_round from public.tetris_match where room_id=p_room_id;
    v_start := clock_timestamp()+interval '3 seconds';
    insert into public.tetris_match(room_id,mode,round_no,status,seed,rules_version,player1_user_id,player2_user_id,started_at)
      select p_room_id,'online_pvp',v_round,'playing',v_seed,v_room.rules_version,
        (select user_id from public.tetris_room_member where room_id=p_room_id and seat=1 and left_at is null),
        (select user_id from public.tetris_room_member where room_id=p_room_id and seat=2 and left_at is null),v_start
      returning id into v_new;
    update public.tetris_room set status='playing',updated_at=now() where id=p_room_id;
    update public.tetris_room_member set rematch_ready=false,is_ready=false where room_id=p_room_id;
    return jsonb_build_object('started',true,'match_id',v_new,'seed',v_seed,'round_no',v_round,'rules_version',v_room.rules_version,'server_start_at',v_start);
  end if;
  return jsonb_build_object('started',false);
end $$;

create or replace function public.tetris_create_local_match(p_mode text,p_rules_version text,p_seed bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_match uuid;
begin
  if v_user is null or not exists(select 1 from public.tetris_player where user_id=v_user) then raise exception 'PROFILE_REQUIRED'; end if;
  if p_mode not in ('solo','ai') or p_seed < 0 or p_seed > 4294967295 then raise exception 'INVALID_MATCH'; end if;
  insert into public.tetris_match(mode,seed,rules_version,player1_user_id,started_at)
    values(p_mode,p_seed,coalesce(p_rules_version,'1.0'),v_user,now()) returning id into v_match;
  return v_match;
end $$;

create or replace function public.tetris_submit_match_result(p_match_id uuid,p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_match public.tetris_match%rowtype; v_mode text; v_outcome text; v_seat smallint; v_score bigint; v_inserted integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.tetris_match where id=p_match_id for update;
  if not found or v_match.status <> 'playing' then raise exception 'MATCH_NOT_ACTIVE'; end if;
  v_mode := v_match.mode;
  if v_mode='online_pvp' then
    select seat into v_seat from public.tetris_room_member where room_id=v_match.room_id and user_id=v_user and left_at is null;
    if v_seat is null or v_user not in (v_match.player1_user_id,v_match.player2_user_id) then raise exception 'MATCH_ACCESS_DENIED'; end if;
    v_outcome := p_result->>'outcome';
    if v_outcome not in ('win','loss','draw') then raise exception 'INVALID_OUTCOME'; end if;
  else
    if v_user <> v_match.player1_user_id then raise exception 'MATCH_ACCESS_DENIED'; end if;
    v_seat := 1;
    v_outcome := case when v_mode='solo' then 'finished' else p_result->>'outcome' end;
    if v_outcome not in ('finished','win','loss','draw') then raise exception 'INVALID_OUTCOME'; end if;
  end if;
  v_score := greatest(0,coalesce((p_result->>'score')::bigint,0));
  insert into public.tetris_match_result(match_id,user_id,seat,score,lines_cleared,final_level,elapsed_ms,attacks_sent,attacks_received,outcome)
  values(p_match_id,v_user,v_seat,v_score,greatest(0,coalesce((p_result->>'lines_cleared')::integer,0)),
    greatest(1,coalesce((p_result->>'final_level')::integer,1)),greatest(0,coalesce((p_result->>'elapsed_ms')::bigint,0)),
    greatest(0,coalesce((p_result->>'attacks_sent')::integer,0)),greatest(0,coalesce((p_result->>'attacks_received')::integer,0)),v_outcome)
  on conflict (match_id,user_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return jsonb_build_object('saved',true,'duplicate',true,'verification_status','unverified'); end if;

  insert into public.tetris_score(user_id,mode,season_key,best_score,total_score,matches_played,wins,losses,draws,rating)
  values(v_user,v_mode,to_char(now(),'YYYY'),v_score,v_score,1,case when v_outcome='win' then 1 else 0 end,case when v_outcome='loss' then 1 else 0 end,case when v_outcome='draw' then 1 else 0 end,
    case when v_outcome='win' then 1016 when v_outcome='loss' then 984 else 1000 end)
  on conflict(user_id,mode,season_key) do update set
    best_score=greatest(public.tetris_score.best_score,excluded.best_score),
    total_score=public.tetris_score.total_score+excluded.total_score,
    matches_played=public.tetris_score.matches_played+1,
    wins=public.tetris_score.wins+excluded.wins,losses=public.tetris_score.losses+excluded.losses,
    draws=public.tetris_score.draws+excluded.draws,rating=public.tetris_score.rating+excluded.rating-1000,updated_at=now();

  if v_mode='online_pvp' then
    if (select count(*) from public.tetris_match_result where match_id=p_match_id)=2 then
      update public.tetris_match set status='finished',finished_at=now(),
        winner_user_id=(select user_id from public.tetris_match_result where match_id=p_match_id and outcome='win' limit 1),
        finish_reason='completed' where id=p_match_id;
      update public.tetris_room set status='finished',updated_at=now() where id=v_match.room_id;
    end if;
  else
    update public.tetris_match set status='finished',finished_at=now(),
      winner_user_id=case when v_outcome='win' then v_user else null end,finish_reason='completed' where id=p_match_id;
  end if;
  return jsonb_build_object('saved',true,'verification_status','unverified');
end $$;

create or replace function public.tetris_get_leaderboard(p_mode text,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_rows jsonb;
begin
  if p_mode not in ('solo','ai','online_pvp') then raise exception 'INVALID_MODE'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('rank',rank_no,'user_id',user_id,'display_name',display_name,
    'best_score',best_score,'wins',wins,'rating',rating) order by rank_no),'[]'::jsonb)
  into v_rows from (
    select row_number() over(order by case when p_mode='online_pvp' then rating else best_score end desc,best_score desc,updated_at asc)::integer as rank_no,
      s.user_id,p.display_name,s.best_score,s.wins,s.rating,s.updated_at
    from public.tetris_score s join public.tetris_player p on p.user_id=s.user_id
    where s.mode=p_mode and s.season_key=to_char(now(),'YYYY')
    order by case when p_mode='online_pvp' then s.rating else s.best_score end desc,s.best_score desc,s.updated_at asc
    limit greatest(1,least(coalesce(p_limit,50),100))
  ) ranked;
  return v_rows;
end $$;

grant execute on function public.tetris_ensure_profile(text,text) to authenticated;
grant execute on function public.tetris_create_room(jsonb) to authenticated;
grant execute on function public.tetris_join_room(text) to authenticated;
grant execute on function public.tetris_get_room_state(uuid) to authenticated;
grant execute on function public.tetris_set_ready(uuid,boolean) to authenticated;
grant execute on function public.tetris_start_match(uuid) to authenticated;
grant execute on function public.tetris_mark_presence_heartbeat(uuid) to authenticated;
grant execute on function public.tetris_leave_room(uuid) to authenticated;
grant execute on function public.tetris_request_rematch(uuid,uuid) to authenticated;
grant execute on function public.tetris_create_local_match(text,text,bigint) to authenticated;
grant execute on function public.tetris_submit_match_result(uuid,jsonb) to authenticated;
revoke execute on function public.tetris_ensure_profile(text,text), public.tetris_create_room(jsonb),
  public.tetris_join_room(text), public.tetris_get_room_state(uuid), public.tetris_set_ready(uuid,boolean),
  public.tetris_start_match(uuid), public.tetris_mark_presence_heartbeat(uuid), public.tetris_leave_room(uuid),
  public.tetris_request_rematch(uuid,uuid), public.tetris_create_local_match(text,text,bigint),
  public.tetris_submit_match_result(uuid,jsonb), public.tetris_get_leaderboard(text,integer),
  public.tetris_is_room_member(text) from public, anon;
grant execute on function public.tetris_get_leaderboard(text,integer) to anon, authenticated;
grant execute on function public.tetris_is_room_member(text) to authenticated;

drop policy if exists tetris_room_private_receive on realtime.messages;
create policy tetris_room_private_receive on realtime.messages for select to authenticated using (
  extension in ('broadcast','presence') and exists (
    select 1 where public.tetris_is_room_member(split_part(realtime.topic(),':',2))
  )
);
drop policy if exists tetris_room_private_send on realtime.messages;
create policy tetris_room_private_send on realtime.messages for insert to authenticated with check (
  extension in ('broadcast','presence') and exists (
    select 1 where public.tetris_is_room_member(split_part(realtime.topic(),':',2))
  )
);
