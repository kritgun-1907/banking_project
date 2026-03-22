const mongoose = require("mongoose");

const blacklistSchema = new mongoose.Schema({
    token:{
        type:String,
        required: [true, "Token is required for blacklisting"],
        unique:[true, "This token is already blacklisted"],
        index:true
    }, 
    blacklistedAt:{
        type:Date,
        default:Date.now,
        required: [true, "Blacklisting timestamp is required"],
        immutable:true
    }
}, {
    timestamps:true
}
);

blacklistSchema.index({blacklistedAt:1},
    { expiresAfterSeconds: 60 * 60 * 24 * 3 }
); // This line creates an index on the blacklistedAt field of the blacklistSchema. The index is defined with {blacklistedAt: 1}, which means that it will be sorted in ascending order based on the blacklistedAt field. This index can improve query performance when filtering blacklisted tokens by their timestamp, as it allows MongoDB to efficiently locate the relevant documents based on the blacklistedAt value.

const tokenBlacklistModel = mongoose.model('blacklist', blacklistSchema);

module.exports = {
    tokenBlacklistModel
}