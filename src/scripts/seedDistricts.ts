import AppDataSource from '../config/db.config';
import { District } from '../entities/district.entity';

/**
 * Seed script to populate all 77 districts of Nepal
 * Run with: npx ts-node src/scripts/seedDistricts.ts
 */

const districts = [
    "Sindhuli", "Ramechhap", "Dolakha", "Bhaktapur", "Dhading",
    "Kathmandu", "Kavrepalanchok", "Lalitpur", "Nuwakot", "Rasuwa",
    "Sindhupalchok", "Chitwan", "Makwanpur", "Achham", "Baitadi",
    "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti",
    "Kailali", "Kanchanpur", "Kapilvastu", "Rupandehi", "Arghakhanchi",
    "Gulmi", "Palpa", "Dang", "Pyuthan", "Rolpa",
    "Eastern Rukum", "Banke", "Bardiya", "Bhojpur", "Dhankuta",
    "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga",
    "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung",
    "Terhathum", "Udayapur", "Sarlahi", "Dhanusha", "Bara",
    "Rautahat", "Saptari", "Siraha", "Mahottari", "Parsa",
    "Parasi", "Baglung", "Gorkha", "Kaski", "Lamjung",
    "Manang", "Mustang", "Myagdi", "Nawalpur", "Parbat",
    "Syangja", "Tanahun", "Western Rukum", "Salyan", "Dolpa",
    "Humla", "Jumla", "Kalikot", "Mugu", "Surkhet",
    "Dailekh", "Jajarkot"
];

async function seedDistricts() {
    try {
        // Initialize database connection
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('Database connection initialized');
        }

        const districtRepository = AppDataSource.getRepository(District);

        console.log('Starting district seeding...');
        let created = 0;
        let skipped = 0;

        for (const districtName of districts) {
            // Check if district already exists (case-insensitive)
            const existing = await districtRepository
                .createQueryBuilder('district')
                .where('LOWER(district.name) = LOWER(:name)', { name: districtName })
                .getOne();

            if (existing) {
                console.log(`✓ District "${districtName}" already exists (ID: ${existing.id})`);
                skipped++;
            } else {
                const newDistrict = districtRepository.create({ name: districtName });
                await districtRepository.save(newDistrict);
                console.log(`✓ Created district "${districtName}"`);
                created++;
            }
        }

        console.log('\n=== Seeding Complete ===');
        console.log(`Created: ${created} districts`);
        console.log(`Skipped: ${skipped} districts (already exist)`);
        console.log(`Total: ${districts.length} districts`);

        await AppDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding districts:', error);
        await AppDataSource.destroy();
        process.exit(1);
    }
}

seedDistricts();
