export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && API_URL.includes('localhost')) {
    console.warn('WARNING: API_URL is set to localhost but the application is running on a remote host. This will likely cause connection errors. Please set NEXT_PUBLIC_API_URL to your deployed backend URL.');
}

export async function mergeTests(testIds: string[], title: string, token: string) {
  const response = await fetch(`${API_URL}/tests/merge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ test_ids: testIds, title }),
  });
  if (!response.ok) {
    throw new Error("Failed to merge tests");
  }
  return response.json();
}

export async function batchUpdateTests(updates: any[], deletes: string[], token: string) {
  const response = await fetch(`${API_URL}/tests/batch_update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ updates, deletes }),
  });
  if (!response.ok) {
    throw new Error("Failed to batch update tests");
  }
  return response.json();
}
