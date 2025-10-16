export enum Status {
  SUCCESS = 'SUCCESS',
  SKIPPED = 'SKIPPED',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
}

export enum FileOperation {
  CREATE = 'CREATE',
  MODIFY = 'MODIFY',
  DELETE = 'DELETE',
}

export enum ChatRole {
  system = 'system',
  user = 'user',
  assistant = 'assistant',
}

export enum ContentType {
  FULL = 'full',
  DIFF = 'diff',
}
