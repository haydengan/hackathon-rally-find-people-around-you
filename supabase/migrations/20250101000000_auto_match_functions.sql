-- RPC: get_nearby_user_ids
-- Returns user_ids of users who have created or joined events within radius_km of the reference point
CREATE OR REPLACE FUNCTION get_nearby_user_ids(
  ref_lat DOUBLE PRECISION,
  ref_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  exclude_user_id UUID
)
RETURNS TABLE(user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT e.creator_id AS user_id
  FROM events e
  WHERE ST_DWithin(
    ST_MakePoint(e.location_lng, e.location_lat)::geography,
    ST_MakePoint(ref_lng, ref_lat)::geography,
    radius_km * 1000
  )
  AND e.creator_id != exclude_user_id

  UNION

  SELECT DISTINCT ep.user_id
  FROM event_participants ep
  JOIN events e ON e.id = ep.event_id
  WHERE ST_DWithin(
    ST_MakePoint(e.location_lng, e.location_lat)::geography,
    ST_MakePoint(ref_lng, ref_lat)::geography,
    radius_km * 1000
  )
  AND ep.user_id != exclude_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_popular_location
-- Returns the most popular location_name for a given activity type within radius_km
CREATE OR REPLACE FUNCTION get_popular_location(
  p_activity_type TEXT,
  ref_lat DOUBLE PRECISION,
  ref_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION
)
RETURNS TABLE(location_name TEXT, event_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT e.location_name, COUNT(*) AS event_count
  FROM events e
  WHERE e.activity_type = p_activity_type
  AND ST_DWithin(
    ST_MakePoint(e.location_lng, e.location_lat)::geography,
    ST_MakePoint(ref_lng, ref_lat)::geography,
    radius_km * 1000
  )
  GROUP BY e.location_name
  ORDER BY event_count DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
