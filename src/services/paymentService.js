const { prisma } = require('../config/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(orderId) {
    const numericOrderId = Number(orderId);

    const order = await prisma.Order.findUnique({
        where: { id: numericOrderId },
        include: {
            user: true,
            items: { include: { product: true } }
        },
    });

    if (!order) {
        throw new Error('Order not found.');
    }
    if (order.status !== 'PENDING') {
        throw new Error('This order is not pending and cannot be paid for.');
    }

    const YOUR_DOMAIN = process.env.FRONTEND_URL || 'http://localhost:8383';

    const line_items = order.items.map(item => {
        let unit_amount_cents;
        let itemName = item.product.nameEn;

        if (item.transactionType === 'SALE') {
            // For sales, the price is the straightforward sellPrice.
            unit_amount_cents = Math.round(item.product.sellPrice * 100);
        } else { // It's a RENT
            const startDate = new Date(item.rentalStartDate);
            const endDate = new Date(item.rentalEndDate);

            // Calculate duration in days, rounding up.
            const rentalDurationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

            // The product's rentPrice is the daily rate.
            const dailyRate = item.product.rentPrice;

            // The total price for this single rental item.
            const totalRentalPrice = dailyRate * rentalDurationDays;

            // Convert the final calculated price to cents for Stripe.
            unit_amount_cents = Math.round(totalRentalPrice * 100);

            // Add the duration to the item name for clarity on the checkout page.
            itemName += ` (Rental: ${rentalDurationDays} days)`;
        }

        return {
            price_data: {
                currency: 'usd', // Change to your currency
                product_data: {
                    name: itemName,
                },
                unit_amount: unit_amount_cents,
            },
            quantity: item.quantity,
        };
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: order.user.email,
        metadata: {
            orderId: order.id.toString(),
        },
        success_url: `${YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${YOUR_DOMAIN}/payment-cancelled`,
        line_items: line_items,
    });

    return session;
}

module.exports = { createCheckoutSession };