import { ReactNode } from 'react';

interface SitesLayoutProps {
  children: ReactNode;
}

export default function SitesLayout({ children }: SitesLayoutProps) {
  // Simple layout without sidebar for sites selection
  return children;
}