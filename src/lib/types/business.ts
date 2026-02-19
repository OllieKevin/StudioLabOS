export interface ClientRow {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  projectIds: string[];
  contractIds: string[];
}

export interface SupplierRow {
  id: string;
  name: string;
  category?: string;
  contact?: string;
  phone?: string;
  projectIds: string[];
}

export interface ClientDetail {
  client: ClientRow;
  relatedContracts: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  relatedProjects: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export interface SupplierDetail {
  supplier: SupplierRow;
  relatedProjects: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  relatedExpenses: Array<{
    id: string;
    title: string;
    amount: number;
    date?: string;
  }>;
}

export interface ContractRow {
  id: string;
  name: string;
  amount: number;
  status?: string;
  signDate?: string;
  dueDate?: string;
  projectIds: string[];
  clientIds: string[];
}
