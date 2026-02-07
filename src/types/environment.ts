export interface Variable {
  key: string;
  value: string;
  secret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: Variable[];
  isGlobal: boolean;
  sortOrder: number;
  updatedAt: string;
  createdAt: string;
}
