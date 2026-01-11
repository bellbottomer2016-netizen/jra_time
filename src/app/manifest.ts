import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'JRA Race Alert',
        short_name: 'RaceAlert',
        description: 'JRA Race Deadline Notifier',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a4f20',
        theme_color: '#0a4f20',
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
