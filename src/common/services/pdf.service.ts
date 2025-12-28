/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Injectable, Logger } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PdfStylesUtil, TicketType, PDFStyles } from "../utils/pdf-styles.util";

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  // Tickit UI Theme - Matching Frontend Design System
  private readonly tixTheme = {
    colors: {
      // Primary colors from UI theme
      background: "#f8fafc", // --background from globals.css
      foreground: "#0f172a", // --foreground from globals.css
      card: "#ffffff", // --card from globals.css
      cardSoft: "#f1f5f9", // --card-soft from globals.css
      muted: "#64748b", // --muted from globals.css
      accent: "#6366f1", // --accent from globals.css (indigo)
      accent2: "#0ea5e9", // --accent-2 from globals.css (sky)
      accent3: "#f97316", // --accent-3 from globals.css (orange)

      // Slate palette for text and UI elements
      slate50: "#f8fafc",
      slate100: "#f1f5f9",
      slate200: "#e2e8f0",
      slate300: "#cbd5e1",
      slate400: "#94a3b8",
      slate500: "#64748b",
      slate600: "#475569",
      slate700: "#334155",
      slate800: "#1e293b",
      slate900: "#0f172a",

      // Status colors
      success: "#10b981", // emerald-500
      warning: "#f59e0b", // amber-500
      error: "#ef4444", // red-500

      // Stroke and borders
      stroke: "rgba(15, 23, 42, 0.08)", // --stroke from globals.css
      border: "#e2e8f0", // slate-200

      // Shadows
      shadow: "rgba(15, 23, 42, 0.08)",
      shadowDark: "rgba(15, 23, 42, 0.12)",
    },
    fonts: {
      regular: "Helvetica",
      bold: "Helvetica-Bold",
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  };

  // Clean text to prevent character encoding issues like Ø=ÜÅ
  private cleanText(text: string): string {
    if (!text) return "";
    return text
      .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, "") // Keep standard ASCII + Latin-1
      .replace(/\s+/g, " ")
      .trim();
  }

  // Safe text rendering with encoding protection
  private renderText(
    doc: any,
    text: string,
    x: number,
    y: number,
    options: any = {},
  ): void {
    const cleanedText = this.cleanText(text);
    if (cleanedText) {
      doc.text(cleanedText, x, y, options);
    }
  }

  // Replace problematic emoji icons with simple text symbols
  private getIconSymbol(type: string): string {
    const icons: { [key: string]: string } = {
      calendar: "DATE",
      clock: "TIME",
      location: "VENUE",
      building: "LOCATION",
      user: "ATTENDEE",
      ticket: "TICKET",
      price: "PRICE",
      order: "ORDER",
      category: "TYPE",
      tag: "TAG",
      organizer: "HOST",
    };
    return icons[type] || "INFO";
  }

  async generateTicketPDF(data: {
    eventTitle: string;
    ticketNumber: string;
    attendeeName: string;
    eventDate: string;
    eventLocation: string;
    qrCodeDataUrl: string;
    ticketType: string;
    price: string;
    orderNumber: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Tickit Ticket - ${this.cleanText(data.eventTitle)}`,
            Subject: "Event Ticket",
            Keywords: "ticket, event, tickit",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on("error", reject);

        // Page background matching UI theme
        doc
          .rect(0, 0, doc.page.width, doc.page.height)
          .fill(this.tixTheme.colors.background);

        // Header with Tickit branding
        this.addTicketHeader(doc, data.eventTitle, data.ticketNumber);

        // Main content area
        let currentY = 180;
        currentY = this.addTicketQRCode(doc, data.qrCodeDataUrl, currentY);
        this.addTicketDetails(doc, data, currentY);

        // Footer
        this.addTicketFooter(doc);

        doc.end();
      } catch (error) {
        this.logger.error("Error generating ticket PDF:", error);
        reject(new Error(`Ticket PDF generation failed: ${error}`));
      }
    });
  }

  async generateEventBriefPDF(data: {
    eventTitle: string;
    description: string;
    organizer: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    venue: string;
    ticketTypes: Array<{
      id?: string;
      name: string;
      price: string;
      available: number;
      total?: number;
      description?: string;
      features?: string[];
      early_bird?: boolean;
      popular?: boolean;
      sold_out?: boolean;
    }>;
    category?: string;
    tags?: string[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 0,
          bufferPages: true,
          info: {
            Title: `${this.cleanText(data.eventTitle)} - Event Brief`,
            Subject: "Event Information Brief",
            Keywords: "event, brief, tickit, information",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on("error", reject);

        // Build the event brief with UI-matching design
        let currentY = 0;

        // Header section
        currentY = this.addEventBriefHeader(doc, data);

        // Content sections
        currentY = this.addEventInformation(doc, data, currentY);
        currentY = this.addEventDescription(doc, data, currentY);

        if (data.ticketTypes && data.ticketTypes.length > 0) {
          this.addTicketTypesSection(doc, data.ticketTypes, currentY);
        }

        // Footer
        this.addEventBriefFooter(doc);

        doc.end();
      } catch (error) {
        this.logger.error("Error generating event brief PDF:", error);
        reject(new Error(`Event brief PDF generation failed: ${error}`));
      }
    });
  }

  // TICKET PDF COMPONENTS

  private addTicketHeader(
    doc: any,
    eventTitle: string,
    ticketNumber: string,
  ): void {
    // Header background with UI theme gradient
    const headerHeight = 160;
    doc
      .rect(0, 0, doc.page.width, headerHeight)
      .fill(this.tixTheme.colors.slate900);

    // Secondary accent strip
    doc
      .rect(0, headerHeight - 20, doc.page.width, 20)
      .fill(this.tixTheme.colors.accent);

    // Tickit branding
    doc
      .fontSize(20)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.card)
      .text("Tickit", 40, 35);

    // Event title with proper spacing
    doc
      .fontSize(16)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.card);

    this.renderText(doc, eventTitle, 40, 70, {
      width: doc.page.width - 80,
      lineGap: 2,
    });

    // Ticket number with clean styling
    doc
      .fontSize(12)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.slate300);

    this.renderText(doc, `Ticket #${ticketNumber}`, 40, 105);

    // Subtle decorative element
    doc
      .circle(doc.page.width - 60, 80, 25)
      .fill(this.tixTheme.colors.accent2)
      .opacity(0.2);
    doc.opacity(1);
  }

  private addTicketQRCode(
    doc: any,
    qrCodeDataUrl: string,
    startY: number,
  ): number {
    try {
      if (!qrCodeDataUrl) {
        return startY + 40;
      }

      const base64Data = qrCodeDataUrl.includes(",")
        ? qrCodeDataUrl.split(",")[1]
        : qrCodeDataUrl;
      const qrCodeBuffer = Buffer.from(base64Data, "base64");
      const qrSize = 120;
      const qrX = (doc.page.width - qrSize) / 2;

      // QR container with UI theme styling
      doc
        .roundedRect(
          qrX - 15,
          startY - 15,
          qrSize + 30,
          qrSize + 30,
          this.tixTheme.borderRadius.md,
        )
        .fill(this.tixTheme.colors.card)
        .stroke(this.tixTheme.colors.border);

      // Add subtle shadow
      doc
        .roundedRect(
          qrX - 13,
          startY - 13,
          qrSize + 26,
          qrSize + 26,
          this.tixTheme.borderRadius.md,
        )
        .fill(this.tixTheme.colors.shadow)
        .opacity(0.1);
      doc.opacity(1);

      doc.image(qrCodeBuffer, qrX, startY, {
        width: qrSize,
        height: qrSize,
      });

      return startY + qrSize + 50;
    } catch (error) {
      this.logger.warn("Failed to add QR code to ticket PDF:", error);
      return startY + 40;
    }
  }

  private addTicketDetails(doc: any, data: any, startY: number): number {
    // Section header with UI theme styling
    this.addUICard(
      doc,
      40,
      startY,
      doc.page.width - 80,
      40,
      "Ticket Information",
    );
    const currentY = startY + 60;

    const details = [
      { type: "user", label: "Attendee", value: data.attendeeName },
      { type: "ticket", label: "Type", value: data.ticketType },
      { type: "calendar", label: "Date", value: data.eventDate },
      { type: "location", label: "Venue", value: data.eventLocation },
      { type: "price", label: "Price", value: data.price },
      { type: "order", label: "Order", value: data.orderNumber },
    ];

    details.forEach((detail, index) => {
      this.addDetailRow(doc, detail, currentY + index * 30, 60, index);
    });

    return currentY + details.length * 30 + 40;
  }

  private addTicketFooter(doc: any): void {
    const footerY = doc.page.height - 100;

    // Footer with UI theme colors
    doc
      .rect(0, footerY, doc.page.width, 100)
      .fill(this.tixTheme.colors.slate800);

    // Accent line matching UI theme
    doc.rect(0, footerY, doc.page.width, 4).fill(this.tixTheme.colors.accent);

    // Security message
    doc
      .fontSize(14)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.success)
      .text("SECURE TICKET", 0, footerY + 25, {
        align: "center",
        width: doc.page.width,
      });

    doc
      .fontSize(10)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.slate300)
      .text("Present this ticket at the event entrance", 0, footerY + 45, {
        align: "center",
        width: doc.page.width,
      })
      .text("For support, contact the event organizer", 0, footerY + 60, {
        align: "center",
        width: doc.page.width,
      });
  }

  // EVENT BRIEF COMPONENTS

  private addEventBriefHeader(doc: any, data: any): number {
    const headerHeight = 220;

    // Background matching UI radial gradient
    doc
      .rect(0, 0, doc.page.width, headerHeight)
      .fill(this.tixTheme.colors.slate900);

    // Gradient overlay effect similar to UI
    doc
      .rect(0, headerHeight - 60, doc.page.width, 60)
      .fill(this.tixTheme.colors.accent)
      .opacity(0.9);
    doc.opacity(1);

    // Subtle decorative elements matching UI floating style
    doc
      .circle(doc.page.width - 80, 60, 50)
      .fill(this.tixTheme.colors.accent2)
      .opacity(0.15);
    doc
      .circle(80, headerHeight - 50, 35)
      .fill(this.tixTheme.colors.card)
      .opacity(0.1);
    doc.opacity(1);

    // Tickit branding
    doc
      .fontSize(18)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.card)
      .text("Tickit", 40, 40);

    // Event title with UI typography hierarchy
    doc
      .fontSize(28)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.card);

    this.renderText(doc, data.eventTitle, 40, 80, {
      width: doc.page.width - 120,
      lineGap: 4,
    });

    // Organizer with UI muted text styling
    doc
      .fontSize(14)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.slate200)
      .opacity(0.9);

    this.renderText(doc, `Organized by ${data.organizer}`, 40, 140);
    doc.opacity(1);

    // Category badge matching UI design
    if (data.category) {
      this.addCategoryBadge(doc, data.category, 40, 170);
    }

    return headerHeight + 40;
  }

  private addEventInformation(doc: any, data: any, startY: number): number {
    const margin = 40;

    // Section with UI card styling
    this.addUICard(
      doc,
      margin,
      startY,
      doc.page.width - margin * 2,
      50,
      "Event Details",
    );
    let currentY = startY + 70;

    // Information with clean text labels (no problematic icons)
    const eventInfo = [
      { type: "calendar", label: "Date", value: data.eventDate },
      { type: "clock", label: "Time", value: data.eventTime },
      { type: "location", label: "Location", value: data.eventLocation },
      { type: "building", label: "Venue", value: data.venue },
    ];

    eventInfo.forEach((info, index) => {
      this.addDetailRow(doc, info, currentY + index * 28, margin + 20, index);
    });

    currentY += eventInfo.length * 28 + 30;

    // Tags section with UI badge styling
    if (data.tags && data.tags.length > 0) {
      currentY = this.addTagsSection(doc, data.tags, currentY, margin);
    }

    return currentY + 30;
  }

  private addEventDescription(doc: any, data: any, startY: number): number {
    if (!data.description) return startY;

    const margin = 40;

    // Section card
    this.addUICard(
      doc,
      margin,
      startY,
      doc.page.width - margin * 2,
      50,
      "About This Event",
    );
    const currentY = startY + 70;

    // Description with UI text styling
    const cleanDescription = this.cleanText(data.description);
    const wrappedText = this.wrapText(
      doc,
      cleanDescription,
      doc.page.width - margin * 2 - 40,
      11,
    );

    doc
      .fontSize(11)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.slate600);

    this.renderText(doc, wrappedText, margin + 20, currentY, {
      width: doc.page.width - margin * 2 - 40,
      align: "justify",
      lineGap: 4,
    });

    const textHeight = doc.heightOfString(wrappedText, {
      width: doc.page.width - margin * 2 - 40,
      lineGap: 4,
    });

    return currentY + textHeight + 50;
  }

  private addTicketTypesSection(
    doc: any,
    ticketTypes: any[],
    startY: number,
  ): void {
    const margin = 40;

    // Convert ticket types to enhanced format
    const enhancedTickets: TicketType[] = ticketTypes.map((ticket, index) => ({
      id: ticket.id || `ticket_${index}`,
      name: ticket.name || "Unnamed Ticket",
      price: ticket.price || "TBD",
      available: ticket.available || 0,
      total: ticket.total || ticket.available,
      description: ticket.description,
      features: ticket.features || [],
      early_bird: ticket.early_bird || false,
      popular: ticket.popular || (index === 0 && ticketTypes.length > 1),
      sold_out: ticket.sold_out || ticket.available === 0,
    }));

    // Create enhanced PDF styles matching Tickit theme
    const pdfStyles: PDFStyles = {
      colors: {
        primary: this.tixTheme.colors.accent,
        secondary: this.tixTheme.colors.accent2,
        accent: this.tixTheme.colors.accent3,
        success: this.tixTheme.colors.success,
        warning: this.tixTheme.colors.warning,
        error: this.tixTheme.colors.error,
        neutral: this.tixTheme.colors.slate600,
        background: this.tixTheme.colors.background,
        foreground: this.tixTheme.colors.foreground,
        muted: this.tixTheme.colors.muted,
        card: this.tixTheme.colors.card,
        border: this.tixTheme.colors.border,
        shadow: this.tixTheme.colors.shadowDark,
      },
      fonts: {
        regular: this.tixTheme.fonts.regular,
        bold: this.tixTheme.fonts.bold,
      },
      spacing: {
        xs: this.tixTheme.spacing.xs,
        sm: this.tixTheme.spacing.sm,
        md: this.tixTheme.spacing.md,
        lg: this.tixTheme.spacing.lg,
        xl: this.tixTheme.spacing.xl,
      },
      borderRadius: {
        sm: this.tixTheme.borderRadius.sm,
        md: this.tixTheme.borderRadius.md,
        lg: this.tixTheme.borderRadius.lg,
      },
      fontSize: {
        xs: 8,
        sm: 10,
        md: 12,
        lg: 14,
        xl: 18,
        xxl: 24,
      },
    };

    // Add ticket summary if there are multiple ticket types
    let currentY = startY;
    if (enhancedTickets.length > 1) {
      currentY =
        PdfStylesUtil.addTicketSummary(
          doc,
          enhancedTickets,
          margin,
          currentY,
          doc.page.width - margin * 2,
          pdfStyles,
        ) + 20;
    }

    // Add enhanced ticket types section
    PdfStylesUtil.addEnhancedTicketTypesSection(
      doc,
      enhancedTickets,
      currentY,
      pdfStyles,
    );
  }

  private addEventBriefFooter(doc: any): void {
    const footerY = doc.page.height - 80;

    // Footer matching UI theme
    doc
      .rect(0, footerY, doc.page.width, 80)
      .fill(this.tixTheme.colors.slate800);

    // UI accent line
    doc.rect(0, footerY, doc.page.width, 4).fill(this.tixTheme.colors.accent);

    // Tickit branding
    doc
      .fontSize(16)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.card)
      .text("Tickit", 40, footerY + 25);

    doc
      .fontSize(10)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.slate300)
      .opacity(0.8)
      .text("Your premier event ticketing platform", 40, footerY + 45);

    // Generation date
    const generationDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    doc
      .opacity(1)
      .fillColor(this.tixTheme.colors.slate300)
      .text(
        `Generated on ${generationDate}`,
        doc.page.width - 200,
        footerY + 35,
      );
  }

  // UI HELPER COMPONENTS

  private addUICard(
    doc: any,
    x: number,
    y: number,
    width: number,
    height: number,
    title?: string,
  ): void {
    // Card shadow matching UI theme
    doc
      .roundedRect(x + 2, y + 2, width, height, this.tixTheme.borderRadius.lg)
      .fill(this.tixTheme.colors.shadow)
      .opacity(0.08);
    doc.opacity(1);

    // Main card with UI styling
    doc
      .roundedRect(x, y, width, height, this.tixTheme.borderRadius.lg)
      .fill(this.tixTheme.colors.card)
      .stroke(this.tixTheme.colors.stroke);

    if (title) {
      doc
        .fontSize(16)
        .font(this.tixTheme.fonts.bold)
        .fillColor(this.tixTheme.colors.slate900);

      this.renderText(doc, title, x + 20, y + 15);

      // UI accent line
      doc.rect(x + 20, y + 38, 60, 2).fill(this.tixTheme.colors.accent);
    }
  }

  private addDetailRow(
    doc: any,
    detail: any,
    y: number,
    x: number,
    index: number,
  ): void {
    // Alternating background like UI tables
    if (index % 2 === 0) {
      doc
        .rect(x - 15, y - 4, doc.page.width - x - 25, 24)
        .fill(this.tixTheme.colors.cardSoft);
    }

    // Clean text label instead of problematic icons
    const iconLabel = this.getIconSymbol(detail.type);
    doc
      .fontSize(9)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.accent)
      .text(iconLabel, x, y - 1);

    // Label with UI typography
    doc
      .fontSize(11)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.slate500);

    this.renderText(doc, `${detail.label}:`, x + 45, y);

    // Value with proper contrast
    doc
      .fontSize(11)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.slate900);

    this.renderText(doc, detail.value, x + 120, y);
  }

  private addCategoryBadge(
    doc: any,
    category: string,
    x: number,
    y: number,
  ): void {
    const cleanCategory = this.cleanText(category).toUpperCase();
    doc.fontSize(10);
    const badgeWidth = doc.widthOfString(cleanCategory) + 24;

    // Badge with UI pill styling
    doc
      .roundedRect(x, y, badgeWidth, 24, 12)
      .fill(this.tixTheme.colors.slate900);

    doc
      .fontSize(10)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.card);

    this.renderText(doc, cleanCategory, x + 12, y + 7);
  }

  private addTagsSection(
    doc: any,
    tags: string[],
    startY: number,
    margin: number,
  ): number {
    // Tags header
    doc
      .fontSize(12)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.slate700)
      .text("TAGS", margin + 20, startY);

    let currentY = startY + 25;
    let tagX = margin + 20;

    tags.forEach((tag) => {
      const cleanTag = this.cleanText(tag);
      if (!cleanTag) return;

      doc.fontSize(9);
      const tagWidth = doc.widthOfString(cleanTag) + 16;

      // Check if tag fits on current line
      if (tagX + tagWidth > doc.page.width - margin - 20) {
        tagX = margin + 20;
        currentY += 25;
      }

      // Tag with UI outline badge styling
      doc
        .roundedRect(tagX, currentY, tagWidth, 18, 9)
        .stroke(this.tixTheme.colors.border)
        .fill(this.tixTheme.colors.card);

      doc
        .fontSize(9)
        .font(this.tixTheme.fonts.regular)
        .fillColor(this.tixTheme.colors.slate600);

      this.renderText(doc, cleanTag, tagX + 8, currentY + 5);

      tagX += tagWidth + 8;
    });

    return currentY + 25;
  }

  private addTicketTypeCard(
    doc: any,
    ticket: any,
    x: number,
    y: number,
    width: number,
  ): number {
    const cardHeight = ticket.description ? 90 : 70;

    // Card with UI shadow and styling
    doc
      .roundedRect(
        x + 1,
        y + 1,
        width,
        cardHeight,
        this.tixTheme.borderRadius.md,
      )
      .fill(this.tixTheme.colors.shadowDark)
      .opacity(0.06);
    doc.opacity(1);

    doc
      .roundedRect(x, y, width, cardHeight, this.tixTheme.borderRadius.md)
      .fill(this.tixTheme.colors.card)
      .stroke(this.tixTheme.colors.border);

    // Ticket name with UI typography
    doc
      .fontSize(14)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.slate900);

    const ticketLabel = this.getIconSymbol("ticket");
    doc
      .fontSize(10)
      .fillColor(this.tixTheme.colors.accent)
      .text(ticketLabel, x + 15, y + 18);

    doc.fontSize(14).fillColor(this.tixTheme.colors.slate900);
    this.renderText(doc, ticket.name, x + 50, y + 15);

    // Price with UI color coding
    const priceColor =
      ticket.price === "Free"
        ? this.tixTheme.colors.success
        : this.tixTheme.colors.slate900;

    doc.fontSize(16).font(this.tixTheme.fonts.bold).fillColor(priceColor);

    this.renderText(doc, ticket.price, x + width - 100, y + 15);

    // Availability with UI status colors
    const availabilityColor =
      ticket.available > 10
        ? this.tixTheme.colors.success
        : ticket.available > 0
          ? this.tixTheme.colors.warning
          : this.tixTheme.colors.error;

    const availabilityText =
      ticket.available > 0 ? `${ticket.available} available` : "Sold out";

    doc
      .fontSize(10)
      .font(this.tixTheme.fonts.regular)
      .fillColor(availabilityColor);

    this.renderText(doc, availabilityText, x + width - 100, y + 35);

    // Description with UI muted text
    if (ticket.description) {
      const cleanDescription = this.cleanText(ticket.description);
      doc
        .fontSize(9)
        .font(this.tixTheme.fonts.regular)
        .fillColor(this.tixTheme.colors.slate500);

      this.renderText(doc, cleanDescription, x + 15, y + 55, {
        width: width - 120,
      });
    }

    return cardHeight;
  }

  private wrapText(
    doc: any,
    text: string,
    maxWidth: number,
    fontSize: number,
  ): string {
    if (!text) return "";

    doc.fontSize(fontSize);
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const width = doc.widthOfString(testLine);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join("\n");
  }
}
