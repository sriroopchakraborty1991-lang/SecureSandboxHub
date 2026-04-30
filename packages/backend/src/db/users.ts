import {randomUUID} from 'node:crypto';
import type {Db} from './db';

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: number;
};

export function createUser(db: Db, input: {email: string; passwordHash: string; role: User['role']}): User {
  const user: User = {
    id: randomUUID(),
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    createdAt: Date.now()
  };

  db.prepare(
    'INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(user.id, user.email, user.passwordHash, user.role, user.createdAt);

  return user;
}

export function getUserByEmail(db: Db, email: string): User | null {
  const row = db
    .prepare('SELECT id, email, password_hash as passwordHash, role, created_at as createdAt FROM users WHERE email = ?')
    .get(email) as User | undefined;
  return row ?? null;
}

export function getUserById(db: Db, id: string): User | null {
  const row = db
    .prepare('SELECT id, email, password_hash as passwordHash, role, created_at as createdAt FROM users WHERE id = ?')
    .get(id) as User | undefined;
  return row ?? null;
}

