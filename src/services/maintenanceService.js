const { prisma, MaintenanceRequestStatus } = require('../config/prisma');

async function createMaintenanceRequest(customerId, requestData) {
    const { productId, issueDescription, preferredServiceDate } = requestData;
    const product = await prisma.Product.findUnique({
        where: { id: Number(productId) },
    });

    if (!product) {
        throw new Error('Product not found.');
    }

    const newRequest = await prisma.MaintenanceRequest.create({
        data: {

            customer: {
                connect: { id: customerId }
            },
            product: {
                connect: { id: Number(productId) }
            },

            issueDescription: issueDescription,
            preferredServiceDate: preferredServiceDate ? new Date(preferredServiceDate) : null,
        },

        include: {
            customer: { select: { id: true, username: true } },
            product: { select: { id: true, nameEn: true } },
        }
    });
    return newRequest;
}

async function getAllMaintenanceRequests(filters = {}) {
    const { status, technicianId } = filters;

    const whereClause = {};

    if (status) {
        if (!Object.values(MaintenanceRequestStatus).includes(status)) {
            throw new Error(`Invalid status filter. Must be one of: ${Object.values(MaintenanceRequestStatus).join(', ')}`);
        }
        whereClause.status = status;
    }

    if (technicianId) {
        whereClause.technicianId = Number(technicianId);
    }

    return prisma.MaintenanceRequest.findMany({
        where: whereClause,
        orderBy: {
            createdAt: 'desc', // Show the newest requests first
        },
        // Include related data needed for an admin dashboard view.
        include: {
            customer: {
                select: { id: true, username: true, email: true }
            },
            technician: {
                select: { id: true, username: true }
            },
            product: {
                select: { id: true, nameEn: true }
            }
        },
    });
}

async function assignMaintenanceRequest(requestId, assignmentData) {
    const numericRequestId = Number(requestId);
    const { technicianId, serviceDate, estimatedCost } = assignmentData;

    return prisma.$transaction(async (tx) => {
        const request = await tx.MaintenanceRequest.findUnique({
            where: { id: numericRequestId },
        });

        if (!request) {
            throw new Error('Maintenance request not found.');
        }
        if (request.status !== 'PENDING') {
            throw new Error(`Request cannot be assigned. Current status is ${request.status}, but must be PENDING.`);
        }

        const technician = await tx.Users.findUnique({
            where: { id: Number(technicianId) },
        });

        if (!technician) {
            throw new Error(`Technician with ID ${technicianId} not found.`);
        }
        if (technician.role !== 'MAINTENANCE') {
            throw new Error(`User ${technician.username} is not a maintenance technician.`);
        }

        return tx.MaintenanceRequest.update({
            where: { id: numericRequestId },
            data: {
                status: 'APPROVED',
                technicianId: Number(technicianId),
                serviceDate: new Date(serviceDate),
                estimatedCost: estimatedCost,
            },
            // Include related data in the response for confirmation.
            include: {
                customer: { select: { id: true, username: true, email: true } },
                technician: { select: { id: true, username: true, email: true } },
                product: { select: { id: true, nameEn: true } },
            }
        });
    });
}

async function completeMaintenanceRequest(requestId, completionData, requester) {
    const numericRequestId = Number(requestId);
    const { finalCost, technicianNotes } = completionData;

    return prisma.$transaction(async (tx) => {
        const request = await tx.MaintenanceRequest.findUnique({
            where: { id: numericRequestId },
        });

        if (!request) {
            throw new Error('Maintenance request not found.');
        }

        const isAssignedTechnician = request.technicianId === requester.id;
        const isAdmin = requester.role === 'ADMIN';

        if (!isAssignedTechnician && !isAdmin) {
            throw new Error('Forbidden: You are not authorized to complete this request.');
        }

        const validPreviousStatuses = ['APPROVED', 'IN_PROGRESS'];
        if (!validPreviousStatuses.includes(request.status)) {
            throw new Error(`Request cannot be completed. Current status is ${request.status}.`);
        }

        return tx.MaintenanceRequest.update({
            where: { id: numericRequestId },
            data: {
                status: 'COMPLETED',
                finalCost: finalCost,
                technicianNotes: request.technicianNotes
                    ? `${request.technicianNotes}\nCompletion Note: ${technicianNotes}`
                    : `Completion Note: ${technicianNotes}`,
            },
            include: {
                customer: { select: { id: true, username: true, email: true } },
                technician: { select: { id: true, username: true } },
            }
        });
    });
}

async function getMaintenanceRequestById(requestId, requester) {
    const numericRequestId = Number(requestId);

    const request = await prisma.MaintenanceRequest.findUnique({
        where: { id: numericRequestId },
        include: {
            customer: { select: { id: true, username: true, email: true, number: true } },
            technician: { select: { id: true, username: true, jobTitle: true } },
            product: { select: { id: true, nameEn: true, nameAr: true, images: true } },
        },
    });

    if (!request) {
        throw new Error('Maintenance request not found.');
    }

    const isCustomer = request.customerId === requester.id;
    const isAssignedTechnician = request.technicianId === requester.id;
    const isAdmin = requester.role === 'ADMIN';

    if (!isCustomer && !isAssignedTechnician && !isAdmin) {
        throw new Error('Forbidden: You do not have permission to view this request.');
    }

    return request;
}

module.exports = {
    createMaintenanceRequest,
    getAllMaintenanceRequests,
    assignMaintenanceRequest,
    completeMaintenanceRequest,
    getMaintenanceRequestById,
}