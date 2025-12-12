import { DataSource } from 'typeorm';
import { Event, EventStatus, EventVisibility } from '../entities/event.entity';
import { Organiser } from '../entities/organiser.entity';
import { User, UserRole } from '../entities/user.entity';
import { Venue } from '../entities/venue.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { v4 as uuidv4 } from 'uuid';

// Event categories
const categories = [
  'Music',
  'Nightlife',
  'Wellness',
  'Corporate',
  'Family & Lifestyle',
  'Food & Culture',
  'Campus Life',
  'Community Impact',
  'Creator Exclusives',
  'Weekend Escapes',
  'Afro House',
  'Top Picks',
  'Sports',
  'Arts',
  'Technology',
  'Education',
  'Business',
  'Entertainment',
];

// Event tags pool
const tagPools: Record<string, string[]> = {
  'Music': ['Live Music', 'DJ Set', 'Concert', 'Festival', 'Acoustic', 'Electronic', 'Hip Hop', 'Afrobeat'],
  'Nightlife': ['Club Night', 'Rooftop', 'VIP', 'Dance', 'Cocktails', 'Late Night'],
  'Wellness': ['Yoga', 'Meditation', 'Retreat', 'Fitness', 'Mindfulness', 'Health'],
  'Corporate': ['Conference', 'Networking', 'Workshop', 'Seminar', 'Business', 'Professional'],
  'Family & Lifestyle': ['Family Friendly', 'Kids', 'Outdoor', 'Picnic', 'Community'],
  'Food & Culture': ['Food Festival', 'Cultural', 'Traditional', 'Cuisine', 'Tasting'],
  'Campus Life': ['Student', 'University', 'Campus', 'Academic', 'College'],
  'Community Impact': ['Charity', 'Volunteer', 'Social', 'Community', 'Impact'],
  'Creator Exclusives': ['Exclusive', 'Creator', 'Influencer', 'VIP', 'Limited'],
  'Weekend Escapes': ['Weekend', 'Escape', 'Retreat', 'Getaway', 'Relaxation'],
  'Afro House': ['Afro House', 'House Music', 'Electronic', 'Dance', 'DJ'],
  'Top Picks': ['Featured', 'Popular', 'Trending', 'Recommended', 'Best'],
  'Sports': ['Football', 'Basketball', 'Running', 'Marathon', 'Tournament'],
  'Arts': ['Exhibition', 'Gallery', 'Theater', 'Performance', 'Art Show'],
  'Technology': ['Tech Talk', 'Hackathon', 'Startup', 'Innovation', 'AI'],
  'Education': ['Learning', 'Workshop', 'Training', 'Course', 'Seminar'],
  'Business': ['Networking', 'Conference', 'Business', 'Professional', 'Corporate'],
  'Entertainment': ['Entertainment', 'Show', 'Performance', 'Fun', 'Enjoyment'],
};

// Kenyan cities
const cities = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Eldoret',
  'Thika',
  'Malindi',
  'Kitale',
  'Garissa',
  'Kakamega',
];

// Venue names pool
const venueNames = [
  'Kenyatta International Conference Centre',
  'Carnivore Grounds',
  'Ngong Racecourse',
  'Uhuru Gardens',
  'Kasarani Stadium',
  'Nyayo Stadium',
  'Safari Park Hotel',
  'Radisson Blu Hotel',
  'Villa Rosa Kempinski',
  'The Hub Karen',
  'Two Rivers Mall',
  'Westgate Mall',
  'Garden City Mall',
  'Sarit Centre',
  'Yaya Centre',
];

// Event title templates
const eventTemplates = [
  '{city} Music Festival {year}',
  '{category} Experience in {city}',
  'Summer {category} Festival',
  '{category} Night at {venue}',
  '{city} {category} Showcase',
  'Annual {category} Gala',
  '{category} Weekend Retreat',
  '{city} {category} Conference',
  'Premium {category} Event',
  '{category} Live Experience',
  '{city} {category} Expo',
  'Exclusive {category} Gathering',
  '{category} Masterclass',
  '{city} {category} Summit',
  '{category} Celebration',
];

