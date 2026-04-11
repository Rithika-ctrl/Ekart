package com.example.ekart.service;

import com.example.ekart.dto.Order;
import com.example.ekart.helper.GstUtil;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * InvoiceService.java
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates PDF invoices for orders after delivery.
 * Feature #46: Invoice PDF Generation & Download
 * 
 * Includes:
 * - Order details, items, quantities, prices
 * - GST breakdown per item/total
 * - Customer and vendor information
 * - Payment method and order status
 * - Professional formatting suitable for printing
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Service
public class InvoiceService {

    /**
     * Generate invoice PDF for an order.
     * Returns PDF as byte array for download/storage.
     */
    public byte[] generateInvoicePdf(Order order) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(outputStream);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc, PageSize.A4);
        document.setMargins(20, 20, 20, 20);

        PdfFont titleFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont headerFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont normalFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);
        PdfFont smallFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

        // ─── Header Section ───────────────────────────────────────────────────
        Paragraph header = new Paragraph("EKART")
                .setFont(titleFont)
                .setFontSize(24)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(ColorConstants.BLUE);
        document.add(header);

        Paragraph subtitle = new Paragraph("Tax Invoice / Receipt")
                .setFont(normalFont)
                .setFontSize(11)
                .setTextAlignment(TextAlignment.CENTER);
        document.add(subtitle);

        // ─── Invoice Details ──────────────────────────────────────────────────
        Paragraph invoiceDetails = new Paragraph()
                .setFont(smallFont)
                .setFontSize(9)
                .setTextAlignment(TextAlignment.CENTER)
                .add("Invoice #: " + order.getId() + " | Date: " + formatDate(new Date()));
        document.add(invoiceDetails);
        document.add(new Paragraph("\n"));

        // ─── Bill To / Ship To Section ────────────────────────────────────────
        Table addressTable = new Table(2);
        addressTable.setWidth(UnitValue.createPercentValue(100));

        String customerName = order.getCustomer() != null ? order.getCustomer().getName() : "N/A";
        String customerEmail = order.getCustomer() != null ? order.getCustomer().getEmail() : "N/A";

        // Bill To
        Cell billTo = new Cell()
                .setBorder(new SolidBorder(1))
                .setPadding(8)
                .add(new Paragraph("BILL TO").setFont(headerFont).setFontSize(10))
                .add(new Paragraph("Customer").setFont(normalFont).setFontSize(9))
                .add(new Paragraph(customerName).setFont(normalFont).setFontSize(10))
                .add(new Paragraph("Email: " + customerEmail)
                        .setFont(smallFont).setFontSize(8));
        addressTable.addCell(billTo);

        // Ship To
        Cell shipTo = new Cell()
                .setBorder(new SolidBorder(1))
                .setPadding(8)
                .add(new Paragraph("SHIP TO").setFont(headerFont).setFontSize(10))
                .add(new Paragraph(order.getDeliveryAddress() != null ? order.getDeliveryAddress() : "N/A")
                        .setFont(normalFont).setFontSize(9));
        addressTable.addCell(shipTo);

        document.add(addressTable);
        document.add(new Paragraph("\n"));

        // ─── Order Items Table ────────────────────────────────────────────────
        Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{10, 30, 10, 15, 15, 20}));
        itemsTable.setWidth(UnitValue.createPercentValue(100));

        // Table Headers
        addHeaderCell(itemsTable, "S.No", headerFont);
        addHeaderCell(itemsTable, "Description", headerFont);
        addHeaderCell(itemsTable, "Qty", headerFont);
        addHeaderCell(itemsTable, "Unit Price", headerFont);
        addHeaderCell(itemsTable, "GST", headerFont);
        addHeaderCell(itemsTable, "Amount (INR)", headerFont);

        // Order Items
        double subTotalBeforeGST = 0;
        if (order.getItems() != null && !order.getItems().isEmpty()) {
            int itemNumber = 1;
            for (com.example.ekart.dto.Item item : order.getItems()) {
                addItemCell(itemsTable, String.valueOf(itemNumber), normalFont);
                addItemCell(itemsTable, item.getName() != null ? item.getName() : "N/A", normalFont);
                addItemCell(itemsTable, String.valueOf(item.getQuantity()), normalFont);
                double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice() : item.getPrice();
                addItemCell(itemsTable, "₹" + String.format("%.2f", unitPrice), normalFont);
                
                // Calculate GST rate for this item based on category
                int gstRatePercent = GstUtil.getGstRatePercent(item.getCategory());
                addItemCell(itemsTable, gstRatePercent + "%", normalFont);
                
                // Item total including GST
                double itemAmount = item.getQuantity() * unitPrice;
                subTotalBeforeGST += itemAmount;
                addItemCell(itemsTable, "₹" + String.format("%.2f", itemAmount), normalFont);
                itemNumber++;
            }
        }

        document.add(itemsTable);
        document.add(new Paragraph("\n"));

        // ─── Totals Section ───────────────────────────────────────────────────
        Table totalsTable = new Table(UnitValue.createPercentArray(new float[]{60, 40}));
        totalsTable.setWidth(UnitValue.createPercentValue(100));
        totalsTable.setHorizontalAlignment(HorizontalAlignment.RIGHT);

        addTotalRow(totalsTable, "Subtotal (before GST):", "₹" + String.format("%.2f", subTotalBeforeGST), normalFont);
        addTotalRow(totalsTable, "GST (Total):", "₹" + String.format("%.2f", order.getGstAmount()), normalFont);
        addTotalRow(totalsTable, "Delivery Charges:", "₹" + String.format("%.2f", order.getDeliveryCharge()), normalFont);

        Cell finalTotalCell = new Cell()
                .setBorder(new SolidBorder(2))
                .setPadding(8)
                .add(new Paragraph("TOTAL AMOUNT DUE").setFont(headerFont).setFontSize(11).setFontColor(ColorConstants.WHITE))
                .setBackgroundColor(ColorConstants.DARK_GRAY);
        totalsTable.addCell(finalTotalCell);

        Cell finalTotalAmount = new Cell()
                .setBorder(new SolidBorder(2))
                .setPadding(8)
                .add(new Paragraph("₹" + String.format("%.2f", order.getTotalPrice()))
                        .setFont(headerFont).setFontSize(11).setFontColor(ColorConstants.WHITE))
                .setBackgroundColor(ColorConstants.DARK_GRAY)
                .setTextAlignment(TextAlignment.RIGHT);
        totalsTable.addCell(finalTotalAmount);

        document.add(totalsTable);
        document.add(new Paragraph("\n"));

        // ─── Payment & Order Info ─────────────────────────────────────────────
        Paragraph paymentInfo = new Paragraph()
                .setFont(normalFont)
                .setFontSize(9)
                .add("Payment Method: " + (order.getPaymentMode() != null ? order.getPaymentMode() : "N/A") + "\n")
                .add("Order Status: " + (order.getTrackingStatus() != null ? order.getTrackingStatus().toString() : "N/A") + "\n")
                .add("Order Date: " + (order.getOrderDate() != null ? formatDate(java.sql.Timestamp.valueOf(order.getOrderDate())) : "N/A"));
        document.add(paymentInfo);

        document.add(new Paragraph("\n"));

        // ─── Footer ────────────────────────────────────────────────────────────
        Paragraph footer = new Paragraph("Thank you for your purchase!\nFor queries, contact support@ekart.dev")
                .setFont(smallFont)
                .setFontSize(8)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(ColorConstants.GRAY);
        document.add(footer);

        document.close();
        return outputStream.toByteArray();
    }

    private void addHeaderCell(Table table, String text, PdfFont font) {
        Cell cell = new Cell()
                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(230, 230, 250))
                .setBorder(new SolidBorder(1))
                .setPadding(6)
                .add(new Paragraph(text).setFont(font).setFontSize(9));
        table.addCell(cell);
    }

    private void addItemCell(Table table, String text, PdfFont font) {
        Cell cell = new Cell()
                .setBorder(new SolidBorder(0.5f))
                .setPadding(4)
                .add(new Paragraph(text).setFont(font).setFontSize(9));
        table.addCell(cell);
    }

    private void addTotalRow(Table table, String label, String amount, PdfFont font) {
        Cell labelCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .setPadding(4)
                .add(new Paragraph(label).setFont(font).setFontSize(9));
        table.addCell(labelCell);

        Cell amountCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .setPadding(4)
                .add(new Paragraph(amount).setFont(font).setFontSize(9));
        table.addCell(amountCell);
    }

    private String formatDate(Date date) {
        SimpleDateFormat formatter = new SimpleDateFormat("dd/MM/yyyy HH:mm");
        return formatter.format(date);
    }
}
