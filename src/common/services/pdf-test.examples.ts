import { PdfService } from './pdf.service';

/**
 * Test examples demonstrating the enhanced ticket brief PDF functionality
 * These examples show various ticket configurations and edge cases
 */
export class PdfTestExamples {
  constructor(private readonly pdfService: PdfService) {}

  /**
   * Example 1: Conference with multiple ticket types including popular and early bird
   */
  async generateConferenceExample(): Promise<Buffer> {
    const briefData = {
      eventTitle: "TechCon 2024 - Annual Technology Conference",
      description: "Join industry leaders, innovators, and tech enthusiasts for three days of cutting-edge presentations, workshops, and networking opportunities. Discover the latest trends in AI, blockchain, cloud computing, and emerging technologies that will shape the future.",
      organizer: "Tech Innovation Hub",
      eventDate: "March 15-17, 2024",
      eventTime: "9:00 AM - 6:00 PM",
      eventLocation: "Convention Center Downtown",
      venue: "Grand Ballroom & Tech Labs",
      category: "Technology",
      tags: ["conference", "technology", "AI", "blockchain", "networking"],
      ticketTypes: [
        {
          id: "early-bird",
          name: "Early Bird Special",
          price: "KES 3,500",
          available: 25,
          total: 100,
          description: "Limited time pricing for early registrations. Save 30% off regular price.",
          features: [
            "Priority seating in main auditorium",
            "Welcome kit with conference materials",
            "Access to exclusive networking lunch",
            "Digital conference proceedings",
            "Certificate of participation"
          ],
          early_bird: true,
          popular: false,
          sold_out: false
        },
        {
          id: "regular",
          name: "Regular Admission",
          price: "KES 5,000",
          available: 150,
          total: 200,
          description: "Standard conference access with all sessions and materials included.",
          features: [
            "Access to all conference sessions",
            "Conference materials and swag bag",
            "Lunch and refreshments included",
            "Digital access to recorded sessions"
          ],
          early_bird: false,
          popular: true,
          sold_out: false
        },
        {
          id: "vip",
          name: "VIP Experience",
          price: "KES 8,000",
          available: 15,
          total: 50,
          description: "Premium access with exclusive benefits and networking opportunities.",
          features: [
            "Front row reserved seating",
            "VIP networking cocktail event",
            "Meet & greet with keynote speakers",
            "Premium dining experience",
            "Exclusive VIP lounge access",
            "Priority workshop registration"
          ],
          early_bird: false,
          popular: false,
          sold_out: false
        },
        {
          id: "student",
          name: "Student Discount",
          price: "KES 1,500",
          available: 75,
          total: 100,
          description: "Special pricing for students with valid ID. Perfect for learning and career development.",
          features: [
            "All standard conference benefits",
            "Student networking session",
            "Career guidance workshop",
            "Mentorship program access"
          ],
          early_bird: false,
          popular: false,
          sold_out: false
        }
      ]
    };

    return this.pdfService.generateEventBriefPDF(briefData);
  }

  /**
   * Example 2: Music festival with sold out and free tickets
   */
  async generateMusicFestivalExample(): Promise<Buffer> {
    const briefData = {
      eventTitle: "Nairobi Music Festival 2024",
      description: "Experience the best of East African music with local and international artists performing across multiple stages. From traditional sounds to contemporary beats, enjoy a full weekend of musical celebration.",
      organizer: "Nairobi Entertainment Group",
      eventDate: "June 21-23, 2024",
      eventTime: "2:00 PM - 11:00 PM",
      eventLocation: "Uhuru Gardens",
      venue: "Main Stage & Acoustic Pavilion",
      category: "Music & Entertainment",
      tags: ["music", "festival", "outdoor", "weekend", "live-performance"],
      ticketTypes: [
        {
          id: "free-entry",
          name: "Community Day Pass",
          price: "Free",
          available: 200,
          total: 500,
          description: "Free entry for local community members on Friday. Limited capacity with first-come, first-served basis.",
          features: [
            "Friday performances only",
            "Standing room access",
            "Food court access",
            "Local artist showcases"
          ],
          early_bird: false,
          popular: true,
          sold_out: false
        },
        {
          id: "weekend-pass",
          name: "Weekend Pass",
          price: "KES 2,500",
          available: 8,
          total: 300,
          description: "Full festival access for all three days with premium viewing areas.",
          features: [
            "All 3 days access",
            "Premium viewing sections",
            "Food & beverage discounts",
            "Official festival merchandise",
            "After-party invitations"
          ],
          early_bird: false,
          popular: false,
          sold_out: false
        },
        {
          id: "vip-package",
          name: "VIP Festival Package",
          price: "KES 7,500",
          available: 0,
          total: 50,
          description: "Sold out premium package with exclusive access and amenities.",
          features: [
            "VIP viewing platform",
            "Backstage meet & greet",
            "Premium food & drinks included",
            "Exclusive VIP camping area",
            "Artist signing sessions"
          ],
          early_bird: false,
          popular: false,
          sold_out: true
        }
      ]
    };

    return this.pdfService.generateEventBriefPDF(briefData);
  }

