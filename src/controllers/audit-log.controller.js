import { ApiResponse } from "../utils/apiResponse.js";
import { parsePaginationQuery } from "../utils/list-query.js";
import { listAuditEvents } from "../services/audit-log.service.js";

export async function listMyAuditLogs(req, res, next) {
  try {
    const pagination = parsePaginationQuery(req.query);

    const logs = await listAuditEvents(
      req.user,
      {
        entityType: req.query.entityType,
        action: req.query.action,
        branchId: req.query.branchId,
        entityId: req.query.entityId,
      },
      {
        ...pagination,
        sortBy: req.query.sortBy,
        sortDirection: req.query.sortDirection,
      },
    );

    return res.status(200).json(new ApiResponse(200, "Audit logs fetched", logs));
  } catch (error) {
    return next(error);
  }
}
