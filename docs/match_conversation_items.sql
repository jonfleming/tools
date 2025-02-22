create or replace function match_conversation_items(
  match_count int,
  match_threshold float,
  query_embedding vector(1536)

)
returns table (
  item_id text,
  role text,
  topic text,
  "user" text,
  "session" text,
  content text,
  similarity float
)
as $$
begin
  return query (
    select
      ci.item_id, ci.role, ci.topic, ci."user", ci."session", ci.content,
      (ci.embeddings <=> query_embedding) as similarity
    from
      conversation_items as ci
    where ci.embeddings <=> query_embedding < 1 - match_threshold
    order by
      similarity desc
    limit match_count
  );
end;
$$ language plpgsql SECURITY DEFINER;

drop function match_conversation_items

GRANT EXECUTE ON FUNCTION match_conversation_items(int, float, vector) TO anon;
GRANT SELECT ON conversation_items TO anon;
