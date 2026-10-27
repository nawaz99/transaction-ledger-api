const express = require("express");
const router = express.Router();

const {
  createAccount,
  getAccountBalance,
} = require("../controllers/accountController");

const { addTransaction } = require("../controllers/transactionController");
const { getTransactionHistory} = require("../controllers/transactionHistoryController");


router.post("/", createAccount);

router.post("/:id/transactions", addTransaction);
router.get("/:id/balance", getAccountBalance);
router.get("/:id/transactions", getTransactionHistory);

module.exports = router;
