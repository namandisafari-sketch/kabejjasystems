import { gql } from '@apollo/client';

// Example queries - these should match your Hasura schema

// Parents
export const GET_PARENTS = gql`
  query GetParents($tenant_id: uuid!) {
    parents(where: { tenant_id: { _eq: $tenant_id } }) {
      id
      full_name
      email
      phone
      created_at
    }
  }
`;

export const INSERT_PARENT = gql`
  mutation InsertParent($object: parents_insert_input!) {
    insert_parents_one(object: $object) {
      id
      full_name
      email
    }
  }
`;

// Workers
export const GET_WORKERS = gql`
  query GetWorkers($tenant_id: uuid!) {
    workers(where: { tenant_id: { _eq: $tenant_id } }) {
      id
      full_name
      email
      phone
      role
      is_active
      created_at
    }
  }
`;

export const INSERT_WORKER = gql`
  mutation InsertWorker($object: workers_insert_input!) {
    insert_workers_one(object: $object) {
      id
      full_name
      email
    }
  }
`;

// Rentals
export const GET_RENTALS = gql`
  query GetRentals($tenant_id: uuid!) {
    rentals(where: { tenant_id: { _eq: $tenant_id } }) {
      id
      property_name
      unit_number
      monthly_rent
      status
      tenant_name
      start_date
      end_date
      created_at
    }
  }
`;

export const INSERT_RENTAL = gql`
  mutation InsertRental($object: rentals_insert_input!) {
    insert_rentals_one(object: $object) {
      id
      property_name
      unit_number
    }
  }
`;

// Admins
export const GET_ADMINS = gql`
  query GetAdmins($tenant_id: uuid!) {
    admins(where: { tenant_id: { _eq: $tenant_id } }) {
      id
      full_name
      email
      role
      is_active
      created_at
    }
  }
`;

export const INSERT_ADMIN = gql`
  mutation InsertAdmin($object: admins_insert_input!) {
    insert_admins_one(object: $object) {
      id
      full_name
      email
    }
  }
`;
