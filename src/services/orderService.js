const { prisma } = require('../config/prisma');

async function createOrderFromCart(userId, orderPayload) {
    const { shippingAddress, rentalDetails } = orderPayload;
    const cartItems = await prisma.CartItem.findMany({
        where: { userId: userId },
        include: { product: true },
    });
    if (cartItems.length === 0)
        throw new Error('Your cart is empty.');
    const rentalDetailsMap = new Map(
        rentalDetails?.map(detail => [detail.cartItemId, detail]) || []
    );
    let totalAmount = 0;
    for (const item of cartItems) {
        const isSale = item.transactionType === 'SALE';
        const price = isSale ? item.product.sellPrice : item.product.rentPrice;
        const stock = isSale ? item.product.saleStock : item.product.rentStock;
        if (stock < item.quantity)
            throw new Error(`Not enough stock for ${item.product.nameEn}.`);
        totalAmount += price * item.quantity;
    }
    const newOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.Order.create({
            data: {
                userId: userId,
                totalAmount: totalAmount,
                shippingAddress: shippingAddress,
                status: 'PENDING',
            },
        });
        for (const item of cartItems) {
            const isSale = item.transactionType === 'SALE';
            const price = isSale ? item.product.sellPrice : item.product.rentPrice;
            const orderItemData = {
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                transactionType: item.transactionType,
                priceAtTimeOfTransaction: price,
            };
            if (item.transactionType === 'RENT') {
                const details = rentalDetailsMap.get(item.id);
                if (!details || !details.startDate || !details.endDate)
                    throw new Error(`Rental dates are required for ${item.product.nameEn}.`);
                orderItemData.rentalStartDate = new Date(details.startDate);
                orderItemData.rentalEndDate = new Date(details.endDate);
            }
            await tx.OrderItem.create({ data: orderItemData });
        }
        await tx.CartItem.deleteMany({
            where: { userId: userId },
        });
        const fullOrder = await tx.Order.findUnique({
            where: { id: order.id },
            include: { items: { include: { product: true } } },
        });
        return fullOrder;
    });
    return newOrder;
}

async function confirmOrderPayment(orderId, paymentDetails) {
    const numericOrderId = Number(orderId);

    const confirmedOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.Order.findUnique({
            where: { id: numericOrderId },
            include: { items: true },
        });
        if (!order) {
            throw new Error('Order not found.');
        }
        if (order.status !== 'PENDING') {
            throw new Error('This order is not pending and cannot be confirmed.');
        }
        if (order.totalAmount !== paymentDetails.amountPaid) {
            throw new Error('The amount paid does not match the order total.');
        }
        const updatedOrder = await tx.Order.update({
            where: { id: numericOrderId },
            data: { status: 'PAID' },
        });
        await tx.Payment.create({
            data: {
                orderId: numericOrderId,
                amount: paymentDetails.amountPaid,
                paymentMethod: paymentDetails.paymentMethod,
                transactionId: paymentDetails.transactionId,
                status: 'SUCCESS',
            },
        });
        for (const item of order.items) {
            if (item.transactionType === 'SALE') {
                await tx.Product.update({
                    where: { id: item.productId },
                    data: { saleStock: { decrement: item.quantity } },
                });
            } else if (item.transactionType === 'RENT') {
                await tx.Product.update({
                    where: { id: item.productId },
                    data: { rentStock: { decrement: item.quantity } },
                });
            }
        }
        return updatedOrder;
    });
    return confirmedOrder;
}

async function updateOrderStatus(orderId, newStatus) {
    const numericOrderId = Number(orderId);
    const order = await prisma.Order.findUnique({
        where: { id: numericOrderId },
    });
    if (!order)
        throw new Error('Order not found.');
    const allowedTransitions = {
        'PAID': ['SHIPPED', 'CANCELLED'],
        'SHIPPED': ['DELIVERED'],
    };
    const currentStatus = order.status;
    const canTransition = allowedTransitions[currentStatus]?.includes(newStatus);
    if (!canTransition && currentStatus !== 'DELIVERED') {
        if (currentStatus === 'PAID' && newStatus === 'SHIPPED') {

        } else if (currentStatus === 'SHIPPED' && newStatus === 'DELIVERED') {

        } else {
            throw new Error(`Cannot transition order from ${currentStatus} to ${newStatus}.`);
        }
    }
    const updatedOrder = await prisma.Order.update({
        where: { id: numericOrderId },
        data: { status: newStatus },
    });
    return updatedOrder;
}

async function getAllOrders() {
    const orders = await prisma.Order.findMany({
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
            items: {
                include: {
                    product: {
                        select: {
                            nameEn: true,
                            nameAr: true,
                        }
                    }
                }
            },
        },
    });
    return orders;
}

async function getOrdersByUserId(userId) {
    const numericUserId = Number(userId);

    const orders = await prisma.Order.findMany({
        where: {
            userId: numericUserId,
        },
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            nameEn: true,
                            nameAr: true,
                            images: true,
                        }
                    }
                }
            },
        },
    });
    return orders;
}

module.exports = {
    createOrderFromCart,
    confirmOrderPayment,
    updateOrderStatus,
    getAllOrders,
    getOrdersByUserId,
};