  /**
   * Example 3: Workshop with single early bird ticket type
   */
  async generateWorkshopExample(): Promise<Buffer> {
    const briefData = {
      eventTitle: "Digital Marketing Masterclass",
      description: "Intensive one-day workshop covering modern digital marketing strategies, social media optimization, content creation, and analytics. Led by industry experts with hands-on exercises and real-world case studies.",
      organizer: "Marketing Academy Kenya",
      eventDate: "April 10, 2024",
      eventTime: "9:00 AM - 5:00 PM",
      eventLocation: "Business Hub, Westlands",
      venue: "Conference Room A",
      category: "Education & Training",
      tags: ["workshop", "digital-marketing", "training", "professional-development"],
      ticketTypes: [
        {
          id: "early-registration",
          name: "Early Registration",
          price: "KES 4,500",
          available: 18,
          total: 25,
          description: "Limited seats available. Early bird pricing valid until March 25th. Includes all materials, lunch, and certificate.",
          features: [
            "Comprehensive workshop materials",
            "Hands-on practical exercises",
            "Industry expert instruction",
            "Networking lunch included",
            "Digital marketing toolkit",
            "Certificate of completion",
            "90-day email support"
          ],
          early_bird: true,
          popular: true,
          sold_out: false
        }
      ]
    };

    return this.pdfService.generateEventBriefPDF(briefData);
  }

  /**
   * Example 4: Corporate event with high availability
   */
  async generateCorporateExample(): Promise<Buffer> {
    const briefData = {
      eventTitle: "Annual Business Summit 2024",
      description: "Premier business networking event bringing together entrepreneurs, investors, and corporate leaders. Feature keynote presentations on market trends, panel discussions, and strategic partnership opportunities.",
      organizer: "Kenya Business Association",
      eventDate: "May 8, 2024",
      eventTime: "8:00 AM - 6:00 PM",
      eventLocation: "Kenyatta International Conference Centre",
      venue: "Plenary Hall",
      category: "Business & Networking",
      tags: ["business", "summit", "networking", "corporate", "leadership"],
      ticketTypes: [
        {
          id: "standard-access",
          name: "Standard Access",
          price: "KES 6,000",
          available: 350,
          total: 500,
          description: "Full summit access including all sessions, materials, and networking opportunities.",
          features: [
            "Access to all keynote sessions",
            "Panel discussion participation",
            "Business networking sessions",
            "Digital summit materials",
            "Refreshments throughout the day"
          ],
          early_bird: false,
          popular: true,
          sold_out: false
        },
        {
          id: "premium-networking",
          name: "Premium Networking",
          price: "KES 10,000",
          available: 85,
          total: 100,
          description: "Enhanced experience with exclusive networking opportunities and premium amenities.",
          features: [
            "All standard access benefits",
            "VIP networking reception",
            "Reserved premium seating",
            "One-on-one meeting opportunities",
            "Executive lunch included",
            "Priority access to speakers"
          ],
          early_bird: false,
          popular: false,
          sold_out: false
        }
      ]
    };

    return this.pdfService.generateEventBriefPDF(briefData);
  }

