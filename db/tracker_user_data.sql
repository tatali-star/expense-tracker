-- Данные трекера по пользователям: по строке на раздел у каждого пользователя.
-- user_id — номер из neon_auth."user". Внешнего ключа намеренно нет: таблицей
-- пользователей управляет Neon, а удаление аккаунта не должно стирать финансы.
CREATE TABLE IF NOT EXISTS tracker_user_data (
  user_id uuid NOT NULL,
  key text NOT NULL CHECK (key IN ('entries', 'settings', 'recurring', 'transfers')),
  value jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
