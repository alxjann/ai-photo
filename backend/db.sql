DROP TABLE IF EXISTS photo;
CREATE EXTENSION IF NOT EXISTS vector;
 
CREATE TABLE IF NOT EXISTS public.photo (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               uuid DEFAULT auth.uid() REFERENCES auth.users(id),
    device_asset_id       text NOT NULL,
    descriptive           text NOT NULL,
    literal               text NOT NULL,
    category              text NULL,
    descriptive_embedding vector(1536) NULL,
    literal_embedding     vector(1536) NULL,
    tags                  text NULL,
    created_at            timestamptz DEFAULT now(),
    updated_at            timestamptz DEFAULT now(),
    fts tsvector GENERATED ALWAYS AS (
        to_tsvector('english'::regconfig,
            COALESCE(descriptive, '') || ' ' ||
            COALESCE(literal, '') || ' ' ||
            COALESCE(tags, '') || ' ' ||
            COALESCE(faces, '')
        )
    ) STORED
);
 
CREATE INDEX IF NOT EXISTS photo_fts_idx
    ON public.photo USING gin (fts);
 
CREATE INDEX IF NOT EXISTS photo_descriptive_embedding_idx
    ON public.photo USING hnsw (descriptive_embedding vector_cosine_ops);
 
CREATE INDEX IF NOT EXISTS photo_literal_embedding_idx
    ON public.photo USING hnsw (literal_embedding vector_cosine_ops);
 
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
 
CREATE TRIGGER photo_updated_at 
    BEFORE UPDATE ON public.photo
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
 
ALTER TABLE photo ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY "Users can manage their own photos"
    ON photo FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
 
DROP FUNCTION hybrid_search_photos(text,vector,integer,uuid,double precision,double precision,integer);

CREATE OR REPLACE FUNCTION hybrid_search_photos(
    query_text TEXT,
    query_embedding VECTOR(1536),
    match_count INT,
    user_id UUID,
    full_text_weight FLOAT = 1.0,
    semantic_weight FLOAT = 2.0,
    rrf_k INT = 50
)
RETURNS TABLE (
    id UUID,
    device_asset_id TEXT,
    descriptive TEXT,
    literal TEXT,
    tags TEXT,
    category TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql AS $$
WITH full_text AS (
    SELECT
        p.id,
        row_number() OVER (ORDER BY ts_rank_cd(p.fts, websearch_to_tsquery(query_text)) DESC) AS rank_ix
    FROM photo p
    WHERE p.user_id = hybrid_search_photos.user_id
      AND p.fts @@ websearch_to_tsquery(query_text)
    LIMIT LEAST(match_count, 30) * 2
),
semantic AS (
    SELECT
        p.id,
        row_number() OVER (
            ORDER BY LEAST(
                p.descriptive_embedding <=> query_embedding,
                COALESCE(p.literal_embedding <=> query_embedding, 1)
            )
        ) AS rank_ix
    FROM photo p
    WHERE p.user_id = hybrid_search_photos.user_id
      AND p.descriptive_embedding IS NOT NULL
      AND LEAST(
            p.descriptive_embedding <=> query_embedding,
            COALESCE(p.literal_embedding <=> query_embedding, 1)
          ) < 0.75
    LIMIT LEAST(match_count, 30) * 2
)
SELECT
    p.id,
    p.device_asset_id,
    p.descriptive,
    p.literal,
    p.tags,
    p.category,
    p.created_at
FROM full_text
FULL OUTER JOIN semantic ON full_text.id = semantic.id
JOIN photo p ON COALESCE(full_text.id, semantic.id) = p.id
ORDER BY (
    COALESCE(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight +
    COALESCE(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight
) DESC
LIMIT LEAST(match_count, 30);
$$;





-- Albums
create table if not exists album (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cover_photo_id uuid null references photo(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists album_user_name_unique
  on album (user_id, lower(name));

-- Many-to-many: album <-> photo
create table if not exists album_photo (
  album_id uuid not null references album(id) on delete cascade,
  photo_id uuid not null references photo(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (album_id, photo_id)
);

alter table public.album enable row level security;

drop policy if exists "Users can manage their own albums" on public.album;

create policy "Users can manage their own albums"
  on public.album for all to authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

alter table public.album_photo enable row level security;


drop policy if exists "Users can manage their own album_photo" on public.album_photo;

create policy "Users can manage their own album_photo"
on public.album_photo
for all
to authenticated
using (
  exists (
    select 1 from public.album a
    where a.id = album_photo.album_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.album a
    where a.id = album_photo.album_id
      and a.user_id = auth.uid()
  )
  and exists (
    select 1 from public.photo p
    where p.id = album_photo.photo_id
      and p.user_id = auth.uid()
  )
);



CREATE TABLE public.known_face (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  descriptor FLOAT8[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE known_face ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own faces"
ON known_face
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);