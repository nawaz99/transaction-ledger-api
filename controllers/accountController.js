const pool = require("../config/db");

const createAccount = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate account holder name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Account holder name is required",
      });
    }

    // Create account with server-controlled initial balance
    const [result] = await pool.execute(
      "INSERT INTO accounts (name, balance) VALUES (?, ?)",
      [name.trim(), "0.00"]
    );

    // Fetch the created account
    const [accounts] = await pool.execute(
      `SELECT id, name, balance, created_at
       FROM accounts
       WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: accounts[0],
    });
  } catch (error) {
    console.error("Create account error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
};


const getAccountBalance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const [accounts] = await pool.execute(
      `SELECT id AS account_id, balance
       FROM accounts
       WHERE id = ?`,
      [id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: accounts[0],
    });
  } catch (error) {
    console.error("Get balance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch account balance",
    });
  }
};

module.exports = { createAccount, getAccountBalance };
