import AppDataSource from '../config/db.config';

async function checkDatabaseConnection() {
    try {
        // Initialize database connection
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Database connection initialized');
        }

        // Get connection info
        const options = AppDataSource.options as any;
        console.log('\n📊 Database Connection Info:');
        console.log('Type:', options.type);
        console.log('Database URL:', options.url || 'N/A');
        
        // Parse the URL to show details
        if (options.url) {
            const url = new URL(options.url.replace('postgresql://', 'http://'));
            console.log('Host:', url.hostname);
            console.log('Port:', url.port);
            console.log('Database:', url.pathname.substring(1));
            console.log('Username:', url.username);
        }

        // Check if bankCode column exists
        console.log('\n🔍 Checking vendor table structure...');
        const result = await AppDataSource.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'vendor' 
            ORDER BY ordinal_position;
        `);
        
        console.log('\n📋 Vendor table columns:');
        result.forEach((col: any) => {
            console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });

        const hasBankCode = result.some((col: any) => col.column_name === 'bankCode');
        console.log('\n✅ bankCode column exists:', hasBankCode);

        await AppDataSource.destroy();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkDatabaseConnection();
