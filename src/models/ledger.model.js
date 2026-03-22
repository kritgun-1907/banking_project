const { access } = require('fs');
const mongoose=require('mongoose'); 
const accountModel = require('./account.model');
const { error } = require('console');

const ledgerSchema = new mongoose.Schema({
    account:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'account',
        required: [true, "Ledger entry must be associated with an account"],
        index:true,
        immutable:true
    },
    amount:{
        type:Number,
        required: [true, "Ledger entry must have an amount"],
        immutable:true
    },
    transaction:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'transaction',
        required: [true, "Ledger entry must be associated with a transaction"],
        index:true,
        immutable:true
    },
    type:{
        type:String,
        enum:{
            values:["DEBIT", 'CREDIT'],
            message:"Ledger entry type must be either DEBIT or CREDIT",
        },
        required: [true, "Ledger entry type is required"],
        immutable:true
    }
}, {
    timestamps:true
}
);

function preventLedgerEntryModification(){
    throw new Error("Ledger entries cannot be modified after they have been created.");
 } // This function is a pre-update middleware for the ledgerSchema. It is designed to prevent any modifications to existing ledger entries. The function checks if the update operation is trying to modify any of the fields in the ledger entry (account, amount, transaction, or type) and if so, it throws an error indicating that ledger entries cannot be modified after they have been created. This ensures the integrity of the ledger data by preventing changes to historical entries.

ledgerSchema.pre('findOneAndUpdate', preventLedgerEntryModification);
ledgerSchema.pre('update', preventLedgerEntryModification);
ledgerSchema.pre('updateOne', preventLedgerEntryModification);
ledgerSchema.pre('updateMany', preventLedgerEntryModification);
ledgerSchema.pre('deleteOne', preventLedgerEntryModification);
ledgerSchema.pre('deleteMany', preventLedgerEntryModification);
ledgerSchema.pre('findOneAndDelete', preventLedgerEntryModification);
ledgerSchema.pre('findOneAndRemove', preventLedgerEntryModification);
ledgerSchema.pre('remove', preventLedgerEntryModification);
ledgerSchema.pre('findOneAndReplace', preventLedgerEntryModification);

ledgerSchema.index({account:1, transaction:1}); // This line creates a compound index on the account and transaction fields of the ledgerSchema. The index is defined with {account: 1, transaction: 1}, which means that it will be sorted in ascending order based on the account field and then by the transaction field. This index can improve query performance when filtering ledger entries by both account and transaction, as it allows MongoDB to efficiently locate the relevant documents based on these fields.

const ledgerModel = mongoose.model('ledger', ledgerSchema);

module.exports = ledgerModel;