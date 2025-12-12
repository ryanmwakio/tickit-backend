import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Event } from '../entities/event.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { Organiser } from '../entities/organiser.entity';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';

export async function seedTickets(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const eventRepository = dataSource.getRepository(Event);
  const ticketTypeRepository = dataSource.getRepository(TicketType);
  const orderRepository = dataSource.getRepository(Order);
  const orderItemRepository = dataSource.getRepository(OrderItem);
  const ticketRepository = dataSource.getRepository(Ticket);
  const paymentRepository = dataSource.getRepository(Payment);
  const organiserRepository = dataSource.getRepository(Organiser);

  console.log('🎫 Starting ticket seeding...\n');

  // Get all users
  const users = await userRepository.find();
  if (users.length === 0) {
    console.log('⚠️  No users found. Please seed users first.');
    return;
  }
  console.log(`📋 Found ${users.length} users\n`);

  // Get all events with their ticket types
  const events = await eventRepository.find({
    relations: ['ticketTypes', 'organiser'],
  });
  if (events.length === 0) {
    console.log('⚠️  No events found. Please seed events first.');
    return;
  }
  console.log(`📅 Found ${events.length} events\n`);

  // Get all organisers
  const organisers = await organiserRepository.find();
  if (organisers.length === 0) {
    console.log('⚠️  No organisers found. Please seed events first (which creates organisers).');
    return;
  }

  // Filter events that have ticket types
  const eventsWithTicketTypes = events.filter((event) => event.ticketTypes && event.ticketTypes.length > 0);
  if (eventsWithTicketTypes.length === 0) {
    console.log('⚠️  No events with ticket types found.');
    return;
  }
  console.log(`🎟️  Found ${eventsWithTicketTypes.length} events with ticket types\n`);

  // Calculate how many tickets to create per user (approximately)
  const totalTicketsToCreate = 3000;
  const ticketsPerUser = Math.floor(totalTicketsToCreate / users.length);
  const remainingTickets = totalTicketsToCreate % users.length;

  console.log(`🎯 Creating ${totalTicketsToCreate} tickets...`);
  console.log(`   ~${ticketsPerUser} tickets per user (${remainingTickets} extra distributed)\n`);

  let totalTicketsCreated = 0;
  let totalOrdersCreated = 0;
  let totalPaymentsCreated = 0;

  // Payment methods distribution
  const paymentMethods = [PaymentMethod.MPESA, PaymentMethod.CARD, PaymentMethod.MPESA, PaymentMethod.MPESA, PaymentMethod.CARD];
  const paymentStatuses = [PaymentStatus.COMPLETED, PaymentStatus.COMPLETED, PaymentStatus.COMPLETED, PaymentStatus.PENDING, PaymentStatus.COMPLETED];

  // Process each user
  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const user = users[userIndex];
    const ticketsForThisUser = ticketsPerUser + (userIndex < remainingTickets ? 1 : 0);

    if (ticketsForThisUser === 0) continue;

    // Create multiple orders for this user
    const ordersPerUser = Math.ceil(ticketsForThisUser / 5); // ~5 tickets per order on average
    const ticketsPerOrder = Math.ceil(ticketsForThisUser / ordersPerUser);

    for (let orderIndex = 0; orderIndex < ordersPerUser; orderIndex++) {
      if (totalTicketsCreated >= totalTicketsToCreate) break;

      // Select a random event with ticket types
      const randomEvent = eventsWithTicketTypes[Math.floor(Math.random() * eventsWithTicketTypes.length)];
      const availableTicketTypes = randomEvent.ticketTypes || [];

      if (availableTicketTypes.length === 0) continue;

      // Calculate how many tickets to create for this order
      const remainingTicketsForUser = ticketsForThisUser - (orderIndex * ticketsPerOrder);
      const remainingTotalTickets = totalTicketsToCreate - totalTicketsCreated;
      const ticketsForThisOrder = Math.min(
        ticketsPerOrder,
        remainingTicketsForUser,
        remainingTotalTickets,
      );

      if (ticketsForThisOrder <= 0) continue;

      // Select 1-3 ticket types for this order
      const numTicketTypes = Math.min(Math.floor(Math.random() * 3) + 1, availableTicketTypes.length);
      const selectedTicketTypes = availableTicketTypes
        .sort(() => Math.random() - 0.5)
        .slice(0, numTicketTypes);

      // Create order
      const orderId = uuidv4();
      const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 10000)}`;
      const orderCreatedAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Random date in last 90 days

      // Calculate total amount and distribute tickets across ticket types
      let totalAmountCents = 0;
      const orderItems: Array<{ ticketType: TicketType; quantity: number }> = [];
      let ticketsAllocated = 0;

      for (let i = 0; i < selectedTicketTypes.length; i++) {
        const ticketType = selectedTicketTypes[i];
        const isLastType = i === selectedTicketTypes.length - 1;
        
        // Check available quantity for this ticket type
        const availableQuantity = (ticketType.quantityTotal || 0) - (ticketType.quantitySold || 0);
        if (availableQuantity <= 0) continue;
        
        // For the last ticket type, allocate remaining tickets (but not more than available)
        const maxQuantity = Math.min(
          isLastType ? ticketsForThisOrder - ticketsAllocated : Math.floor(Math.random() * 3) + 1,
          availableQuantity,
          ticketsForThisOrder - ticketsAllocated,
        );
        
        if (maxQuantity > 0) {
          const itemTotal = ticketType.priceCents * maxQuantity;
          totalAmountCents += itemTotal;
          orderItems.push({ ticketType, quantity: maxQuantity });
          ticketsAllocated += maxQuantity;
        }
      }

      // Skip this order if no valid order items could be created
      if (orderItems.length === 0) continue;

      // Create order (some orders can be guest orders - buyerId = undefined)
      const isGuestOrder = Math.random() < 0.1; // 10% guest orders
      const order = orderRepository.create({
        id: orderId,
        buyerId: isGuestOrder ? undefined : user.id,
        organiserId: randomEvent.organiserId,
        orderNumber,
        status: OrderStatus.PAID, // Most orders are paid
        totalAmountCents,
        currency: 'KES',
        metadata: {
          seeded: true,
          guestOrder: isGuestOrder,
        },
        createdAt: orderCreatedAt,
        updatedAt: orderCreatedAt,
      });

      const savedOrder = await orderRepository.save(order) as Order;
      totalOrdersCreated++;

      // Create payment for the order
      const paymentId = uuidv4();
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

      const payment = paymentRepository.create({
        id: paymentId,
        orderId: savedOrder.id,
        transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 100000)}`,
        method: paymentMethod,
        status: paymentStatus,
        amountCents: totalAmountCents,
        currency: 'KES',
        metadata: {
          seeded: true,
        },
        createdAt: orderCreatedAt,
        updatedAt: orderCreatedAt,
      });

      await paymentRepository.save(payment);
      totalPaymentsCreated++;

      // Create order items and tickets
      for (const { ticketType, quantity } of orderItems) {
        // Create order item
        const orderItemId = uuidv4();
        const orderItem = orderItemRepository.create({
          id: orderItemId,
          orderId: savedOrder.id,
          ticketTypeId: ticketType.id,
          ticketTypeName: ticketType.name,
          quantity,
          unitPriceCents: ticketType.priceCents,
          totalPriceCents: ticketType.priceCents * quantity,
          createdAt: orderCreatedAt,
        });

        await orderItemRepository.save(orderItem);

        // Create tickets for this order item
        for (let i = 0; i < quantity; i++) {
          if (totalTicketsCreated >= totalTicketsToCreate) break;

          const ticketId = uuidv4();
          const ticketNumber = `TKT${Date.now()}${Math.floor(Math.random() * 1000000)}${totalTicketsCreated}`;

          // Generate QR code
          const qrPayload = JSON.stringify({
            ticketId,
            orderId: savedOrder.id,
            ticketNumber,
            eventId: randomEvent.id,
          });

          let qrCode: string;
          try {
            qrCode = await QRCode.toDataURL(qrPayload);
          } catch (error) {
            console.error(`⚠️  Failed to generate QR code for ticket ${ticketNumber}:`, error);
            qrCode = `data:image/png;base64,${Buffer.from(qrPayload).toString('base64')}`; // Fallback
          }

          // Determine ticket status (most are ACTIVE, some PENDING, few CHECKED_IN)
          const statusRand = Math.random();
          let ticketStatus: TicketStatus;
          if (statusRand < 0.85) {
            ticketStatus = TicketStatus.ACTIVE;
          } else if (statusRand < 0.95) {
            ticketStatus = TicketStatus.PENDING;
          } else {
            ticketStatus = TicketStatus.CHECKED_IN;
          }

          const ticket = ticketRepository.create({
            id: ticketId,
            orderItemId: orderItem.id,
            ticketTypeId: ticketType.id,
            eventId: randomEvent.id, // Direct link to event
            ticketNumber,
            qrCode,
            status: ticketStatus,
            ownerId: isGuestOrder ? undefined : user.id,
            createdAt: orderCreatedAt,
            updatedAt: orderCreatedAt,
          });

          await ticketRepository.save(ticket);
          totalTicketsCreated++;

          // Update ticket type quantity sold
          ticketType.quantitySold = (ticketType.quantitySold || 0) + 1;
          await ticketTypeRepository.save(ticketType);

          if (totalTicketsCreated % 100 === 0) {
            console.log(`   ✅ Created ${totalTicketsCreated}/${totalTicketsToCreate} tickets...`);
          }
        }
      }
    }
  }

  console.log(`\n✅ Ticket seeding completed!`);
  console.log(`   📊 Summary:`);
  console.log(`      - Tickets created: ${totalTicketsCreated}`);
  console.log(`      - Orders created: ${totalOrdersCreated}`);
  console.log(`      - Payments created: ${totalPaymentsCreated}`);
  console.log(`      - Users with tickets: ${users.length}\n`);
}

