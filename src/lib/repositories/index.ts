/**
 * Repository factory
 * Returns the appropriate implementation based on FIRESTORE_ENABLED
 */

import { IRepository } from '@/lib/db';
import { InMemoryRepository } from '@/lib/repositories/in-memory';
import { FirestoreRepository } from '@/lib/repositories/firestore';
import { FIRESTORE_ENABLED } from '@/lib/config';

let repositoryInstance: IRepository | null = null;

export function getRepository(): IRepository {
  if (!repositoryInstance) {
    if (FIRESTORE_ENABLED) {
      repositoryInstance = new FirestoreRepository();
    } else {
      repositoryInstance = new InMemoryRepository();
    }
  }
  return repositoryInstance;
}

export function setRepositoryForTesting(repo: IRepository): void {
  repositoryInstance = repo;
}

export function clearRepositoryInstance(): void {
  repositoryInstance = null;
}