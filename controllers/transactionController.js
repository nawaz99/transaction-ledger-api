const pool = require("../config/db");

// Convert decimal money to integer cents to avoid floating-point errors.
const toCents = (value) => {
  const amount = String(value);

  if (!/^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/.test(amount)) {
    return null;
  }

  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
};

const formatCents = (cents) => {
  const whole = cents / 100n;
  const fraction = String(cents % 100n).padStart(2, "0");

  return `${whole}.${fraction}`;
};

const addTransaction = async (req, res) => {
  const accountId = req.params.id;
  const { type, amount, description, reference_id } = req.body;

  // Validate account ID
  if (!/^[1-9]\d*$/.test(accountId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid account ID",
    });
  }

  // Validate transaction type
  if (!["credit", "debit"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Type must be credit or debit",
    });
  }

  // Validate amount
  const amountCents = toCents(amount);

  if (amountCents === null || amountCents <= 0n) {
    return res.status(400).json({
      success: false,
      message: "Amount must be positive with at most 2 decimal places",
    });
  }

  // Validate description
  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 255
  ) {
    return res.status(400).json({
      success: false,
      message: "Description is required and must be at most 255 characters",
    });
  }

  // Validate reference ID
  if (
    typeof reference_id !== "string" ||
    !reference_id.trim() ||
    reference_id.trim().length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "A reference_id of at most 100 characters is required",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock this account so concurrent transactions are serialized.
    const [accounts] = await connection.execute(
      `SELECT id, balance
       FROM accounts
       WHERE id = ?
       FOR UPDATE`,
      [accountId]
    );

    if (accounts.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Check for an existing reference within this account.
    const [existing] = await connection.execute(
      `SELECT id
       FROM transactions
       WHERE account_id = ? AND reference_id = ?`,
      [accountId, reference_id.trim()]
    );

    if (existing.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Transaction already exists",
        transaction_id: existing[0].id,
      });
    }

    const currentBalance = toCents(accounts[0].balance);

    if (currentBalance === null) {
      throw new Error("Invalid account balance stored in database");
    }

    let newBalance;

    if (type === "credit") {
      newBalance = currentBalance + amountCents;
    } else {
      if (currentBalance < amountCents) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
          balance: formatCents(currentBalance),
        });
      }

      newBalance = currentBalance - amountCents;
    }

    // Create the immutable transaction record.
    const [result] = await connection.execute(
      `INSERT INTO transactions
       (account_id, type, amount, description, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        accountId,
        type,
        formatCents(amountCents),
        description.trim(),
        reference_id.trim(),
      ]
    );

    // Update the balance within the same database transaction.
    await connection.execute(
      "UPDATE accounts SET balance = ? WHERE id = ?",
      [formatCents(newBalance), accountId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: {
        id: result.insertId,
        account_id: Number(accountId),
        type,
        amount: formatCents(amountCents),
        description: description.trim(),
        reference_id: reference_id.trim(),
        balance: formatCents(newBalance),
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Transaction error:", error.message);

    // Database uniqueness constraint is the final duplicate safeguard.
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Transaction already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process transaction",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = { addTransaction };