  /**
   * Example 5: Edge case with mixed availability and long content
   */
  async generateEdgeCaseExample(): Promise<Buffer> {
    const briefData = {
      eventTitle: "International Innovation Expo & Technology Showcase 2024",
      description: "The largest technology and innovation exposition in East Africa, featuring cutting-edge startups, established tech companies, research institutions, and government initiatives. Explore breakthrough technologies in artificial intelligence, renewable energy, biotechnology, fintech, and sustainable development solutions. This comprehensive event includes product demonstrations, investor meetings, technical workshops, policy discussions, and collaborative networking sessions designed to foster innovation partnerships and drive technological advancement across the region.",
      organizer: "East Africa Innovation Council & Technology Partners",
      eventDate: "September 12-15, 2024",
      eventTime: "9:00 AM - 8:00 PM Daily",
      eventLocation: "Kenyatta International Conference Centre & Adjacent Exhibition Halls",
      venue: "Multiple Venues - Main Hall, Tech Pavilions, Demo Spaces",
      category: "Technology & Innovation",
      tags: ["technology", "innovation", "expo", "startups", "AI", "fintech", "sustainability", "networking"],
      ticketTypes: [
        {
          id: "startup-founder",
          name: "Startup Founder & Entrepreneur Pass",
          price: "KES 12,500",
          available: 3,
          total: 150,
          description: "Comprehensive access designed specifically for startup founders, entrepreneurs, and early-stage company leaders seeking investment opportunities, partnership development, and market expansion strategies.",
          features: [
            "Full 4-day expo access to all pavilions and demonstration areas",
            "Priority access to investor pitch sessions and funding roundtables",
            "Startup exhibition booth space (2x2 meters) with basic setup",
            "Invitation to exclusive founder networking dinners and breakfast meetings",
            "One-on-one mentoring sessions with successful entrepreneurs and industry veterans",
            "Access to technical workshops on scaling, fundraising, and market penetration",
            "Digital startup toolkit with templates, guides, and resource directories",
            "Media interview opportunities with tech journalists and industry publications",
            "VIP access to government policy sessions and regulatory update briefings"
          ],
          early_bird: false,
          popular: false,
          sold_out: false
        },
        {
          id: "investor-premium",
          name: "Investor & Corporate Development Premium",
          price: "KES 25,000",
          available: 0,
          total: 75,
          description: "Exclusive access package for venture capitalists, angel investors, corporate development professionals, and strategic partnership managers seeking high-quality deal flow and investment opportunities.",
          features: [
            "VIP entrance and dedicated investor lounge with premium amenities",
            "Private investor-only demonstration sessions with pre-screened startups",
            "Curated deal flow presentations and due diligence material access",
            "Executive transportation between venues and premium parking allocation",
            "Invitation to high-level policy maker dinners and strategic discussion forums",
            "Access to confidential startup pitch decks and financial projections database",
            "Professional networking concierge service for meeting coordination",
            "Priority booking for advisory board and board member matching sessions"
          ],
          early_bird: false,
          popular: false,
          sold_out: true
        },
        {
          id: "student-researcher",
          name: "Student & Academic Researcher",
          price: "KES 1,200",
          available: 245,
          total: 300,
          description: "Special discounted access for university students, graduate researchers, and academic professionals interested in technology transfer, research commercialization, and innovation education.",
          features: [
            "All expo sessions and technology demonstrations",
            "Academic research poster presentation opportunities",
            "Student competition participation with cash prizes and internship offers",
            "Career fair access with leading tech companies and research institutions",
            "Thesis and research project feedback sessions with industry experts",
            "University partnership and collaboration discussion forums"
          ],
          early_bird: true,
          popular: true,
          sold_out: false
        }
      ]
    };

    return this.pdfService.generateEventBriefPDF(briefData);
  }

  /**
   * Generate all example PDFs for testing
   */
  async generateAllExamples(): Promise<{ [key: string]: Buffer }> {
    const examples = {
      conference: await this.generateConferenceExample(),
      musicFestival: await this.generateMusicFestivalExample(),
      workshop: await this.generateWorkshopExample(),
      corporate: await this.generateCorporateExample(),
      edgeCase: await this.generateEdgeCaseExample()
    };

    return examples;
  }

  /**
   * Helper method to save example PDFs to files (for development testing)
   */
  async saveExamplesToFiles(outputDirectory: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    const examples = await this.generateAllExamples();

    for (const [name, buffer] of Object.entries(examples)) {
      const filename = `${name}-ticket-brief-example.pdf`;
      const filepath = path.join(outputDirectory, filename);
      await fs.writeFile(filepath, buffer);
      console.log(`Saved ${filename} to ${filepath}`);
    }
  }
}

/**
 * Usage example for testing the enhanced ticket brief functionality
 */
export const testEnhancedTicketBrief = async (pdfService: PdfService) => {
  const examples = new PdfTestExamples(pdfService);

  // Generate a specific example
  const conferenceBuffer = await examples.generateConferenceExample();
  console.log('Generated conference example PDF:', conferenceBuffer.length, 'bytes');

  // Generate all examples
  const allExamples = await examples.generateAllExamples();
  console.log('Generated all examples:', Object.keys(allExamples));

  return allExamples;
};