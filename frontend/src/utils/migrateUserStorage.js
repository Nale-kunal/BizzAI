/**
 * Migration utility to fix localStorage user structure
 * This handles the transition from nested to flattened user object
 */

export const migrateUserStorage = () => {
    try {
        // Check if migration already ran in this session
        const migrationRan = sessionStorage.getItem('userMigrationComplete');
        if (migrationRan) {
            return; // Already migrated in this session
        }

        const userStr = localStorage.getItem('user');
        if (!userStr) return;

        const userData = JSON.parse(userStr);

        // Check if we have the old nested structure: { success, token, refreshToken, user: {...} }
        if (userData.user && typeof userData.user === 'object' && userData.token) {
            console.log('🔄 Migrating user data structure...');

            // Flatten the structure: { token, refreshToken, ...user }
            const migratedUser = {
                token: userData.token,
                refreshToken: userData.refreshToken,
                ...userData.user
            };

            localStorage.setItem('user', JSON.stringify(migratedUser));
            sessionStorage.setItem('userMigrationComplete', 'true');
            console.log('✅ User data migration complete');

            // Reload to apply changes
            window.location.reload();
        } else {
            // Mark as complete even if no migration needed
            sessionStorage.setItem('userMigrationComplete', 'true');
        }
    } catch (error) {
        console.error('❌ Error migrating user data:', error);
        // Don't clear user data on error, just mark migration as attempted
        sessionStorage.setItem('userMigrationComplete', 'true');
    }
};
