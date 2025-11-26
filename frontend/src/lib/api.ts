export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
console.log('API_URL set to:', API_URL);

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && API_URL.includes('localhost')) {
    console.warn('WARNING: API_URL is set to localhost but the application is running on a remote host. This will likely cause connection errors. Please set NEXT_PUBLIC_API_URL to your deployed backend URL.');
}
