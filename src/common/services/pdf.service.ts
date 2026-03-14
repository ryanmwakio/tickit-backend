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
      // Black and white theme for clean, professional appearance
      background: "#ffffff", // Pure white background
      foreground: "#000000", // Pure black text
      card: "#ffffff", // White cards
      cardSoft: "#f8f8f8", // Very light gray for subtle backgrounds
      muted: "#666666", // Medium gray for secondary text
      accent: "#000000", // Black accents for emphasis
      accent2: "#333333", // Dark gray for secondary accents
      accent3: "#000000", // Black for all accent elements

      // Grayscale palette for text and UI elements
      slate50: "#ffffff",
      slate100: "#f8f8f8",
      slate200: "#e8e8e8",
      slate300: "#d0d0d0",
      slate400: "#a0a0a0",
      slate500: "#666666",
      slate600: "#4a4a4a",
      slate700: "#333333",
      slate800: "#1a1a1a",
      slate900: "#000000",

      // Status colors in grayscale
      success: "#000000", // Black for success
      warning: "#333333", // Dark gray for warning
      error: "#000000", // Black for error

      // Stroke and borders
      stroke: "#e0e0e0", // Light gray strokes
      border: "#d0d0d0", // Light gray borders

      // Shadows
      shadow: "#000000",
      shadowDark: "#000000",
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
    const margin = 40;

    // Simple section header
    doc
      .fontSize(14)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.foreground)
      .text("TICKET INFORMATION", margin, startY);

    // Clean underline
    doc.rect(margin, startY + 20, 150, 2).fill(this.tixTheme.colors.foreground);

    let currentY = startY + 40;

    const details = [
      { label: "ATTENDEE", value: data.attendeeName },
      { label: "TYPE", value: data.ticketType },
      { label: "DATE", value: data.eventDate },
      { label: "VENUE", value: data.eventLocation },
      { label: "PRICE", value: data.price },
      { label: "ORDER", value: data.orderNumber },
    ];

    details.forEach((detail) => {
      // Label
      doc
        .fontSize(10)
        .font(this.tixTheme.fonts.bold)
        .fillColor(this.tixTheme.colors.muted)
        .text(detail.label + ":", margin, currentY);

      // Value
      doc
        .fontSize(12)
        .font(this.tixTheme.fonts.regular)
        .fillColor(this.tixTheme.colors.foreground)
        .text(detail.value, margin + 80, currentY);

      currentY += 24;
    });

    return currentY + 20;
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
    const headerHeight = 180;

    // Clean white background with black border
    doc
      .rect(0, 0, doc.page.width, headerHeight)
      .fill(this.tixTheme.colors.background)
      .stroke(this.tixTheme.colors.foreground)
      .lineWidth(2);

    // Simple black line separator at bottom
    doc
      .rect(0, headerHeight - 4, doc.page.width, 4)
      .fill(this.tixTheme.colors.foreground);

    // Tickit branding - simple and clean
    doc
      .fontSize(16)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.foreground)
      .text("TICKIT EVENT BRIEF", 40, 30);

    // Event title - prominent black typography
    doc
      .fontSize(24)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.foreground);

    this.renderText(doc, data.eventTitle.toUpperCase(), 40, 65, {
      width: doc.page.width - 120,
      lineGap: 2,
    });

    // Organizer - clean secondary text
    doc
      .fontSize(12)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.muted);

    this.renderText(doc, `Organized by ${data.organizer}`, 40, 110);

    // Category - simple text format
    if (data.category) {
      doc
        .fontSize(11)
        .font(this.tixTheme.fonts.regular)
        .fillColor(this.tixTheme.colors.foreground)
        .text(`Category: ${data.category.toUpperCase()}`, 40, 135);
    }

    // Simple decorative line
    doc.rect(40, 155, 120, 1).fill(this.tixTheme.colors.foreground);

    return headerHeight + 30;
  }

  private addEventInformation(doc: any, data: any, startY: number): number {
    const margin = 40;

    // Simple section header
    doc
      .fontSize(14)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.foreground)
      .text("EVENT DETAILS", margin, startY);

    // Clean underline
    doc.rect(margin, startY + 20, 120, 2).fill(this.tixTheme.colors.foreground);

    let currentY = startY + 40;

    // Information with clean text labels
    const eventInfo = [
      { label: "DATE", value: data.eventDate },
      { label: "TIME", value: data.eventTime },
      { label: "LOCATION", value: data.eventLocation },
      { label: "VENUE", value: data.venue },
    ];

    eventInfo.forEach((info) => {
      // Label
      doc
        .fontSize(10)
        .font(this.tixTheme.fonts.bold)
        .fillColor(this.tixTheme.colors.muted)
        .text(info.label + ":", margin, currentY);

      // Value
      doc
        .fontSize(12)
        .font(this.tixTheme.fonts.regular)
        .fillColor(this.tixTheme.colors.foreground)
        .text(info.value, margin + 80, currentY);

      currentY += 24;
    });

    currentY += 20;

    // Tags section - simple text format
    if (data.tags && data.tags.length > 0) {
      doc
        .fontSize(10)
        .font(this.tixTheme.fonts.bold)
        .fillColor(this.tixTheme.colors.muted)
        .text("TAGS:", margin, currentY);

      const tagsText = data.tags.join(" | ").toUpperCase();
      doc
        .fontSize(11)
        .font(this.tixTheme.fonts.regular)
        .fillColor(this.tixTheme.colors.foreground)
        .text(tagsText, margin + 80, currentY, {
          width: doc.page.width - margin - 120,
        });

      currentY += 30;
    }

    return currentY + 20;
  }

  private addEventDescription(doc: any, data: any, startY: number): number {
    if (!data.description) return startY;

    const margin = 40;

    // Simple section header
    doc
      .fontSize(14)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.foreground)
      .text("ABOUT THIS EVENT", margin, startY);

    // Clean underline
    doc.rect(margin, startY + 20, 150, 2).fill(this.tixTheme.colors.foreground);

    const currentY = startY + 40;

    // Description with clean black and white styling
    const cleanDescription = this.cleanText(data.description);
    const wrappedText = this.wrapText(
      doc,
      cleanDescription,
      doc.page.width - margin * 2,
      12,
    );

    doc
      .fontSize(12)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.foreground);

    doc.text(wrappedText, margin, currentY, {
      width: doc.page.width - margin * 2,
      align: "left",
      lineGap: 4,
    });

    const textHeight = doc.heightOfString(wrappedText, {
      width: doc.page.width - margin * 2,
      lineGap: 4,
    });

    return currentY + textHeight + 30;
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

    // Create black and white PDF styles
    const pdfStyles: PDFStyles = {
      colors: {
        primary: this.tixTheme.colors.foreground,
        secondary: this.tixTheme.colors.muted,
        accent: this.tixTheme.colors.foreground,
        success: this.tixTheme.colors.foreground,
        warning: this.tixTheme.colors.muted,
        error: this.tixTheme.colors.foreground,
        neutral: this.tixTheme.colors.muted,
        background: this.tixTheme.colors.background,
        foreground: this.tixTheme.colors.foreground,
        muted: this.tixTheme.colors.muted,
        card: this.tixTheme.colors.card,
        border: this.tixTheme.colors.border,
        shadow: this.tixTheme.colors.shadow,
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
    const footerY = doc.page.height - 60;

    // Simple black line separator
    doc
      .rect(40, footerY, doc.page.width - 80, 2)
      .fill(this.tixTheme.colors.foreground);

    // Clean footer content
    doc
      .fontSize(12)
      .font(this.tixTheme.fonts.bold)
      .fillColor(this.tixTheme.colors.foreground)
      .text("TICKIT", 40, footerY + 15);

    doc
      .fontSize(9)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.muted)
      .text("Premier Event Ticketing Platform", 40, footerY + 32);

    // Generation date - clean and minimal
    const generationDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    doc
      .fontSize(9)
      .font(this.tixTheme.fonts.regular)
      .fillColor(this.tixTheme.colors.muted)
      .text(`Generated: ${generationDate}`, doc.page.width - 120, footerY + 25);
  }

  // SIMPLIFIED BLACK & WHITE HELPER COMPONENTS (REMOVED COMPLEX UI FUNCTIONS)

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
