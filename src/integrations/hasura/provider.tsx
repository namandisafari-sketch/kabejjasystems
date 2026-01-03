import React, { ReactNode } from 'react';
import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';
import { hasuraClient } from './client';

interface HasuraProviderProps {
  children: ReactNode;
}

export const HasuraProvider: React.FC<HasuraProviderProps> = ({ children }) => {
  return (
    <BaseApolloProvider client={hasuraClient}>
      {children}
    </BaseApolloProvider>
  );
};
