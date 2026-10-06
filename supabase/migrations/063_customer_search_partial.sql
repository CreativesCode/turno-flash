-- P1-11: the customer search missed partial matches. Full-text only matches
-- whole words, and ILIKE only ran for terms under 3 characters, so "Mar"
-- found nobody called "Mariela" and "5256" found no phone. Now ILIKE always
-- runs (also on the full name), and phones also match by digits only, so
-- "52 56" or "+53 5256" find "+5352564206". Same signature and invoker
-- security as before (048).

CREATE OR REPLACE FUNCTION public.search_customers_fulltext(
  p_organization_id uuid,
  p_search_term text,
  p_is_active boolean DEFAULT NULL::boolean,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS SETOF customers
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_digits text := regexp_replace(COALESCE(p_search_term, ''), '\D', '', 'g');
BEGIN
  RETURN QUERY
  SELECT c.*
  FROM customers c
  WHERE
    c.organization_id = p_organization_id
    AND (
      to_tsvector('spanish',
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '') || ' ' ||
        COALESCE(c.phone, '') || ' ' ||
        COALESCE(c.email, '')
      ) @@ plainto_tsquery('spanish', p_search_term)
      OR (COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))
           ILIKE '%' || p_search_term || '%'
      OR c.phone ILIKE '%' || p_search_term || '%'
      OR c.email ILIKE '%' || p_search_term || '%'
      OR (
        length(v_digits) >= 3
        AND regexp_replace(COALESCE(c.phone, ''), '\D', '', 'g') LIKE '%' || v_digits || '%'
      )
    )
    AND (p_is_active IS NULL OR c.is_active = p_is_active)
  ORDER BY
    CASE
      WHEN c.first_name ILIKE p_search_term || '%' THEN 1
      WHEN c.last_name ILIKE p_search_term || '%' THEN 2
      WHEN c.phone ILIKE '%' || p_search_term || '%' THEN 3
      ELSE 4
    END,
    c.first_name,
    c.last_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
