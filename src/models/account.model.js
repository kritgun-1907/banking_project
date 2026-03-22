const { time, timeStamp } = require('console');
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        required: [true, "Account must be associated with a user"],
        index:true
    },
    status:{
        type:String,
        enum:{
            values:["ACTIVE", 'FROZEN', 'CLOSED'],
            message:"Status must be either ACTIVE, FROZEN, or CLOSED",
        },
        default:"ACTIVE",
        required: [true, "Account status is required"]
    },
    currency:{
        type:String,
        required: [true, "Currency is required for creating an account"],
        trim:true,
        uppercase:true,
        default:"INR"
    }
}, {
    timestamps:true
}
);


accountSchema.index({user:1,status:1}); // This line creates a compound index on the user and status fields of the accountSchema. The index is defined with {user: 1, status: 1}, which means that it will be sorted in ascending order based on the user field and then by the status field. This index can improve query performance when filtering accounts by both user and status, as it allows MongoDB to efficiently locate the relevant documents based on these fields.

//Aggregation Pipeline to calculate the current balance of the account by summing up all
// CREDIT and DEBIT entries in the ledger for that account.
//
// HOW AN AGGREGATION PIPELINE WORKS:
// An aggregation pipeline is a series of stages that MongoDB processes in sequence.
// Think of it like an assembly line — data flows through each stage and is transformed.
// Each stage receives the output of the previous stage as its input.
//
// STAGE 1 — $match:
//   Filters the ledger collection to only include documents where `account` equals
//   this account's _id. This is like a WHERE clause in SQL. We do this FIRST so
//   MongoDB doesn't process every ledger entry in the database — only the ones
//   that belong to this account. Always $match early to improve performance.
//
// STAGE 2 — $group:
//   Groups all matching ledger entries into a single summary document.
//   `_id: "$account"` means we group by the account field (there's only one account
//   here since we already $matched it, but $group always requires an _id).
//
//   For each entry, we use $cond (conditional) to selectively add the amount:
//   - totalCredit: only adds `amount` when the entry type is "CREDIT", otherwise adds 0.
//   - totalDebit:  only adds `amount` when the entry type is "DEBIT",  otherwise adds 0.
//   $sum then accumulates all those values across every matching ledger entry.
//
// STAGE 3 — $project:
//   Reshapes the output document. We hide the _id field (`_id: 0`) and compute the
//   final `balance` by subtracting totalDebit from totalCredit.
//   balance = totalCredit - totalDebit  (double-entry bookkeeping formula)
//
// ⚠️ GOTCHA: $project must be a SEPARATE stage in the pipeline array.
//    Placing `project: {...}` as a key inside the $group stage object does nothing —
//    it's silently ignored by MongoDB. It must be its own `{ $project: {...} }` stage.
accountSchema.methods.getCurrentBalance = async function() {

    const balanceData = await ledgerModel.aggregate([
        {
            // Stage 1: Filter ledger entries for only this account
            $match: { account: this._id }
        },
        {
            // Stage 2: Group all entries and separately sum credits and debits
            $group: {
                _id: "$account",
                totalCredit: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0]
                    }
                },
                totalDebit: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0]
                    }
                }
            }
        },
        {
            // Stage 3: Project only the final balance (totalCredit - totalDebit)
            $project: {
                _id: 0,
                balance: { $subtract: ["$totalCredit", "$totalDebit"] }
            }
        }
    ]);

    // If no ledger entries exist for this account yet, the aggregate returns an empty
    // array. In that case the balance is 0 (the account has never had any transactions).
    return balanceData.length > 0 ? balanceData[0].balance : 0;
};  

const accountModel = mongoose.model('account', accountSchema);

module.exports = accountModel;