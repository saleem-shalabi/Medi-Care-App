const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');

async function createPaymentSession(req, res) {
    const { orderId } = req.params;
    const userId = req.user.id;

    try {
        const order = await prisma.order.findFirst({
            where: { id: Number(orderId), userId: userId }
        });
        if (!order) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission for this order.' });
        }

        const session = await paymentService.createCheckoutSession(orderId);
        res.status(200).json({ url: session.url });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

async function handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata.orderId;
        const amountPaid = session.amount_total / 100;

        console.log(`Stripe reported successful payment for Order ID: ${orderId}`);

        try {
            const paymentDetails = {
                paymentMethod: 'Stripe',
                amountPaid: amountPaid,
                transactionId: session.payment_intent,
            };

            // This is the critical hand-off to your existing order service.
            await orderService.confirmOrderPayment(orderId, paymentDetails);

            console.log(`Successfully finalized Order ID: ${orderId} in the database.`);
        } catch (err) {
            console.error(`CRITICAL ERROR: Failed to process order ${orderId} after successful Stripe payment.`, err);
            return res.status(500).json({ error: 'Server error while finalizing order.' });
        }
    }

    res.status(200).json({ received: true });
}

module.exports = {
    createPaymentSession,
    handleStripeWebhook,
};