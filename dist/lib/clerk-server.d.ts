export interface ClerkUserInfo {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    emailAddress?: string;
    imageUrl?: string;
}
export declare function getUserInfo(clerkId: string): Promise<ClerkUserInfo | null>;
export declare function formatDisplayName(userInfo: ClerkUserInfo): string;
//# sourceMappingURL=clerk-server.d.ts.map