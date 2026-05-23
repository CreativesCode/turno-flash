-- Migración: agregar intent `clarify`
--
-- Uso: cuando el cliente responde algo que no se clasifica como OK/CANCELAR,
-- wa-inbound dispara wa-send con intent=clarify para pedirle una respuesta
-- válida. Se limita a 1 envío cada 12h por appointment para no spammear.

ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'clarify';
