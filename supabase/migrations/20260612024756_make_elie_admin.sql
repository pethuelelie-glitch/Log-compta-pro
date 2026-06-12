-- Définir pethuelelie@gmail.com comme administrateur
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'pethuelelie@gmail.com'
);
