const { createMaintenanceRequest, getAllMaintenanceRequests, assignMaintenanceRequest, completeMaintenanceRequest, getMaintenanceRequestById } = require('../services/maintenanceService');

async function createRequest(req, res) {
    const customerId = req.user.id; // Get the user's ID from the requireLogin middleware
    const { productId, issueDescription, preferredServiceDate } = req.body;

    // --- Input Validation ---
    if (!productId || !issueDescription) {
        return res.status(400).json({ error: 'productId and issueDescription are required fields.' });
    }
    // -------------------------

    try {
        const requestData = { productId, issueDescription, preferredServiceDate };
        const newRequest = await createMaintenanceRequest(customerId, requestData);
        res.status(201).json({ message: 'Maintenance request submitted successfully.', request: newRequest });
    } catch (err) {
        // Handle specific errors from the service, like a product not being found.
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'An error occurred while submitting the request.' });
    }
}

async function listAllRequests(req, res) {
    // Extract optional filters from the query string (e.g., ?status=PENDING)
    const { status, technicianId } = req.query;

    try {
        const filters = { status, technicianId };
        const requests = await getAllMaintenanceRequests(filters);
        res.status(200).json(requests);
    } catch (err) {
        if (err.message.includes('Invalid status')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'An error occurred while retrieving requests.' });
    }
}

async function assignTechnician(req, res) {
    const { id } = req.params; // The ID of the maintenance request
    const { technicianId, serviceDate, estimatedCost } = req.body;

    if (!technicianId || !serviceDate || estimatedCost === undefined) {
        return res.status(400).json({ error: 'technicianId, serviceDate, and estimatedCost are required fields.' });
    }

    try {
        const assignmentData = { technicianId, serviceDate, estimatedCost };
        const updatedRequest = await assignMaintenanceRequest(id, assignmentData);

        // Optional Side Effect: Trigger emails after success
        // sendEmail({ to: updatedRequest.customer.email, subject: 'Service Scheduled', ... });
        // sendEmail({ to: updatedRequest.technician.email, subject: 'New Assignment', ... });

        res.status(200).json({ message: 'Request approved and technician assigned successfully.', request: updatedRequest });

    } catch (err) {

        if (err.message.includes('not found') || err.message.includes('not pending') || err.message.includes('not a maintenance technician')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'An error occurred while assigning the request.' });
    }
}

async function completeRequest(req, res) {
    const { id } = req.params;
    const { finalCost, technicianNotes } = req.body;
    const requester = req.user; // The authenticated user making the request

    if (finalCost === undefined) {
        return res.status(400).json({ error: 'finalCost is a required field.' });
    }

    try {
        const completionData = { finalCost, technicianNotes };
        const completedRequest = await completeMaintenanceRequest(id, completionData, requester);

        // Optional Side Effect: Send a "Service Completed" email/invoice to the customer
        // sendEmail({ to: completedRequest.customer.email, ... });

        res.status(200).json({ message: 'Maintenance request completed successfully.', request: completedRequest });

    } catch (err) {
        if (err.message.includes('Forbidden') || err.message.includes('not found') || err.message.includes('cannot be completed')) {
            const statusCode = err.message.includes('Forbidden') ? 403 : 400;
            return res.status(statusCode).json({ error: err.message });
        }
        res.status(500).json({ error: 'An error occurred while completing the request.' });
    }
}

async function getRequestById(req, res) {
    const { id } = req.params;
    const requester = req.user;

    try {
        const request = await getMaintenanceRequestById(id, requester);
        res.status(200).json(request);
    } catch (err) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message.includes('Forbidden')) {
            return res.status(403).json({ error: err.message });
        }
        res.status(500).json({ error: 'An error occurred while retrieving the request.' });
    }
}

module.exports = {
    createRequest,
    listAllRequests,
    assignTechnician,
    completeRequest,
    getRequestById,
}