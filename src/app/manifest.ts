import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rally — Find Your People',
    short_name: 'Rally',
    description: 'Find nearby people who want to do the same activity right now',
    start_url: '/map',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6366F1',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
