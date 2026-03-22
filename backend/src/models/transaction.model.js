const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({

    fromAccount:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'account',
        required: [true, "Transaction must have a source account"],
        index:true
    },
    toAccount:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'account',
        required: [true, "Transaction must have a destination account"],
        index:true
    },
    status :{
        type:String,
        enum:{
            values:["PENDING", 'COMPLETED', 'FAILED', 'REFUNDED'],
            message:"Status must be either PENDING, COMPLETED, FAILED or REFUNDED",
        },
        default:"PENDING",
        required: [true, "Transaction status is required"]
    },
    amount:{
        type:Number,
        required: [true, "Transaction amount is required"],
        min:[0, "Transaction amount must be at least 0"]
    },
    idempotencyKey:{
        type:String,
        required: [true, "Idempotency key is required for processing transactions"],
        unique:true,
        index:true
    }
}, {
    timestamps:true
}
);

transactionSchema.index({fromAccount:1, toAccount:1, status:1}); // This line creates a compound index on the fromAccount, toAccount, and status fields of the transactionSchema. The index is defined with {fromAccount: 1, toAccount: 1, status: 1}, which means that it will be sorted in ascending order based on the fromAccount field, then by the toAccount field, and finally by the status field. This index can improve query performance when filtering transactions by these fields, as it allows MongoDB to efficiently locate the relevant documents based on the specified criteria.

const transactionModel = mongoose.model('transaction', transactionSchema);

module.exports = transactionModel;  