import { DataSource } from 'typeorm';
import { Event, EventStatus, EventVisibility } from '../entities/event.entity';
import { Organiser } from '../entities/organiser.entity';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Venue } from '../entities/venue.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { v4 as uuidv4 } from 'uuid';

const eventTitles = [
  'Nairobi Music Festival',
  'Mombasa Beach Party',
  'Kisumu Cultural Show',
  'Nakuru Food Festival',
  'Eldoret Sports Day',
  'Thika Art Exhibition',
  'Malindi Beach Bash',
  'Kitale Music Night',
  'Garissa Community Fair',
  'Kakamega Dance Show',
];

const descriptions = [
  'Join us for an amazing event featuring live music, great food, and unforgettable memories!',
  'Experience the best of local culture and entertainment at this exciting gathering.',
  'A fun-filled day with activities for the whole family. Don\'t miss out!',
  'Celebrate with us at this special event featuring top performers and vendors.',
  'An evening of music, dance, and community spirit. Come and be part of it!',
  'Discover amazing talent and enjoy delicious food at this vibrant event.',
  'Experience the energy and excitement of this must-attend gathering.',
  'Join thousands of attendees for an unforgettable experience.',
  'A celebration of culture, music, and community. See you there!',
  'Get ready for an epic event that you\'ll remember for years to come!',
];

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
];

const coverImages = [
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
  'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=800',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
  'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=800',
];

export async function seedCheapEvents(dataSource: DataSource): Promise<void> {
  const eventRepository = dataSource.getRepository(Event);
  const organiserRepository = dataSource.getRepository(Organiser);
  const userRepository = dataSource.getRepository(User);
  const venueRepository = dataSource.getRepository(Venue);
  const ticketTypeRepository = dataSource.getRepository(TicketType);

  console.log('🌱 Starting cheap events seeding (KES 1.00 tickets)...\n');

  // Get or create an organiser
  let organiserUsers = await userRepository.find({
    where: { activeRole: UserRole.ORGANISER },
    take: 1,
  });

  if (organiserUsers.length === 0) {
    // Create a default organiser user if none exists
    console.log('⚠️  No organiser found. Creating default organiser...');
    const defaultUser = userRepository.create({
      id: uuidv4(),
      email: 'organiser@tickit.co.ke',
      passwordHash: '$2b$10$dummy', // Dummy password hash
      activeRole: UserRole.ORGANISER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: false,
    });
    const savedUser = await userRepository.save(defaultUser);
    organiserUsers = [savedUser];
  }

  let organiser = await organiserRepository.findOne({
    where: { ownerId: organiserUsers[0].id },
  });

  if (!organiser) {
    organiser = organiserRepository.create({
      id: uuidv4(),
      ownerId: organiserUsers[0].id,
      name: 'Tickit Events',
      description: 'Default event organizer for seeding',
    });
    organiser = await organiserRepository.save(organiser);
  }

  console.log(`✅ Using organiser: ${organiser.name}\n`);

  // Create or get venues
  const venues: Venue[] = [];
  for (let i = 0; i < 10; i++) {
    let venue = await venueRepository.findOne({
      where: { name: venueNames[i] },
    });

    if (!venue) {
      venue = venueRepository.create({
        id: uuidv4(),
        name: venueNames[i],
        address: `${cities[i]}, Kenya`,
        city: cities[i],
        country: 'Kenya',
        capacity: 1000,
      });
      venue = await venueRepository.save(venue);
    }
    venues.push(venue);
  }

  // Create 10 events
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const startsAt = new Date(now.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000); // 7 days apart
    const endsAt = new Date(startsAt.getTime() + 4 * 60 * 60 * 1000); // 4 hours duration

    const slug = eventTitles[i]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + `-${Date.now()}-${i}`;

    const event = eventRepository.create({
      id: uuidv4(),
      organiserId: organiser.id,
      venueId: venues[i].id,
      title: eventTitles[i],
      slug,
      description: descriptions[i],
      category: 'Entertainment',
      tags: ['Music', 'Community', 'Fun'],
      visibility: EventVisibility.PUBLIC,
      status: EventStatus.PUBLISHED,
      startsAt,
      endsAt,
      timezone: 'Africa/Nairobi',
      capacity: 500,
      coverImageUrl: coverImages[i],
      imageGalleryUrls: [coverImages[i]],
      salesStartsAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Started 1 day ago
      salesEndsAt: new Date(startsAt.getTime() - 1 * 60 * 60 * 1000), // 1 hour before event
    });

    const savedEvent = await eventRepository.save(event);

    // Create ticket type with KES 1.00 price (100 cents)
    const ticketType = ticketTypeRepository.create({
      id: uuidv4(),
      eventId: savedEvent.id,
      name: 'General Admission',
      description: 'Standard entry ticket',
      priceCents: 100, // KES 1.00
      currency: 'KES',
      quantityTotal: 500,
      quantitySold: 0,
    });

    await ticketTypeRepository.save(ticketType);

    console.log(`✅ Created event: ${eventTitles[i]} (KES 1.00 tickets)`);
  }

  console.log('\n✅ Successfully created 10 events with KES 1.00 tickets!');
}

