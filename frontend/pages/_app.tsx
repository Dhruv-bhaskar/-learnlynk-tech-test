
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import components

// Create a new QueryClient instance outside of the component
const queryClient = new QueryClient(); 

export default function App({ Component, pageProps }: AppProps) {
  return (
    // Wrap the component tree
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}