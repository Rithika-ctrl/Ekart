package com.example.ekart.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

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

    private static final String K_NA = "N/A";


    /**
     * Generate invoice PDF for an order.
     * Returns PDF as byte array for download/storage.
     */
    public byte[] generateInvoicePdf(Order order) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(outputStream);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc, PageSize.A4);
        document.setMargins(20, 20, 20, 20);

        PdfFont titleFont  = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont headerFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont normalFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);
        PdfFont smallFont  = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

        addInvoiceHeader(document, order, titleFont, normalFont, smallFont);
        addAddressSection(document, order, headerFont, normalFont, smallFont);

        double subTotalBeforeGST = addItemsTable(document, order, headerFont, normalFont);
        double gstTotal = resolveGstTotal(order);

        addTotalsSection(document, order, normalFont, headerFont, subTotalBeforeGST, gstTotal);
        addPaymentInfo(document, order, normalFont);
        addInvoiceFooter(document, smallFont);

        document.close();
        return outputStream.toByteArray();
    }

    private void addInvoiceHeader(Document document, Order order,
                                   PdfFont titleFont, PdfFont normalFont, PdfFont smallFont) {
        document.add(new Paragraph("EKART")
                .setFont(titleFont).setFontSize(24)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(ColorConstants.BLUE));
        document.add(new Paragraph("Tax Invoice / Receipt")
                .setFont(normalFont).setFontSize(11)
                .setTextAlignment(TextAlignment.CENTER));
        document.add(new Paragraph()
                .setFont(smallFont).setFontSize(9)
                .setTextAlignment(TextAlignment.CENTER)
                .add("Invoice #: " + order.getId() + " | Date: " + formatDate(new Date())));
        document.add(new Paragraph("\n"));
    }

    private void addAddressSection(Document document, Order order,
                                    PdfFont headerFont, PdfFont normalFont, PdfFont smallFont) {
        String customerName  = order.getCustomer() != null ? order.getCustomer().getName()  : K_NA;
        String customerEmail = order.getCustomer() != null ? order.getCustomer().getEmail() : K_NA;

        Table addressTable = new Table(2);
        addressTable.setWidth(UnitValue.createPercentValue(100));
        addressTable.addCell(buildBillToCell(customerName, customerEmail, headerFont, normalFont, smallFont));
        addressTable.addCell(buildShipToCell(order, headerFont, normalFont));

        document.add(addressTable);
        document.add(new Paragraph("\n"));
    }

    private Cell buildBillToCell(String customerName, String customerEmail,
                                  PdfFont headerFont, PdfFont normalFont, PdfFont smallFont) {
        return new Cell()
                .setBorder(new SolidBorder(1)).setPadding(8)
                .add(new Paragraph("BILL TO").setFont(headerFont).setFontSize(10))
                .add(new Paragraph("Customer").setFont(normalFont).setFontSize(9))
                .add(new Paragraph(customerName).setFont(normalFont).setFontSize(10))
                .add(new Paragraph("Email: " + customerEmail).setFont(smallFont).setFontSize(8));
    }

    private Cell buildShipToCell(Order order, PdfFont headerFont, PdfFont normalFont) {
        String deliveryAddr = resolveDeliveryAddress(order);
        return new Cell()
                .setBorder(new SolidBorder(1)).setPadding(8)
                .add(new Paragraph("SHIP TO").setFont(headerFont).setFontSize(10))
                .add(new Paragraph(deliveryAddr).setFont(normalFont).setFontSize(9));
    }

    /** Resolves a human-readable delivery address, falling back to the customer's last stored address. */
    private String resolveDeliveryAddress(Order order) {
        String deliveryAddr = order.getDeliveryAddress();
        if (deliveryAddr != null && !deliveryAddr.trim().isEmpty()) {
            return deliveryAddr;
        }
        if (order.getCustomer() == null
                || order.getCustomer().getAddresses() == null
                || order.getCustomer().getAddresses().isEmpty()) {
            return K_NA;
        }
        com.example.ekart.dto.Address addr =
                order.getCustomer().getAddresses().get(order.getCustomer().getAddresses().size() - 1);
        String built = buildAddressString(addr).trim().replaceAll("[,\\s]+$", "");
        return built.isEmpty() ? K_NA : built;
    }

    private String buildAddressString(com.example.ekart.dto.Address addr) {
        StringBuilder sb = new StringBuilder();
        appendIfNotBlank(sb, addr.getRecipientName(), "\n");
        appendIfNotBlank(sb, addr.getHouseStreet(), ", ");
        appendIfNotBlank(sb, addr.getCity(), "");
        if (addr.getState() != null && !addr.getState().isBlank()) {
            sb.append(", ").append(addr.getState());
        }
        if (addr.getPostalCode() != null && !addr.getPostalCode().isBlank()) {
            sb.append(" - ").append(addr.getPostalCode());
        }
        return sb.toString();
    }

    private void appendIfNotBlank(StringBuilder sb, String value, String suffix) {
        if (value != null && !value.isBlank()) {
            sb.append(value).append(suffix);
        }
    }

    /** Adds the items table and returns the subtotal before GST. */
    private double addItemsTable(Document document, Order order,
                                  PdfFont headerFont, PdfFont normalFont) {
        Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{10, 30, 10, 15, 15, 20}));
        itemsTable.setWidth(UnitValue.createPercentValue(100));

        addHeaderCell(itemsTable, "S.No",          headerFont);
        addHeaderCell(itemsTable, "Description",   headerFont);
        addHeaderCell(itemsTable, "Qty",           headerFont);
        addHeaderCell(itemsTable, "Unit Price",    headerFont);
        addHeaderCell(itemsTable, "GST",           headerFont);
        addHeaderCell(itemsTable, "Amount (INR)",  headerFont);

        double subTotal = 0;
        if (order.getItems() != null && !order.getItems().isEmpty()) {
            int itemNumber = 1;
            for (com.example.ekart.dto.Item item : order.getItems()) {
                subTotal += addItemRow(itemsTable, item, itemNumber, normalFont);
                itemNumber++;
            }
        }

        document.add(itemsTable);
        document.add(new Paragraph("\n"));
        return subTotal;
    }

    /** Adds a single item row; returns the item total (qty × unitPrice). */
    private double addItemRow(Table table, com.example.ekart.dto.Item item,
                               int itemNumber, PdfFont normalFont) {
        double unitPrice  = item.getUnitPrice() > 0 ? item.getUnitPrice() : item.getPrice();
        double itemAmount = item.getQuantity() * unitPrice;
        int gstRate       = GstUtil.getGstRatePercent(item.getCategory());

        addItemCell(table, String.valueOf(itemNumber),                         normalFont);
        addItemCell(table, item.getName() != null ? item.getName() : K_NA,    normalFont);
        addItemCell(table, String.valueOf(item.getQuantity()),                 normalFont);
        addItemCell(table, "₹" + String.format("%.2f", unitPrice),            normalFont);
        addItemCell(table, gstRate + "%",                                      normalFont);
        addItemCell(table, "₹" + String.format("%.2f", itemAmount),           normalFont);
        return itemAmount;
    }

    private double resolveGstTotal(Order order) {
        double gstTotal = order.getGstAmount();
        if (gstTotal <= 0 && order.getItems() != null && !order.getItems().isEmpty()) {
            gstTotal = GstUtil.calculateTotalGst(order.getItems());
        }
        return gstTotal;
    }

    private void addTotalsSection(Document document, Order order, PdfFont normalFont, PdfFont headerFont,
                                   double subTotalBeforeGST, double gstTotal) {
        Table totalsTable = new Table(UnitValue.createPercentArray(new float[]{60, 40}));
        totalsTable.setWidth(UnitValue.createPercentValue(100));
        totalsTable.setHorizontalAlignment(HorizontalAlignment.RIGHT);

        addTotalRow(totalsTable, "Subtotal (before GST):", "₹" + String.format("%.2f", subTotalBeforeGST), normalFont);
        addTotalRow(totalsTable, "GST (Total):",           "₹" + String.format("%.2f", gstTotal),          normalFont);
        addTotalRow(totalsTable, "Delivery Charges:",      "₹" + String.format("%.2f", order.getDeliveryCharge()), normalFont);

        totalsTable.addCell(new Cell().setBorder(new SolidBorder(2)).setPadding(8)
                .add(new Paragraph("TOTAL AMOUNT DUE").setFont(headerFont).setFontSize(11).setFontColor(ColorConstants.WHITE))
                .setBackgroundColor(ColorConstants.DARK_GRAY));
        totalsTable.addCell(new Cell().setBorder(new SolidBorder(2)).setPadding(8)
                .add(new Paragraph("₹" + String.format("%.2f", order.getTotalPrice()))
                        .setFont(headerFont).setFontSize(11).setFontColor(ColorConstants.WHITE))
                .setBackgroundColor(ColorConstants.DARK_GRAY)
                .setTextAlignment(TextAlignment.RIGHT));

        document.add(totalsTable);
        document.add(new Paragraph("\n"));
    }

    private void addPaymentInfo(Document document, Order order, PdfFont normalFont) {
        String paymentMode  = order.getPaymentMode()      != null ? order.getPaymentMode()               : K_NA;
        String orderStatus  = order.getTrackingStatus()   != null ? order.getTrackingStatus().toString() : K_NA;
        String orderDate    = order.getOrderDate()         != null
                ? formatDate(java.sql.Timestamp.valueOf(order.getOrderDate())) : K_NA;

        document.add(new Paragraph()
                .setFont(normalFont).setFontSize(9)
                .add("Payment Method: " + paymentMode + "\n")
                .add("Order Status: "   + orderStatus + "\n")
                .add("Order Date: "     + orderDate));
        document.add(new Paragraph("\n"));
    }

    private void addInvoiceFooter(Document document, PdfFont smallFont) {
        document.add(new Paragraph("Thank you for your purchase!\nFor queries, contact support@ekart.dev")
                .setFont(smallFont).setFontSize(8)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(ColorConstants.GRAY));
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