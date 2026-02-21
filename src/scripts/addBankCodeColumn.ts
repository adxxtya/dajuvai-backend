import AppDataSource from '../config/db.config';

async function addBankCodeColumn() {
    try {
        // Initialize database connection
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Database connection initialized');
        }

        // Add the bankCode column if it doesn't exist
        await AppDataSource.query(`
            ALTER TABLE vendor ADD COLUMN IF NOT EXISTS "bankCode" VARCHAR NULL;
        `);
        
        console.log('✅ bankCode column added successfully');

        // Verify the column was added
        const result = await AppDataSource.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'vendor' AND column_name = 'bankCode';
        `);
        
        console.log('Column info:', result);

        await AppDataSource.destroy();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding bankCode column:', error);
        process.exit(1);
    }
}

addBankCodeColumn();
