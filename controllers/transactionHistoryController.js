const pool = require("../config/db");

const getTransactionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive; limit must be between 1 and 100",
      });
    }

    if (type !== undefined && !["credit", "debit"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be credit or debit",
      });
    }

    const [accounts] = await pool.execute(
      "SELECT id FROM accounts WHERE id = ?",
      [id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const conditions = ["account_id = ?"];
    const params = [id];

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM transactions
       WHERE ${whereClause}`,
      params
    );

    const totalRecords = Number(countRows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);
    const offset = (page - 1) * limit;

    const [transactions] = await pool.execute(
      `SELECT id, account_id, type, amount, description,
              reference_id, created_at
       FROM transactions
       WHERE ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Transaction history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction history",
    });
  }
};

module.exports = { getTransactionHistory };