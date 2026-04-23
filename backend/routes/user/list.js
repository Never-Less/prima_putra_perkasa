const express = require("express");

const { User, ALLOWED_ROLES } = require("../../models/User");
const { sanitizeUser } = require("./sanitize-user");
const {
  buildPaginationMeta,
  buildSearchRegex,
  parsePositiveInt,
} = require("../../utils/list-pagination");
const { normalizeRole } = require("./validators");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
    const usernameRegex = buildSearchRegex(req.query.username);
    const role = normalizeRole(req.query.role);
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const requestedPage = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, 10);

    if (usernameRegex) {
      query.username = usernameRegex;
    }

    if (role && ALLOWED_ROLES.includes(role)) {
      query.role = role;
    }

    const totalRows = await User.countDocuments(query);
    const pagination = buildPaginationMeta(
      totalRows,
      hasPagination ? requestedPage : 1,
      hasPagination ? requestedLimit : Math.max(totalRows, 1)
    );

    let userQuery = User.find(query).sort({ createdAt: -1 });

    if (hasPagination) {
      userQuery = userQuery
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
    }

    const users = await userQuery;

    return res.json({
      users: users.map(sanitizeUser),
      pagination,
      summary: {
        totalRows,
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get users" });
  }
});

module.exports = router;
