const {prisma} = require('../config/prisma');

async function generateEarningsReport({ startDateISO, endDateISO, type }) {
    const startDate = new Date(startDateISO);
    const endDate = new Date(endDateISO);

    // --- Define the queries for each financial metric ---

    // 1. Revenue from Product Sales
    const salesRevenuePromise = prisma.OrderItem.aggregate({
        where: {
            transactionType: 'SALE',
            order: { status: 'PAID', updatedAt: { gte: startDate, lte: endDate } }
        },
        _sum: { priceAtTimeOfTransaction: true }
    });

    // 2. Revenue from Product Rentals
    const rentalRevenuePromise = prisma.OrderItem.aggregate({
        where: {
            transactionType: 'RENT',
            order: { status: 'PAID', updatedAt: { gte: startDate, lte: endDate } }
        },
        _sum: { priceAtTimeOfTransaction: true }
    });

    // 3. Revenue from Maintenance Services
    const maintenanceRevenuePromise = prisma.MaintenanceRequest.aggregate({
        where: {
            status: 'COMPLETED',
            updatedAt: { gte: startDate, lte: endDate },
        },
        _sum: { finalCost: true },
        _count: { id: true },
    });

    // 4. Cost of Goods Sold (COGS) - only for sales
    const cogsPromise = prisma.OrderItem.aggregate({
        where: {
            transactionType: 'SALE',
            order: { status: 'PAID', updatedAt: { gte: startDate, lte: endDate } }
        },
        _sum: { costAtTimeOfTransaction: true },
    });
    
    // 5. Count of Paid Orders
    const paidOrdersCountPromise = prisma.Order.count({
        where: {
            status: 'PAID',
            updatedAt: { gte: startDate, lte: endDate },
        }
    });

    // --- Run all queries in parallel for maximum performance ---
    const [
        salesAggs,
        rentalAggs,
        maintenanceAggs,
        cogsAggs,
        paidOrdersCount
    ] = await Promise.all([
        salesRevenuePromise,
        rentalRevenuePromise,
        maintenanceRevenuePromise,
        cogsPromise,
        paidOrdersCountPromise
    ]);
    
    // --- Assemble the final report, applying the 'type' filter if present ---
    const productSales = !type || type === 'SALE' ? (salesAggs._sum.priceAtTimeOfTransaction || 0) : 0;
    const productRentals = !type || type === 'RENT' ? (rentalAggs._sum.priceAtTimeOfTransaction || 0) : 0;
    const maintenanceServices = !type || type === 'MAINTENANCE' ? (maintenanceAggs._sum.finalCost || 0) : 0;

    const grossRevenue = productSales + productRentals + maintenanceServices;
    const costOfGoodsSold = !type || type === 'SALE' ? (cogsAggs._sum.costAtTimeOfTransaction || 0) : 0;
    
    return {
        reportParameters: { 
            startDate: startDate.toISOString(), 
            endDate: endDate.toISOString(), 
            type: type || 'ALL' 
        },
        summary: {
            grossRevenue: parseFloat(grossRevenue.toFixed(2)),
            costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)),
            grossProfit: parseFloat((grossRevenue - costOfGoodsSold).toFixed(2)),
        },
        revenueBreakdown: {
            productSales: parseFloat(productSales.toFixed(2)),
            productRentals: parseFloat(productRentals.toFixed(2)),
            maintenanceServices: parseFloat(maintenanceServices.toFixed(2)),
        },
        transactionCounts: {
            paidOrders: paidOrdersCount || 0,
            completedMaintenance: maintenanceAggs._count.id || 0,
        },
    };
}

module.exports = { generateEarningsReport };