const { prisma, RentalStatus } = require('../config/prisma');
const sendEmail = require('../utils/sendEmail');
const { generateContractPdf } = require('../utils/pdfGenerate');

async function createOrderFromCart(userId, orderPayload) {
    const { shippingAddress, rentalDetails } = orderPayload;

    return prisma.$transaction(async (tx) => {
        const cartItems = await tx.CartItem.findMany({
            where: { userId: userId },
            include: { product: true },
        });

        if (cartItems.length === 0) {
            throw new Error('Your cart is empty.');
        }

        const rentalDetailsMap = new Map(rentalDetails?.map(detail => [detail.cartItemId, detail]) || []);

        for (const item of cartItems) {
            const stockField = item.transactionType === 'SALE' ? 'saleStock' : 'rentStock';
            const product = await tx.Product.findUnique({ where: { id: item.productId } });

            if (product[stockField] < item.quantity) {
                throw new Error(`Sorry, ${product.nameEn} just went out of stock.`);
            }

            await tx.Product.update({
                where: { id: item.productId },
                data: { [stockField]: { decrement: item.quantity } },
            });
        }

        let totalAmount = 0;
        for (const item of cartItems) {
            if (item.transactionType === 'SALE') {
                totalAmount += item.product.sellPrice * item.quantity;
            } else { // It's a RENT
                const details = rentalDetailsMap.get(item.id);
                if (!details || !details.startDate || !details.endDate) {
                    throw new Error(`Rental dates are required for ${item.product.nameEn}.`);
                }

                const startDate = new Date(details.startDate);
                const endDate = new Date(details.endDate);

                // Calculate duration in days, rounding up.
                const rentalDurationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

                if (rentalDurationDays <= 0) {
                    throw new Error(`End date must be after start date for ${item.product.nameEn}.`);
                }

                const dailyRate = item.product.rentPrice;
                const rentalCost = dailyRate * rentalDurationDays * item.quantity;
                totalAmount += rentalCost;
            }
        }

        const order = await tx.Order.create({
            data: {
                userId,
                totalAmount,
                shippingAddress,
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
                orderItemData.rentalStartDate = new Date(details.startDate);
                orderItemData.rentalEndDate = new Date(details.endDate);
            }
            await tx.OrderItem.create({ data: orderItemData });
        }

        await tx.CartItem.deleteMany({ where: { userId: userId } });

        return tx.Order.findUnique({
            where: { id: order.id },
            include: { items: true },
        });
    });
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

    return prisma.$transaction(async (tx) => {
        const order = await tx.Order.findUnique({
            where: { id: numericOrderId },
            include: {
                items: {
                    select: { id: true, transactionType: true, productId: true, quantity: true },
                },
            },
        });

        if (!order) {
            throw new Error('Order not found.');
        }

        // Step 2: Validate the status transition.
        const allowedTransitions = {
            'PENDING': ['CANCELLED', 'PAID'],
            'PAID': ['SHIPPED'],
            'SHIPPED': ['DELIVERED'],
        };
        const currentStatus = order.status;

        if (!allowedTransitions[currentStatus]) {
            throw new Error(`Order is in a final state (${currentStatus}) and cannot be changed.`);
        }
        if (!allowedTransitions[currentStatus].includes(newStatus)) {
            throw new Error(`Cannot transition order from ${currentStatus} to ${newStatus}.`);
        }

        const updatedOrder = await tx.Order.update({
            where: { id: numericOrderId },
            data: { status: newStatus },
        });

        const rentalOrderItemIds = order.items
            .filter(item => item.transactionType === 'RENT')
            .map(item => item.id);

        if (newStatus === 'CANCELLED') {
            if (rentalOrderItemIds.length > 0) {
                await tx.RentalContract.updateMany({
                    where: { orderItemId: { in: rentalOrderItemIds } },
                    data: { status: 'CANCELLED' },
                });
            }
            for (const item of order.items) {
                const stockField = item.transactionType === 'SALE' ? 'saleStock' : 'rentStock';
                await tx.Product.update({
                    where: { id: item.productId },
                    data: { [stockField]: { increment: item.quantity } },
                });
            }

        } else if (newStatus === 'DELIVERED') {
            if (rentalOrderItemIds.length > 0) {
                await tx.RentalContract.updateMany({
                    where: {
                        orderItemId: { in: rentalOrderItemIds },
                        status: 'UPCOMING',
                    },
                    data: { status: 'ACTIVE' },
                });
            }
        }
        return updatedOrder;
    });
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
    const originalContract = await prisma.RentalContract.findUnique({
        where: { id: numericContractId },
        include: { product: true },
    });
    if (!originalContract) throw new Error('Rental contract not found.');
    if (originalContract.userId !== userId) throw new Error('Forbidden: You do not own this contract.');
    if (originalContract.status !== 'ACTIVE') throw new Error('Only active rentals can be extended.');
    if (newEndDate <= originalContract.endDate) throw new Error('New end date must be after the current end date.');
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

async function getContractsByUserId(userId, status) {
    // Build the 'where' clause for the Prisma query.
    const whereClause = {
        userId: userId,
    };
    if (status) {
        if (!Object.values(RentalStatus).includes(status)) {
            throw new Error(`Invalid status filter. Must be one of: ${Object.values(RentalStatus).join(', ')}`);
        }
        whereClause.status = status;
    }
    return prisma.RentalContract.findMany({
        where: whereClause,
        orderBy: {
            startDate: 'desc', // Show the most recent rentals first
        },
        // Include related product and order information for display on the frontend.
        include: {
            product: {
                select: {
                    id: true,
                    nameEn: true,
                    nameAr: true,
                    images: true,
                }
            },
            orderItem: {
                include: {
                    order: {
                        select: {
                            id: true
                        }
                    }
                }
            }
        },
    });
}

async function updateContractStatus(contractId, newStatus) {
    const numericContractId = Number(contractId);
    if (!Object.values(RentalStatus).includes(newStatus)) {
        throw new Error(`Invalid status. Must be one of: ${Object.values(RentalStatus).join(', ')}`);
    }
    const updateData = {
        status: newStatus,
    };
    if (newStatus === 'COMPLETED') {
        updateData.actualReturnDate = new Date();
    }
    const contract = await prisma.RentalContract.findUnique({
        where: { id: numericContractId }
    });
    if (!contract) {
        throw new Error('Contract not found.');
    }
    return prisma.RentalContract.update({
        where: { id: numericContractId },
        data: updateData,
    });
}

async function processContractReturn(contractId, returnData) {
    const numericContractId = Number(contractId);
    const { conditionOnReturn, notes } = returnData;

    return prisma.$transaction(async (tx) => {
        const contract = await tx.RentalContract.findUnique({
            where: { id: numericContractId },
            include: {
                orderItem: {
                    select: {
                        quantity: true,
                    },
                },
            },
        });
        if (!contract) {
            throw new Error('Rental contract not found.');
        }
        if (contract.status !== 'ACTIVE' && contract.status !== 'OVERDUE') {
            throw new Error(`Contract is not active or overdue. Current status: ${contract.status}.`);
        }
        if (!contract.orderItem) {
            throw new Error('Data inconsistency: Contract is not linked to an order item.');
        }
        const updatedContract = await tx.RentalContract.update({
            where: { id: numericContractId },
            data: {
                status: 'COMPLETED',
                conditionOnReturn: conditionOnReturn,
                actualReturnDate: new Date(),
                // Append notes if they exist, preserving any previous notes.
                notes: contract.notes ? `${contract.notes}\nReturn Note: ${notes}` : `Return Note: ${notes}`,
            },
        });
        await tx.Product.update({
            where: { id: contract.productId },
            data: {
                rentStock: {
                    increment: contract.orderItem.quantity,
                },
            },
        });
        return updatedContract;
    });
}

module.exports = {
    createOrderFromCart,
    confirmOrderPayment,
    updateOrderStatus,
    getAllOrders,
    getOrdersByUserId,
    createExtensionOrder,
    getContractsByUserId,
    updateContractStatus,
    processContractReturn,
};