const { OrderStatus } = require('../config/prisma');
// console.log('Imported OrderStatus:', OrderStatus);
const { createOrderFromCart, confirmOrderPayment, updateOrderStatus, getAllOrders, getOrdersByUserId } = require('../services/orderService');

async function createOrder(req, res) {
    const userId = req.user.id;
    const { shippingAddress, rentalDetails } = req.body;
    if (!shippingAddress)
        return res.status(400).json({ error: 'Shipping address is required.' });
    try {
        const newOrder = await createOrderFromCart(userId, { shippingAddress, rentalDetails });
        res.status(201).json({ message: 'Order created successfully. Please proceed to payment.', order: newOrder });
    } catch (err) {
        if (err.message.includes('stock') || err.message.includes('cart is empty') || err.message.includes('Rental dates'))
            return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Failed to create order.' });
    }
}

async function confirmPayment(req, res) {
    const { orderId } = req.params;
    const { paymentMethod, amountPaid, transactionId } = req.body;
    if (!paymentMethod || amountPaid === undefined) {
        return res.status(400).json({ error: 'paymentMethod and amountPaid are required.' });
    }
    try {
        const paymentDetails = { paymentMethod, amountPaid, transactionId };
        const confirmedOrder = await confirmOrderPayment(orderId, paymentDetails);
        res.status(200).json({ message: 'Payment confirmed successfully. Order is now PAID.', order: confirmedOrder });
    } catch (err) {
        if (err.message.includes('not found') || err.message.includes('not pending') || err.message.includes('does not match')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'An error occurred while confirming the payment.' });
    }
}

async function setOrderStatus(req, res) {
    const { orderId } = req.params;
    const { status } = req.body;
    if (!status || !Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({
            error: 'Invalid status provided.',
            allowedStatuses: Object.values(OrderStatus),
        });
    }
    try {
        const updatedOrder = await updateOrderStatus(orderId, status);
        res.status(200).json({ message: `Order status updated to ${status}`, order: updatedOrder });
    } catch (err) {
        if (err.message.includes('not found') || err.message.includes('Cannot transition')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'An error occurred while updating the order status.' });
    }
}

async function listAllOrders(req, res) {
    try {
        const orders = await getAllOrders();
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ error: 'An error occurred while retrieving orders.' });
    }
}

async function getUserOrders(req, res) {
    const { userId } = req.params;
    const requester = req.user;
    const isOwner = requester.id === Number(userId);
    const isAdmin = requester.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to view these orders.' });
    }
    try {
        const orders = await getOrdersByUserId(userId);
        if (orders.length === 0) {
            return res.status(404).json({ message: 'No orders found for this user.' });
        }
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ error: 'An error occurred while retrieving orders.' });
    }
}

module.exports = {
    createOrder,
    confirmPayment,
    setOrderStatus,
    listAllOrders,
    getUserOrders,
};