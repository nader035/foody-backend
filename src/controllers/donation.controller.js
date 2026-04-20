import { ApiError, ApiResponse } from "../utils/apiResponse.js";
import {
  createDonationMatch,
  listDonations,
  updateDonationStatus,
} from "../services/donation.service.js";
import {
  createDonationSchema,
  updateDonationStatusSchema,
} from "../validators/donation.validator.js";
import { parsePaginationQuery } from "../utils/list-query.js";

function zodErrorsToMap(issues) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function createDonation(req, res, next) {
  try {
    const parsed = createDonationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const donation = await createDonationMatch(req.user, parsed.data);
    return res
      .status(201)
      .json(new ApiResponse(201, "Donation created", donation));
  } catch (error) {
    return next(error);
  }
}

export async function listMyDonations(req, res, next) {
  try {
    const pagination = parsePaginationQuery(req.query);
    const donations = await listDonations(req.user, {
      status: req.query.status,
    }, {
      ...pagination,
      sortBy: req.query.sortBy,
      sortDirection: req.query.sortDirection,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, "Donations fetched", donations));
  } catch (error) {
    return next(error);
  }
}

export async function changeDonationStatus(req, res, next) {
  try {
    const parsed = updateDonationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        422,
        "Validation failed",
        zodErrorsToMap(parsed.error.issues),
      );
    }

    const donation = await updateDonationStatus(
      req.user,
      req.params.donationId,
      parsed.data,
    );
    return res
      .status(200)
      .json(new ApiResponse(200, "Donation status updated", donation));
  } catch (error) {
    return next(error);
  }
}
