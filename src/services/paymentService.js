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
    
    const YOUR_DOMAIN = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: order.user.email,
        metadata: {
            orderId: order.id.toString(),
        },
        success_url: `${YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${YOUR_DOMAIN}/payment-cancelled`,
        line_items: order.items.map(item => {
            let itemName = item.product.nameEn;
            if (item.transactionType === 'RENT') {
                const startDate = new Date(item.rentalStartDate).toLocaleDate-String();
                const endDate = new Date(item.rentalEndDate).toLocaleDateString();
                itemName += ` (Rental: ${startDate} to ${endDate})`;
            }

            return {
                price_data: {
                    currency: 'usd',
                    product_data: { name: itemName },
                    unit_amount: Math.round(item.priceAtTimeOfTransaction * 100),
                },
                quantity: item.quantity,
            };
        }),
    });

    return session;
}

module.exports = {createCheckoutSession};