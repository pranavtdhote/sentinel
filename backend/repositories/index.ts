import { isAwsConfigured } from '@/lib/aws/awsClients';
import { IIncidentRepository } from './types';
import { DynamoIncidentRepository } from './dynamoIncidentRepository';
import { MockIncidentRepository } from './mockIncidentRepository';

let repositoryInstance: IIncidentRepository | null = null;

export function getIncidentRepository(): IIncidentRepository {
  if (!repositoryInstance) {
    if (isAwsConfigured()) {
      repositoryInstance = new DynamoIncidentRepository();
    } else {
      repositoryInstance = new MockIncidentRepository();
    }
  }
  return repositoryInstance;
}

export type { IIncidentRepository };
