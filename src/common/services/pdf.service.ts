import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

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
          size: 'A4',
          margin: 50,
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header with event title
        doc.fontSize(24).font('Helvetica-Bold').text(data.eventTitle, {
          align: 'center',
        });
        doc.moveDown(0.5);

        // Ticket number
        doc.fontSize(12).font('Helvetica').fillColor('gray').text(`Ticket #${data.ticketNumber}`, {
          align: 'center',
        });
        doc.moveDown(1);

        // QR Code
        // Convert data URL to buffer
        try {
          const base64Data = data.qrCodeDataUrl.includes(',')
            ? data.qrCodeDataUrl.split(',')[1]
            : data.qrCodeDataUrl;
          const qrCodeBuffer = Buffer.from(base64Data, 'base64');
          const qrSize = 150;
          const qrX = (doc.page.width - qrSize) / 2;
          doc.image(qrCodeBuffer, qrX, doc.y, {
            width: qrSize,
            height: qrSize,
          });
          doc.moveDown(2);
        } catch (error) {
          this.logger.warn('Failed to add QR code to PDF, continuing without it:', error);
          doc.moveDown(1);
        }

        // Ticket details section
        doc.fontSize(16).font('Helvetica-Bold').fillColor('black').text('Ticket Details', {
          align: 'left',
        });
        doc.moveDown(0.5);

        doc.fontSize(11).font('Helvetica');
        const details = [
          { label: 'Attendee:', value: data.attendeeName },
          { label: 'Ticket Type:', value: data.ticketType },
          { label: 'Date:', value: data.eventDate },
          { label: 'Location:', value: data.eventLocation },
          { label: 'Price:', value: data.price },
          { label: 'Order #:', value: data.orderNumber },
        ];

        details.forEach((detail) => {
          doc.font('Helvetica-Bold').text(detail.label, { continued: true });
          doc.font('Helvetica').text(` ${detail.value}`);
          doc.moveDown(0.3);
        });

        // Footer
        doc.moveDown(2);
        doc.fontSize(9).fillColor('gray').text('Present this ticket at the event entrance', {
          align: 'center',
        });
        doc.moveDown(0.3);
        doc.text('For support, contact the event organizer', {
          align: 'center',
        });

        doc.end();
      } catch (error) {
        this.logger.error('Error generating PDF:', error);
        reject(error);
      }
    });
  }
}