// Full Unsplash URLs from mock data - using exact URLs that were working
const unsplashImages: Record<string, string[]> = {
  'Music': [
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  ],
  'Nightlife': [
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1464375117522-1311d6a5b81b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522335780853-5aa265f9c9f2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522337360782-519a42aa3cf7?auto=format&fit=crop&w=1200&q=80',
  ],
  'Wellness': [
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522335780853-5aa265f9c9f2?auto=format&fit=crop&w=1200&q=80',
  ],
  'Corporate': [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
  ],
  'Family & Lifestyle': [
    'https://images.unsplash.com/photo-1511988617509-a57c8a211659?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1454922915609-78549ad709bb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  ],
  'Food & Culture': [
    'https://images.unsplash.com/photo-1555939596-5857b0c0e8b9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
  ],
  'Arts': [
    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80',
  ],
  'Technology': [
    'https://images.unsplash.com/photo-1516321318467-e220052a202e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  ],
  'Education': [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  ],
  'Business': [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
  ],
  'Entertainment': [
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
  ],
};

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 250);
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getUnsplashImage(category: string): string {
  const categoryKey = category.split(' ')[0]; // Get first word for matching
  const images = unsplashImages[categoryKey] || unsplashImages['Music'];
  return getRandomElement(images);
}

export async function seedEvents(dataSource: DataSource): Promise<void> {
  const eventRepository = dataSource.getRepository(Event);
  const organiserRepository = dataSource.getRepository(Organiser);
  const userRepository = dataSource.getRepository(User);
  const venueRepository = dataSource.getRepository(Venue);
  const ticketTypeRepository = dataSource.getRepository(TicketType);

  console.log('🌱 Starting events seeding...\n');

  // Delete all existing events first
  console.log('🗑️  Deleting existing events...');
  const existingEvents = await eventRepository.find();
  if (existingEvents.length > 0) {
    // Delete associated ticket types first (due to foreign key constraints)
    for (const event of existingEvents) {
      const ticketTypes = await ticketTypeRepository.find({ where: { eventId: event.id } });
      if (ticketTypes.length > 0) {
        await ticketTypeRepository.remove(ticketTypes);
      }
    }
    await eventRepository.remove(existingEvents);
    console.log(`✅ Deleted ${existingEvents.length} existing events\n`);
  } else {
    console.log('ℹ️  No existing events to delete\n');
  }

  // Get or create organisers from users with ORGANISER role
  const organiserUsers = await userRepository.find({
    where: { activeRole: UserRole.ORGANISER },
    relations: ['rolesList'],
  });

  if (organiserUsers.length === 0) {
    console.log('⚠️  No organiser users found. Please seed users first.');
    return;
  }

  const organisers: Organiser[] = [];
  for (const user of organiserUsers) {
    let organiser = await organiserRepository.findOne({
      where: { ownerId: user.id },
    });

    if (!organiser) {
      organiser = organiserRepository.create({
        id: uuidv4(),
        ownerId: user.id,
        name: `${user.firstName} ${user.lastName} Events`,
        description: `Event organizer managed by ${user.firstName} ${user.lastName}`,
      });
      organiser = await organiserRepository.save(organiser);
      console.log(`✅ Created organiser: ${organiser.name}`);
    }
    organisers.push(organiser);
  }

  if (organisers.length === 0) {
    console.log('⚠️  No organisers available. Cannot seed events.');
    return;
  }

  // Create some venues if they don't exist
  const existingVenues = await venueRepository.find();
  let venues: Venue[] = [...existingVenues];

  if (venues.length < 10) {
    const citiesToUse = getRandomElements(cities, 10);
    for (let i = venues.length; i < 10; i++) {
      const city = citiesToUse[i % citiesToUse.length];
      const venueName = getRandomElement(venueNames);
      const venue = venueRepository.create({
        id: uuidv4(),
        name: `${venueName} - ${city}`,
        address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${city}`,
        city: city,
        country: 'Kenya',
        capacity: Math.floor(Math.random() * 5000) + 100,
        latitude: -1.2921 + (Math.random() - 0.5) * 0.1, // Around Nairobi
        longitude: 36.8219 + (Math.random() - 0.5) * 0.1,
      });
      const savedVenue = await venueRepository.save(venue);
      venues.push(savedVenue);
      console.log(`✅ Created venue: ${savedVenue.name}`);
    }
  }

  // Generate 5000 events with at least 50 per category
  const totalEventsToCreate = 5000;
  const minEventsPerCategory = 50;
  const totalCategories = categories.length;
  const guaranteedEvents = totalCategories * minEventsPerCategory; // 18 * 50 = 900
  const remainingEvents = totalEventsToCreate - guaranteedEvents; // 5000 - 900 = 4100
  const pastEventsCount = 200; // Explicitly create 200 past events

  const now = new Date();
  const pastDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  const recentPastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const statuses: EventStatus[] = [
    EventStatus.PUBLISHED,
    EventStatus.PUBLISHED,
    EventStatus.PUBLISHED,
    EventStatus.PUBLISHED,
    EventStatus.DRAFT,
    EventStatus.PENDING_APPROVAL,
    EventStatus.COMPLETED,
  ];

  console.log(`\n📅 Creating ${totalEventsToCreate} events...`);
  console.log(`   - ${pastEventsCount} events with past dates (for testing past event functionality)`);
  console.log(`   - ${minEventsPerCategory} events guaranteed per category (${guaranteedEvents} total)`);
  console.log(`   - ${remainingEvents} additional events distributed randomly\n`);

  let eventCount = 0;
  const categoryCounts: Record<string, number> = {};
  categories.forEach(cat => categoryCounts[cat] = 0);

  // First, create explicit past events
  console.log(`📅 Creating ${pastEventsCount} past events...\n`);
  for (let i = 0; i < pastEventsCount; i++) {
    const category = getRandomElement(categories);
    const organiser = getRandomElement(organisers);
    const venue = Math.random() > 0.3 ? getRandomElement(venues) : undefined;
    const city = getRandomElement(cities);
    const venueName = venue ? venue.name : getRandomElement(venueNames);

    // Generate event title with "Past" indicator
    const year = new Date().getFullYear() - (Math.random() > 0.5 ? 0 : 1);
    let title = getRandomElement(eventTemplates)
      .replace('{city}', city)
      .replace('{category}', category)
      .replace('{venue}', venueName)
      .replace('{year}', year.toString());
    
    title = `Past: ${title}`;
    const slug = generateSlug(title);

    // Check if event with this slug already exists
    const existingEvent = await eventRepository.findOne({ where: { slug } });
    if (existingEvent) {
      continue; // Skip if exists
    }

    // Generate past dates (between 1 year ago and 7 days ago)
    const startsAt = getRandomDate(pastDate, recentPastDate);
    const durationHours = Math.floor(Math.random() * 48) + 2;
    const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

    // Past events should be COMPLETED
    const status = EventStatus.COMPLETED;

    // Get tags for category
    const categoryTags = tagPools[category] || tagPools['Music'] || ['Event', 'Featured', 'Popular'];
    const tagCount = Math.min(Math.floor(Math.random() * 4) + 2, categoryTags.length);
    const tags = getRandomElements(categoryTags, tagCount);

    // Generate description
    const description = `This was an amazing ${category.toLowerCase()} experience in ${city} that took place in the past. ${tags.join(', ')} and more!`;

    // Get Unsplash image
    const coverImageUrl = getUnsplashImage(category);
    const galleryImages = Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => 
      getUnsplashImage(category)
    );

    // Create event
    const event = eventRepository.create({
      id: uuidv4(),
      organiserId: organiser.id,
      venueId: venue?.id,
      title,
      slug,
      description,
      category,
      tags,
      visibility: EventVisibility.PUBLIC,
      status,
      startsAt,
      endsAt,
      timezone: 'Africa/Nairobi',
      capacity: Math.floor(Math.random() * 5000) + 100,
      coverImageUrl,
      imageGalleryUrls: galleryImages,
      salesStartsAt: new Date(startsAt.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
      salesEndsAt: new Date(startsAt.getTime() - 1 * 60 * 60 * 1000), // 1 hour before
    });

    const savedEvent = await eventRepository.save(event);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    eventCount++;

    // Create ticket types
    const ticketTypeCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < ticketTypeCount; j++) {
      const ticketType = ticketTypeRepository.create({
        id: uuidv4(),
        eventId: savedEvent.id,
        name: j === 0 ? 'General Admission' : `VIP Tier ${j}`,
        description: j === 0 ? 'Standard entry ticket' : `Premium experience tier ${j}`,
        priceCents: Math.floor(Math.random() * 950000) + 50000, // KES 500 - 10,000
        currency: 'KES',
        quantityTotal: Math.floor(Math.random() * 1000) + 50,
        quantitySold: Math.floor(Math.random() * 100),
      });
      await ticketTypeRepository.save(ticketType);
    }

    if ((i + 1) % 50 === 0) {
      console.log(`   ✅ Created ${i + 1}/${pastEventsCount} past events`);
    }
  }
  console.log(`   ✅ Completed creating ${pastEventsCount} past events\n`);

  // Now create guaranteed events for each category
  console.log('📊 Creating guaranteed events per category...');
  for (const category of categories) {
    for (let i = 0; i < minEventsPerCategory; i++) {
      const organiser = getRandomElement(organisers);
      const venue = Math.random() > 0.3 ? getRandomElement(venues) : undefined;
      const city = getRandomElement(cities);
      const venueName = venue ? venue.name : getRandomElement(venueNames);

      // Generate event title
      const year = new Date().getFullYear() + (Math.random() > 0.5 ? 0 : 1);
      let title = getRandomElement(eventTemplates)
        .replace('{city}', city)
        .replace('{category}', category)
        .replace('{venue}', venueName)
        .replace('{year}', year.toString());

      const slug = generateSlug(title);

      // Check if event with this slug already exists
      const existingEvent = await eventRepository.findOne({ where: { slug } });
      if (existingEvent) {
        title = `${title} ${i + 1}`;
        continue; // Skip if exists, will retry with modified title
      }

      // Generate dates
      const startsAt = getRandomDate(pastDate, futureDate);
      const durationHours = Math.floor(Math.random() * 48) + 2;
      const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

      // Determine status based on date
      let status = getRandomElement(statuses);
      if (startsAt < now && endsAt < now) {
        status = EventStatus.COMPLETED;
      } else if (startsAt > now && status === EventStatus.PUBLISHED) {
        status = EventStatus.PUBLISHED;
      }

      // Get tags for category
      const categoryTags = tagPools[category] || tagPools['Music'] || ['Event', 'Featured', 'Popular'];
      const tagCount = Math.min(Math.floor(Math.random() * 4) + 2, categoryTags.length);
      const tags = getRandomElements(categoryTags, tagCount);

      // Generate description
      const description = `Join us for an amazing ${category.toLowerCase()} experience in ${city}. ${tags.join(', ')} and more! Don't miss out on this incredible event.`;

      // Get Unsplash image
      const coverImageUrl = getUnsplashImage(category);
      const galleryImages = Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => 
        getUnsplashImage(category)
      );

      // Create event
      const event = eventRepository.create({
        id: uuidv4(),
        organiserId: organiser.id,
        venueId: venue?.id,
        title,
        slug,
        description,
        category,
        tags,
        visibility: EventVisibility.PUBLIC,
        status,
        startsAt,
        endsAt,
        timezone: 'Africa/Nairobi',
        capacity: Math.floor(Math.random() * 5000) + 100,
        coverImageUrl,
        imageGalleryUrls: galleryImages,
        salesStartsAt: new Date(startsAt.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
        salesEndsAt: new Date(startsAt.getTime() - 1 * 60 * 60 * 1000), // 1 hour before
      });

      const savedEvent = await eventRepository.save(event);
      categoryCounts[category]++;
      eventCount++;

      // Create ticket types
      const ticketTypeCount = Math.floor(Math.random() * 3) + 1; // 1-3 ticket types
      for (let j = 0; j < ticketTypeCount; j++) {
        const ticketType = ticketTypeRepository.create({
          id: uuidv4(),
          eventId: savedEvent.id,
          name: j === 0 ? 'General Admission' : `VIP Tier ${j}`,
          description: j === 0 ? 'Standard entry ticket' : `Premium experience tier ${j}`,
          priceCents: Math.floor(Math.random() * 950000) + 50000, // KES 500 - 10,000
          currency: 'KES',
          quantityTotal: Math.floor(Math.random() * 1000) + 50,
          quantitySold: Math.floor(Math.random() * 100),
        });
        await ticketTypeRepository.save(ticketType);
      }

      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ ${category}: ${i + 1}/${minEventsPerCategory} events created`);
      }
    }
    console.log(`   ✅ ${category}: ${minEventsPerCategory} events completed\n`);
  }

  // Now create remaining events distributed randomly (adjusting for past events already created)
  const remainingAfterPast = remainingEvents - pastEventsCount;
  console.log(`📊 Creating ${remainingAfterPast} additional events (random distribution)...\n`);
  for (let i = 0; i < remainingAfterPast; i++) {
    const category = getRandomElement(categories);
    const organiser = getRandomElement(organisers);
    const venue = Math.random() > 0.3 ? getRandomElement(venues) : undefined; // 70% have venues
    const city = getRandomElement(cities);
    const venueName = venue ? venue.name : getRandomElement(venueNames);

    // Generate event title
    const year = new Date().getFullYear() + (Math.random() > 0.5 ? 0 : 1);
    let title = getRandomElement(eventTemplates)
      .replace('{city}', city)
      .replace('{category}', category)
      .replace('{venue}', venueName)
      .replace('{year}', year.toString());
    
    // Ensure unique title
    title = `${title} ${i + 1}`;

    const slug = generateSlug(title);

    // Check if event with this slug already exists
    const existingEvent = await eventRepository.findOne({ where: { slug } });
    if (existingEvent) {
      continue; // Skip if exists
    }

    // Generate dates
    const startsAt = getRandomDate(pastDate, futureDate);
    const durationHours = Math.floor(Math.random() * 48) + 2; // 2 to 50 hours
    const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

    // Determine status based on date
    let status = getRandomElement(statuses);
    if (startsAt < now && endsAt < now) {
      status = EventStatus.COMPLETED;
    } else if (startsAt > now && status === EventStatus.PUBLISHED) {
      status = EventStatus.PUBLISHED; // Keep published for future events
    }

    // Get tags for category
    const categoryTags = tagPools[category] || tagPools['Music'] || ['Event', 'Featured', 'Popular'];
    const tagCount = Math.min(Math.floor(Math.random() * 4) + 2, categoryTags.length);
    const tags = getRandomElements(categoryTags, tagCount);

    // Generate description
    const description = `Join us for an amazing ${category.toLowerCase()} experience in ${city}. ${tags.join(', ')} and more! Don't miss out on this incredible event.`;

    // Get Unsplash image
    const coverImageUrl = getUnsplashImage(category);
    const galleryImages = Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => 
      getUnsplashImage(category)
    );

    // Create event
    const event = eventRepository.create({
      id: uuidv4(),
      organiserId: organiser.id,
      venueId: venue?.id,
      title,
      slug,
      description,
      category,
      tags,
      visibility: EventVisibility.PUBLIC,
      status,
      startsAt,
      endsAt,
      timezone: 'Africa/Nairobi',
      capacity: venue ? venue.capacity : Math.floor(Math.random() * 5000) + 50,
      coverImageUrl,
      imageGalleryUrls: galleryImages,
      salesStartsAt: new Date(startsAt.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
      salesEndsAt: new Date(startsAt.getTime() - 1 * 60 * 60 * 1000), // 1 hour before
    });

    const savedEvent = await eventRepository.save(event);

    // Create 1-3 ticket types for each event
    const ticketTypeCount = Math.floor(Math.random() * 3) + 1;
    const ticketTypeNames = ['General Admission', 'VIP', 'Early Bird', 'Standard', 'Premium'];
    const prices = [500, 1000, 1500, 2000, 2500, 3000, 5000, 10000];

    for (let j = 0; j < ticketTypeCount; j++) {
      const ticketType = ticketTypeRepository.create({
        id: uuidv4(),
        eventId: savedEvent.id,
        name: getRandomElement(ticketTypeNames),
        description: `${getRandomElement(ticketTypeNames)} ticket for ${title}`,
        priceCents: getRandomElement(prices) * 100, // Convert to cents
        currency: 'KES',
        quantityTotal: Math.floor(Math.random() * 500) + 50,
        quantitySold: Math.floor(Math.random() * 50),
        minPerOrder: 1,
        maxPerOrder: Math.floor(Math.random() * 10) + 5,
        isRefundable: Math.random() > 0.3, // 70% refundable
        salesStartsAt: savedEvent.salesStartsAt,
        salesEndsAt: savedEvent.salesEndsAt,
      });
      await ticketTypeRepository.save(ticketType);
    }

    categoryCounts[category]++;
    eventCount++;

    if ((i + 1) % 500 === 0) {
      console.log(`   ✅ Created ${i + 1}/${remainingEvents} additional events (${eventCount}/${totalEventsToCreate} total)`);
    }
  }

  console.log(`\n✅ Successfully created ${totalEventsToCreate} events!`);
  console.log('\n📊 Category distribution:');
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} events`);
    });
  console.log(`   - Organisers used: ${organisers.length}`);
  console.log(`   - Venues used: ${venues.length}`);
}

