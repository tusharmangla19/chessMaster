import { createClerkClient } from '@clerk/nextjs/server';

export interface ClerkUserInfo {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string;
  imageUrl?: string;
}

// Create Clerk client instance only if secret key is available
let clerkClient: ReturnType<typeof createClerkClient> | null = null;

try {
  if (process.env.CLERK_SECRET_KEY) {
    clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  } else {
    console.warn('CLERK_SECRET_KEY not found. Opponent names will show as "Anonymous Player". To fix this, add CLERK_SECRET_KEY to your environment variables.');
  }
} catch (error) {
  console.warn('Failed to initialize Clerk client:', error);
}

export async function getUserInfo(clerkId: string): Promise<ClerkUserInfo | null> {
  // If no Clerk client is available, return null (will fallback to "Anonymous Player")
  if (!clerkClient) {
    console.log('Clerk client not available, returning null for user info');
    return null;
  }

  try {
    const user = await clerkClient.users.getUser(clerkId);
    
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.emailAddresses?.[0]?.emailAddress,
      imageUrl: user.imageUrl
    };
  } catch (error) {
    console.error('Error fetching user info from Clerk:', error);
    return null;
  }
}

export function formatDisplayName(userInfo: ClerkUserInfo): string {
  if (userInfo.firstName && userInfo.lastName) {
    return `${userInfo.firstName} ${userInfo.lastName}`;
  }
  if (userInfo.firstName) {
    return userInfo.firstName;
  }
  if (userInfo.emailAddress) {
    return userInfo.emailAddress.split('@')[0];
  }
  return 'Anonymous Player';
} 