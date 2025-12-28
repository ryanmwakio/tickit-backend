// Enhanced PDF styling utilities for Tickit ticket brief generation

export interface PDFStyles {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    neutral: string;
    background: string;
    foreground: string;
    muted: string;
    card: string;
    border: string;
    shadow: string;
  };
  fonts: {
    regular: string;
    bold: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

export interface TicketType {
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
}

export class PdfStylesUtil {
  private static defaultStyles: PDFStyles = {
    colors: {
      primary: "#2563eb",
      secondary: "#7c3aed",
      accent: "#06b6d4",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      neutral: "#6b7280",
      background: "#ffffff",
      foreground: "#1f2937",
      muted: "#9ca3af",
      card: "#ffffff",
      border: "#e5e7eb",
      shadow: "#000000",
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
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
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

  /**
   * Enhanced ticket types section with improved layout and visual hierarchy
   */
  static addEnhancedTicketTypesSection(
    doc: any,
    ticketTypes: TicketType[],
    startY: number,
    styles: PDFStyles = this.defaultStyles,
  ): number {
    const margin = 40;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - margin * 2;
    let currentY = startY;

    // Section header with enhanced styling
    currentY = this.addSectionHeader(
      doc,
      "Available Tickets",
      margin,
      currentY,
      contentWidth,
      styles,
    );

    currentY += styles.spacing.lg;

    // Add ticket grid layout for better organization
    const ticketsPerRow = ticketTypes.length <= 2 ? ticketTypes.length : 2;
    const cardWidth =
      (contentWidth - styles.spacing.md * (ticketsPerRow - 1)) / ticketsPerRow;

    for (let i = 0; i < ticketTypes.length; i += ticketsPerRow) {
      const rowTickets = ticketTypes.slice(i, i + ticketsPerRow);
      const maxCardHeight = this.calculateMaxCardHeight(rowTickets);

      // Check if we need a new page
      if (currentY + maxCardHeight > doc.page.height - 100) {
        doc.addPage();
        currentY = margin;
      }

      // Render tickets in current row
      for (let j = 0; j < rowTickets.length; j++) {
        const ticket = rowTickets[j];
        const cardX = margin + j * (cardWidth + styles.spacing.md);

        this.addEnhancedTicketCard(
          doc,
          ticket,
          cardX,
          currentY,
          cardWidth,
          maxCardHeight,
          styles,
        );
      }

      currentY += maxCardHeight + styles.spacing.lg;
    }

    return currentY;
  }

  /**
   * Enhanced ticket card with premium design elements
   */
  static addEnhancedTicketCard(
    doc: any,
    ticket: TicketType,
    x: number,
    y: number,
    width: number,
    height: number,
    styles: PDFStyles = this.defaultStyles,
  ): void {
    // Card shadow
    doc
      .roundedRect(x + 2, y + 2, width, height, styles.borderRadius.lg)
      .fill(styles.colors.shadow)
      .opacity(0.08);

    doc.opacity(1);

    // Main card background
    const cardFill = ticket.sold_out ? "#f8fafc" : styles.colors.card;
    doc
      .roundedRect(x, y, width, height, styles.borderRadius.lg)
      .fill(cardFill)
      .stroke(ticket.popular ? styles.colors.primary : styles.colors.border)
      .lineWidth(ticket.popular ? 2 : 1);

    // Popular badge
    if (ticket.popular) {
      this.addPopularBadge(doc, x + width - 80, y + styles.spacing.sm, styles);
    }

    // Early bird badge
    if (ticket.early_bird) {
      this.addEarlyBirdBadge(
        doc,
        x + styles.spacing.sm,
        y + styles.spacing.sm,
        styles,
      );
    }

    let contentY =
      y + (ticket.early_bird || ticket.popular ? 35 : styles.spacing.md);

    // Ticket name with icon
    doc
      .fontSize(styles.fontSize.lg)
      .font(styles.fonts.bold)
      .fillColor(
        ticket.sold_out ? styles.colors.muted : styles.colors.foreground,
      );

    doc.text("🎫", x + styles.spacing.md, contentY, { width: 20 });
    doc.text(ticket.name, x + styles.spacing.md + 25, contentY, {
      width: width - 120,
    });

    contentY += styles.spacing.lg + styles.spacing.sm;

    // Price with enhanced styling
    this.addPriceDisplay(
      doc,
      ticket,
      x + styles.spacing.md,
      contentY,
      width - styles.spacing.md * 2,
      styles,
    );
    contentY += styles.spacing.lg;

    // Availability status with visual indicator
    this.addAvailabilityDisplay(
      doc,
      ticket,
      x + styles.spacing.md,
      contentY,
      width - styles.spacing.md * 2,
      styles,
    );
    contentY += styles.spacing.md + styles.spacing.sm;

    // Description if available
    if (ticket.description) {
      contentY += styles.spacing.sm;
      doc
        .fontSize(styles.fontSize.sm)
        .font(styles.fonts.regular)
        .fillColor(styles.colors.neutral);

      const cleanDescription = this.cleanText(ticket.description);
      doc.text(cleanDescription, x + styles.spacing.md, contentY, {
        width: width - styles.spacing.md * 2,
        height: 40,
        ellipsis: true,
      });
    }

    // Features list if available
    if (ticket.features && ticket.features.length > 0) {
      contentY += 35;
      this.addFeaturesList(
        doc,
        ticket.features,
        x + styles.spacing.md,
        contentY,
        width - styles.spacing.md * 2,
        styles,
      );
    }

    // Sold out overlay
    if (ticket.sold_out) {
      this.addSoldOutOverlay(doc, x, y, width, height, styles);
    }
  }

  /**
   * Add section header with enhanced styling
   */
  static addSectionHeader(
    doc: any,
    title: string,
    x: number,
    y: number,
    width: number,
    styles: PDFStyles = this.defaultStyles,
  ): number {
    const headerHeight = 50;

    // Background gradient simulation
    doc
      .rect(x, y, width, headerHeight)
      .fill(styles.colors.primary)
      .opacity(0.03);

    doc.opacity(1);

    // Header border
    doc
      .roundedRect(x, y, width, headerHeight, styles.borderRadius.sm)
      .stroke(styles.colors.border)
      .lineWidth(1);

    // Title
    doc
      .fontSize(styles.fontSize.xl)
      .font(styles.fonts.bold)
      .fillColor(styles.colors.primary);

    doc.text(title, x + styles.spacing.lg, y + 15);

    // Accent line
    doc
      .rect(x + styles.spacing.lg, y + headerHeight - 8, 60, 3)
      .fill(styles.colors.accent);

    return y + headerHeight;
  }

  /**
   * Add popular badge
   */
  private static addPopularBadge(
    doc: any,
    x: number,
    y: number,
    styles: PDFStyles,
  ): void {
    const badgeWidth = 70;
    const badgeHeight = 20;

    doc
      .roundedRect(x, y, badgeWidth, badgeHeight, styles.borderRadius.sm)
      .fill(styles.colors.primary);

    doc
      .fontSize(styles.fontSize.xs)
      .font(styles.fonts.bold)
      .fillColor("#ffffff");

    doc.text("⭐ POPULAR", x + 8, y + 6, { width: badgeWidth - 16 });
  }

  /**
   * Add early bird badge
   */
  private static addEarlyBirdBadge(
    doc: any,
    x: number,
    y: number,
    styles: PDFStyles,
  ): void {
    const badgeWidth = 85;
    const badgeHeight = 20;

    doc
      .roundedRect(x, y, badgeWidth, badgeHeight, styles.borderRadius.sm)
      .fill(styles.colors.warning);

    doc
      .fontSize(styles.fontSize.xs)
      .font(styles.fonts.bold)
      .fillColor("#ffffff");

    doc.text("🐦 EARLY BIRD", x + 6, y + 6, { width: badgeWidth - 12 });
  }

  /**
   * Add price display with enhanced styling
   */
  private static addPriceDisplay(
    doc: any,
    ticket: TicketType,
    x: number,
    y: number,
    width: number,
    styles: PDFStyles,
  ): void {
    const isFree =
      ticket.price.toLowerCase().includes("free") || ticket.price === "0";
    const priceColor = isFree
      ? styles.colors.success
      : styles.colors.foreground;

    // Price background
    const priceBoxWidth = 120;
    doc
      .roundedRect(x, y - 2, priceBoxWidth, 24, styles.borderRadius.sm)
      .fill(isFree ? "#f0fdf4" : "#f8fafc")
      .stroke(isFree ? styles.colors.success : styles.colors.border)
      .lineWidth(1);

    // Price text
    doc
      .fontSize(styles.fontSize.lg)
      .font(styles.fonts.bold)
      .fillColor(priceColor);

    const priceText = isFree ? "💚 FREE" : `💰 ${ticket.price}`;
    doc.text(priceText, x + styles.spacing.sm, y + 2);
  }

  /**
   * Add availability display with visual indicators
   */
  private static addAvailabilityDisplay(
    doc: any,
    ticket: TicketType,
    x: number,
    y: number,
    width: number,
    styles: PDFStyles,
  ): void {
    let statusColor = styles.colors.success;
    let statusText = "";
    let statusIcon = "🟢";

    if (ticket.sold_out || ticket.available === 0) {
      statusColor = styles.colors.error;
      statusText = "SOLD OUT";
      statusIcon = "🔴";
    } else if (ticket.available <= 10) {
      statusColor = styles.colors.warning;
      statusText = `${ticket.available} tickets left`;
      statusIcon = "🟡";
    } else if (ticket.available <= 50) {
      statusColor = styles.colors.warning;
      statusText = `${ticket.available} available`;
      statusIcon = "🟡";
    } else {
      statusText = `${ticket.available} available`;
    }

    // Status indicator
    doc
      .fontSize(styles.fontSize.sm)
      .font(styles.fonts.regular)
      .fillColor(statusColor);

    doc.text(`${statusIcon} ${statusText}`, x, y);

    // Progress bar if total is available
    if (ticket.total && ticket.total > 0 && !ticket.sold_out) {
      const progressY = y + 16;
      const progressWidth = 100;
      const progressHeight = 4;
      const fillWidth = (ticket.available / ticket.total) * progressWidth;

      // Progress background
      doc
        .roundedRect(x, progressY, progressWidth, progressHeight, 2)
        .fill(styles.colors.border);

      // Progress fill
      if (fillWidth > 0) {
        doc
          .roundedRect(x, progressY, fillWidth, progressHeight, 2)
          .fill(statusColor);
      }
    }
  }

  /**
   * Add features list
   */
  private static addFeaturesList(
    doc: any,
    features: string[],
    x: number,
    y: number,
    width: number,
    styles: PDFStyles,
  ): void {
    doc
      .fontSize(styles.fontSize.sm)
      .font(styles.fonts.regular)
      .fillColor(styles.colors.neutral);

    const maxFeatures = Math.min(features.length, 3);
    for (let i = 0; i < maxFeatures; i++) {
      doc.text(`✓ ${features[i]}`, x, y + i * 12, { width: width });
    }

    if (features.length > 3) {
      doc.fontSize(styles.fontSize.xs).fillColor(styles.colors.muted);
      doc.text(`+${features.length - 3} more features`, x, y + 3 * 12, {
        width: width,
      });
    }
  }

  /**
   * Add sold out overlay
   */
  private static addSoldOutOverlay(
    doc: any,
    x: number,
    y: number,
    width: number,
    height: number,
    styles: PDFStyles,
  ): void {
    // Semi-transparent overlay
    doc
      .roundedRect(x, y, width, height, styles.borderRadius.lg)
      .fill("#ffffff")
      .opacity(0.8);

    doc.opacity(1);

    // Diagonal "SOLD OUT" text
    doc.save();
    doc.translate(x + width / 2, y + height / 2);
    doc.rotate(-15);

    doc
      .fontSize(styles.fontSize.xl)
      .font(styles.fonts.bold)
      .fillColor(styles.colors.error);

    doc.text("SOLD OUT", -35, -8);
    doc.restore();
  }

  /**
   * Calculate maximum card height for consistent row layout
   */
  private static calculateMaxCardHeight(tickets: TicketType[]): number {
    let maxHeight = 140; // Base height

    tickets.forEach((ticket) => {
      let ticketHeight = 140;

      if (ticket.description) {
        ticketHeight += 40;
      }

      if (ticket.features && ticket.features.length > 0) {
        ticketHeight += Math.min(ticket.features.length, 3) * 12 + 20;
      }

      maxHeight = Math.max(maxHeight, ticketHeight);
    });

    return maxHeight;
  }

  /**
   * Clean text for safe PDF rendering
   */
  private static cleanText(text: string): string {
    if (!text) return "";
    return text
      .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Add ticket summary statistics
   */
  static addTicketSummary(
    doc: any,
    ticketTypes: TicketType[],
    x: number,
    y: number,
    width: number,
    styles: PDFStyles = this.defaultStyles,
  ): number {
    const summaryHeight = 60;

    // Background
    doc
      .roundedRect(x, y, width, summaryHeight, styles.borderRadius.md)
      .fill("#f8fafc")
      .stroke(styles.colors.border);

    // Calculate summary stats
    const totalTickets = ticketTypes.reduce(
      (sum, ticket) => sum + ticket.available,
      0,
    );
    const soldOutCount = ticketTypes.filter(
      (ticket) => ticket.sold_out || ticket.available === 0,
    ).length;
    const activeTypes = ticketTypes.length - soldOutCount;

    const statsY = y + styles.spacing.md;

    // Total tickets available
    doc
      .fontSize(styles.fontSize.md)
      .font(styles.fonts.bold)
      .fillColor(styles.colors.foreground);

    doc.text("📊 Ticket Summary", x + styles.spacing.md, statsY);

    doc
      .fontSize(styles.fontSize.sm)
      .font(styles.fonts.regular)
      .fillColor(styles.colors.neutral);

    const summaryText = `${totalTickets} tickets available across ${activeTypes} ticket types`;
    doc.text(summaryText, x + styles.spacing.md, statsY + 18);

    if (soldOutCount > 0) {
      doc.fillColor(styles.colors.error);
      doc.text(
        `${soldOutCount} ticket type(s) sold out`,
        x + styles.spacing.md,
        statsY + 32,
      );
    }

    return y + summaryHeight;
  }
}
