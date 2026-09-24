CREATE TYPE user_role AS ENUM ('admin', 'aluno', 'professor');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE materia (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL
);

CREATE TABLE professor (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    materia_id INTEGER REFERENCES materia(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    gravacao_automatica BOOLEAN DEFAULT TRUE
);

CREATE TABLE face (
    id SERIAL PRIMARY KEY,
    professor_id INTEGER NOT NULL REFERENCES professor(id) ON DELETE CASCADE,
    encoding BYTEA NOT NULL
);

CREATE TABLE gravacao (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    professor_id INTEGER NOT NULL REFERENCES professor(id) ON DELETE CASCADE,
    url_video VARCHAR(512) NOT NULL,
    url_pdf VARCHAR(512),
    url_legenda VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aluno_gravacao (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gravacao_id INTEGER NOT NULL REFERENCES gravacao(id) ON DELETE CASCADE,
    visto BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id, gravacao_id)
);