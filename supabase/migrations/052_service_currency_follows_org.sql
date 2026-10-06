-- ============================================
-- 052: A service's currency is always its organization's (QA plan P0-14)
-- ============================================
-- The currency is a property of the organization (039), but services kept
-- their own column, filled with 'USD' by the dashboard: the public page showed
-- "US$ 8500" for a business that charges CUP. Instead of teaching every reader
-- to look at the organization, the column now follows it.

UPDATE public.services s
SET currency = o.currency
FROM public.organizations o
WHERE o.id = s.organization_id
  AND s.currency IS DISTINCT FROM o.currency;

CREATE OR REPLACE FUNCTION public.set_service_currency_from_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT o.currency INTO NEW.currency
  FROM public.organizations o
  WHERE o.id = NEW.organization_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_service_currency_from_org_trigger
  BEFORE INSERT OR UPDATE OF currency, organization_id ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_service_currency_from_org();

CREATE OR REPLACE FUNCTION public.sync_services_currency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.services SET currency = NEW.currency
  WHERE organization_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_services_currency_trigger
  AFTER UPDATE OF currency ON public.organizations
  FOR EACH ROW
  WHEN (NEW.currency IS DISTINCT FROM OLD.currency)
  EXECUTE FUNCTION public.sync_services_currency();

-- Trigger functions are not meant to be called directly (same as 034/045)
REVOKE EXECUTE ON FUNCTION public.set_service_currency_from_org() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_services_currency() FROM PUBLIC, anon, authenticated;
