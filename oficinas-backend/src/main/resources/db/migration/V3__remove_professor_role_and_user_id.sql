ALTER TABLE professor DROP COLUMN user_id;

UPDATE users SET role = 'aluno' WHERE role = 'professor';

ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('admin', 'aluno');
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role;
DROP TYPE user_role_old;