import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Hasura GraphQL endpoint - uses edge function proxy for security
const HASURA_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hasura-proxy`;

// Create HTTP link for GraphQL requests
const httpLink = createHttpLink({
  uri: HASURA_ENDPOINT,
});

// Auth link that adds the Firebase token to requests
const authLink = setContext(async (_, { headers }) => {
  // Get the token from localStorage (set by Firebase Auth)
  const token = localStorage.getItem('hasura_token');
  
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

// Create Apollo Client instance
export const hasuraClient = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Add field policies for pagination, caching, etc.
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

// Helper to update the auth token
export const setHasuraToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('hasura_token', token);
  } else {
    localStorage.removeItem('hasura_token');
  }
};

// Helper to clear auth state
export const clearHasuraAuth = () => {
  localStorage.removeItem('hasura_token');
  hasuraClient.clearStore();
};
