const { prisma } = require('../config/prisma');
const sendEmail = require('../utils/sendEmail');
const { generateContractPdf } = require('../utils/pdfGenerate');

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

            // Start with the base data for the OrderItem
            const orderItemData = {
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                transactionType: item.transactionType,
                priceAtTimeOfTransaction: price,
            };

            // If the item is a rental, find its dates and add them to the data object
            if (item.transactionType === 'RENT') {
                const details = rentalDetailsMap.get(item.id);
                if (!details || !details.startDate || !details.endDate) {
                    throw new Error(`Rental dates are required for ${item.product.nameEn}.`);
                }
                // Assign the dates to the data object
                orderItemData.rentalStartDate = new Date(details.startDate);
                orderItemData.rentalEndDate = new Date(details.endDate);
            }

            // Create the OrderItem with the complete data
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

    const transactionResult = await prisma.$transaction(async (tx) => {
        const order = await tx.Order.findUnique({
            where: { id: numericOrderId },
            include: { 
                items: { include: { product: true } }, 
                user: true 
            },
        });

        if (!order) throw new Error('Order not found.');
        if (order.status !== 'PENDING') throw new Error('This order is not pending and cannot be confirmed.');
        if (order.totalAmount !== paymentDetails.amountPaid) throw new Error('The amount paid does not match the order total.');

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

        // We now have only one array to manage for both original rentals and extensions
        const contractsToProcess = [];

        for (const item of order.items) {
            const stockField = item.transactionType === 'SALE' ? 'saleStock' : 'rentStock';
            await tx.Product.update({
                where: { id: item.productId },
                data: { [stockField]: { decrement: item.quantity } },
            });

            if (item.extendedContractId && item.newEndDateForExtension) {
                // This is an EXTENSION. Update the existing contract.
                const updatedContract = await tx.RentalContract.update({
                    where: { id: item.extendedContractId },
                    data: { endDate: item.newEndDateForExtension },
                    include: { product: true } // Also include product for PDF generation
                });
                contractsToProcess.push(updatedContract);

            } else if (item.transactionType === 'RENT') {
                // This is a NEW rental. Create a new contract.
                const newContract = await tx.RentalContract.create({
                    data: {
                        orderItem: { connect: { id: item.id } },
                        user: { connect: { id: order.userId } },
                        product: { connect: { id: item.productId } },
                        startDate: item.rentalStartDate,
                        endDate: item.rentalEndDate,
                        status: 'UPCOMING',
                        agreedToTermsAt: new Date(),
                    },
                    include: { product: true }
                });
                contractsToProcess.push(newContract);
            }
        }
        
        return { order: updatedOrder, user: order.user, contracts: contractsToProcess };
    });

    // === Post-Transaction Processing (PDFs, Emails) ===
    // This runs after the atomic transaction succeeds, generating PDFs and sending emails
    if (transactionResult.contracts.length > 0) {
        for (const contract of transactionResult.contracts) {
            try {
                // Generate the PDF for this contract
                const contractData = { user: transactionResult.user, product: contract.product, contract };
                const pdfInfo = await generateContractPdf(contractData);

                // Update the RentalContract with the new PDF's URL.
                const updatedContract = await prisma.RentalContract.update({
                    where: { id: contract.id },
                    data: { contractDocumentUrl: pdfInfo.fileUrl },
                });

                // Determine the email subject based on contract type (new or extension)
                const isExtension = !!contract.orderItemId; //Check for item.orderItemId
                const emailSubject = isExtension ? `Rental Extension Confirmed: #${contract.contractNumber}` : `Your Rental Contract: #${contract.contractNumber}`;
                const emailText = isExtension ? `Your rental extension has been confirmed. Please find your updated contract attached.\n\nThank you!` : `Please find your rental contract attached.\n\nThank you!`;
                const emailHtml = isExtension ? `<p>Your rental extension has been confirmed.</p><p>Please find your updated contract attached.</p><p>Thank you!</p>` : `<p>Please find your rental contract attached.</p><p>Thank you!</p>`;

                // Send the email. Attach the PDF contract.
                await sendEmail({
                    to: transactionResult.user.email,
                    subject: emailSubject,
                    text: `Hello ${transactionResult.user.username},\n\n${emailText}`,
                    html: `<p>Hello ${transactionResult.user.username},</p>\n\n${emailHtml}`,
                    attachments: [{
                        filename: pdfInfo.fileName,
                        path: pdfInfo.filePath,
                        contentType: 'application/pdf',
                    }],
                });
                console.log(`Successfully processed and emailed contract ${contract.id} (Extension=${isExtension})`);
            } catch (err) {
                console.error(`CRITICAL: Post-transaction failure for contract ID ${contract.id}. Please handle manually. Error:`, err);
            }
        }
    }

    return transactionResult.order;
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
        'PENDING': ['CANCELLED'],
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

async function createExtensionOrder(userId, contractId, newEndDateString) {
    const numericContractId = Number(contractId);
    const newEndDate = new Date(newEndDateString);

    // 1. Find the original contract and validate it
    const originalContract = await prisma.RentalContract.findUnique({
        where: { id: numericContractId },
        include: { product: true },
    });
    if (!originalContract) throw new Error('Rental contract not found.');
    if (originalContract.userId !== userId) throw new Error('Forbidden: You do not own this contract.');
    if (originalContract.status !== 'ACTIVE') throw new Error('Only active rentals can be extended.');
    if (newEndDate <= originalContract.endDate) throw new Error('New end date must be after the current end date.');

    // 2. === CRUCIAL: Check for Availability ===
    // Count how many other contracts for this product overlap with the extension period.
    const extensionStartDate = originalContract.endDate;
    const conflictingRentals = await prisma.RentalContract.count({
        where: {
            productId: originalContract.productId,
            id: { not: numericContractId }, // Exclude the current contract
            startDate: { lt: newEndDate },
            endDate: { gt: extensionStartDate },
        }
    });

    // If the number of conflicting rentals is equal to or greater than the total stock, it's unavailable.
    if (conflictingRentals >= originalContract.product.rentStock) {
        throw new Error('Sorry, the product is not available for the selected extension period.');
    }

    // 3. Calculate the cost of the extension
    //const dailyRate = originalContract.product.rentPrice / 7; // Assuming rentPrice is weekly. Adjust as needed.
    //const extensionDays = (newEndDate.getTime() - extensionStartDate.getTime()) / (1000 * 3600 * 24);
    //const extensionCost = Math.ceil(extensionDays) * dailyRate;
    const extensionCost = originalContract.product.rentPrice; //neeeeeeeeeeeeeed change
    // 4. Create the new Order and OrderItem in a transaction
    return prisma.$transaction(async (tx) => {
        const extensionOrder = await tx.Order.create({
            data: {
                userId: userId,
                status: 'PENDING',
                totalAmount: extensionCost,
                // Shipping address is not needed for an extension
            },
        });

        await tx.OrderItem.create({
            data: {
                orderId: extensionOrder.id,
                productId: originalContract.productId,
                quantity: 1,
                transactionType: 'RENT', // Still a RENT type
                priceAtTimeOfTransaction: extensionCost,
                extendedContractId: numericContractId, // Link back to the original contract
                newEndDateForExtension: newEndDate, // Store the exact new date
            },
        });

        return extensionOrder;
    });
}

module.exports = {
    createOrderFromCart,
    confirmOrderPayment,
    updateOrderStatus,
    getAllOrders,
    getOrdersByUserId,
    createExtensionOrder,
};